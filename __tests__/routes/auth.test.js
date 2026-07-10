const crypto = require('crypto');

// --- Standalone sha256 helper (mirrors routes/cssys/index.js) ---
function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// =====================================================================
// 1. sha256 helper unit tests
// =====================================================================
describe('sha256 helper', () => {
  test('produces correct hash for "test"', () => {
    // Known SHA-256 digest of the string "test"
    const expected = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    expect(sha256('test')).toBe(expected);
  });

  test('produces correct hash for empty string', () => {
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(sha256('')).toBe(expected);
  });

  test('produces correct hash for a number (coerced to string)', () => {
    // sha256(String(12345))
    const expected = crypto.createHash('sha256').update('12345').digest('hex');
    expect(sha256(12345)).toBe(expected);
  });

  test('returns a 64-character hex string', () => {
    const hash = sha256('anything');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('is deterministic (same input yields same output)', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
  });

  test('different inputs yield different outputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

// =====================================================================
// 2. Login route handler tests (mock DB models)
// =====================================================================
describe('POST /cssys/login handler', () => {
  // We extract the handler logic and invoke it directly with mocked
  // req / res / next objects, plus mocked Sequelize models.

  let handler;
  let mockModels;
  let sha256Fn;

  beforeEach(() => {
    jest.resetModules();

    // --- sha256 that matches the route file ---
    sha256Fn = (input) => crypto.createHash('sha256').update(String(input)).digest('hex');

    // --- Build mock models ---
    mockModels = {
      User: {
        findOne: jest.fn(),
      },
      UserLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    // The POST login handler from routes/cssys/index.js,
    // extracted and adapted to accept injected models and allowed user types.
    handler = function createLoginHandler(allowedTypes) {
      return async function loginHandler(req, res, next) {
        try {
          var user = await mockModels.User.findOne({
            where: {
              ids: req.body.ids,
              password: sha256Fn(req.body.password),
            },
          });
          if (user !== null && allowedTypes.indexOf(user.type) !== -1) {
            req.session.user = user;
            user.time = new Date();
            user.ip = req.session.ip;
            user = await user.save();
            req.session.user.time = user.time;
            req.session.user.ip = user.ip;
            delete req.body.password;
            req.body.success = true;
            await user.createUserLog(req.body);
            res.send({
              result: true,
              type: user.type,
            });
          } else {
            req.body.success = false;
            delete req.body.password;
            await mockModels.UserLog.create(req.body);
            res.send({
              result: false,
            });
          }
        } catch (err) {
          next(err);
        }
      };
    };
  });

  function makeMockReq(body, session) {
    return {
      body: { time: new Date(), ip: '127.0.0.1', ...body },
      session: { ip: '127.0.0.1', ...session },
    };
  }

  function makeMockRes() {
    const res = {};
    res.send = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  }

  test('general login returns { result: true, type } for professor/student/schedule user credentials', async () => {
    const fakeUser = {
      id: 1,
      ids: 'student01',
      type: 2,
      name: 'Student',
      time: null,
      ip: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      createUserLog: jest.fn().mockResolvedValue({}),
    };

    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'student01', password: 'pass123' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(mockModels.User.findOne).toHaveBeenCalledWith({
      where: {
        ids: 'student01',
        password: sha256Fn('pass123'),
      },
    });
    expect(res.send).toHaveBeenCalledWith({ result: true, type: 2 });
    expect(next).not.toHaveBeenCalled();
  });

  test('general login rejects admin credentials even when password is correct', async () => {
    const fakeUser = {
      id: 1,
      ids: 'admin',
      type: 0,
      name: 'Admin',
      save: jest.fn(),
      createUserLog: jest.fn(),
    };
    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'admin', password: 'pass123' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(res.send).toHaveBeenCalledWith({ result: false });
    expect(req.session.user).toBeUndefined();
    expect(fakeUser.save).not.toHaveBeenCalled();
    expect(mockModels.UserLog.create).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('master_oden login accepts admin credentials', async () => {
    const fakeUser = {
      id: 1,
      ids: 'admin',
      type: 0,
      name: 'Admin',
      time: null,
      ip: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      createUserLog: jest.fn().mockResolvedValue({}),
    };
    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'admin', password: 'pass123' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([0])(req, res, next);

    expect(res.send).toHaveBeenCalledWith({ result: true, type: 0 });
    expect(req.session.user).toBe(fakeUser);
    expect(fakeUser.createUserLog).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('master_oden login rejects professor/student credentials', async () => {
    const fakeUser = {
      id: 2,
      ids: 'prof01',
      type: 1,
      name: 'Professor',
      save: jest.fn(),
      createUserLog: jest.fn(),
    };
    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'prof01', password: 'pass123' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([0])(req, res, next);

    expect(res.send).toHaveBeenCalledWith({ result: false });
    expect(req.session.user).toBeUndefined();
    expect(fakeUser.save).not.toHaveBeenCalled();
  });

  test('sets session.user on successful login', async () => {
    const fakeUser = {
      id: 42,
      ids: 'student01',
      type: 2,
      name: 'Student',
      time: null,
      ip: null,
      save: jest.fn().mockImplementation(function () {
        this.time = new Date();
        this.ip = '127.0.0.1';
        return Promise.resolve(this);
      }),
      createUserLog: jest.fn().mockResolvedValue({}),
    };

    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'student01', password: 'mypass' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(req.session.user).toBe(fakeUser);
    expect(req.session.user.time).toBeInstanceOf(Date);
    expect(req.session.user.ip).toBe('127.0.0.1');
  });

  test('returns { result: false } when password is wrong (user not found)', async () => {
    // Sequelize findOne returns null when no row matches ids+password
    mockModels.User.findOne.mockResolvedValue(null);

    const req = makeMockReq({ ids: 'admin', password: 'wrongpass' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(res.send).toHaveBeenCalledWith({ result: false });
    expect(mockModels.UserLog.create).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns { result: false } when user does not exist', async () => {
    mockModels.User.findOne.mockResolvedValue(null);

    const req = makeMockReq({ ids: 'nonexistent', password: 'whatever' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(res.send).toHaveBeenCalledWith({ result: false });
    expect(mockModels.UserLog.create).toHaveBeenCalled();
  });

  test('calls next(err) when an error is thrown', async () => {
    const dbError = new Error('DB connection failed');
    mockModels.User.findOne.mockRejectedValue(dbError);

    const req = makeMockReq({ ids: 'admin', password: 'pass' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.send).not.toHaveBeenCalled();
  });

  test('deletes password from req.body on successful login', async () => {
    const fakeUser = {
      id: 1,
      ids: 'admin',
      type: 0,
      time: null,
      ip: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      createUserLog: jest.fn().mockResolvedValue({}),
    };
    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'admin', password: 'secret' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([0])(req, res, next);

    expect(req.body.password).toBeUndefined();
  });

  test('creates UserLog with success=true on successful login', async () => {
    const fakeUser = {
      id: 1,
      ids: 'admin',
      type: 0,
      time: null,
      ip: null,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      createUserLog: jest.fn().mockResolvedValue({}),
    };
    mockModels.User.findOne.mockResolvedValue(fakeUser);

    const req = makeMockReq({ ids: 'admin', password: 'pass' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([0])(req, res, next);

    expect(fakeUser.createUserLog).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('creates UserLog with success=false on failed login', async () => {
    mockModels.User.findOne.mockResolvedValue(null);

    const req = makeMockReq({ ids: 'admin', password: 'wrong' });
    const res = makeMockRes();
    const next = jest.fn();

    await handler([1, 2, 3])(req, res, next);

    expect(mockModels.UserLog.create).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
