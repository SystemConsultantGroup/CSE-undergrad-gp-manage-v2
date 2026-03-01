const crypto = require('crypto');
const moment = require('moment-timezone');

// =====================================================================
// Middleware / app setup tests
// =====================================================================

// --- sha256 helper (mirrors routes/cssys/index.js) ---
function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// --- formatDate helper (mirrors app.js lines 46-51) ---
function formatDate(date, format, offset) {
  if (!date) return '';
  var m = moment(date);
  if (offset !== undefined) m = m.utcOffset(offset);
  return m.format(format || 'YYYY-MM-DD');
}

describe('sha256 helper (as used in middleware chain)', () => {
  test('hashes "password" correctly', () => {
    const expected = crypto.createHash('sha256').update('password').digest('hex');
    expect(sha256('password')).toBe(expected);
  });

  test('hashes empty string correctly', () => {
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(sha256('')).toBe(expected);
  });

  test('converts number input to string before hashing', () => {
    const hash = sha256(42);
    const expected = crypto.createHash('sha256').update('42').digest('hex');
    expect(hash).toBe(expected);
  });
});

describe('formatDate helper (app.locals.formatDate)', () => {
  test('returns empty string for null date', () => {
    expect(formatDate(null)).toBe('');
  });

  test('returns empty string for undefined date', () => {
    expect(formatDate(undefined)).toBe('');
  });

  test('returns empty string for empty string date', () => {
    expect(formatDate('')).toBe('');
  });

  test('formats date with default format YYYY-MM-DD', () => {
    const result = formatDate(new Date('2024-06-15T12:00:00Z'));
    expect(result).toMatch(/^2024-06-15$/);
  });

  test('formats date with custom format', () => {
    const result = formatDate(new Date('2024-06-15T14:30:00Z'), 'YYYY/MM/DD HH:mm');
    expect(result).toMatch(/^2024\/06\/15/);
  });

  test('formats date with YYYY-MM-DD HH:mm:ss format', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const result = formatDate(date, 'YYYY-MM-DD HH:mm:ss');
    expect(result).toMatch(/^2024-01-01/);
  });

  test('applies UTC offset when specified', () => {
    // Create a date in UTC
    const date = new Date('2024-06-15T00:00:00Z');
    // Apply +9 offset (KST)
    const result = formatDate(date, 'YYYY-MM-DD HH:mm', 9 * 60);
    expect(result).toBe('2024-06-15 09:00');
  });

  test('handles negative UTC offset', () => {
    const date = new Date('2024-06-15T03:00:00Z');
    const result = formatDate(date, 'YYYY-MM-DD HH:mm', -5 * 60);
    expect(result).toBe('2024-06-14 22:00');
  });

  test('does not apply offset when offset is undefined', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const withoutOffset = formatDate(date, 'YYYY-MM-DD HH:mm');
    // Should use local timezone (no explicit offset applied)
    expect(typeof withoutOffset).toBe('string');
    expect(withoutOffset.length).toBeGreaterThan(0);
  });

  test('formats a date string input', () => {
    const result = formatDate('2024-03-20', 'YYYY-MM-DD');
    expect(result).toBe('2024-03-20');
  });

  test('formats a moment-parseable string', () => {
    const result = formatDate('2024-12-25T18:30:00', 'MM/DD/YYYY');
    expect(result).toBe('12/25/2024');
  });
});

describe('404 error middleware logic', () => {
  // From app.js lines 115-119:
  //   app.use(function(req, res, next) {
  //     var err = new Error('Not Found');
  //     err.status = 404;
  //     next(err);
  //   });

  function notFoundMiddleware(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }

  test('creates error with status 404', () => {
    const next = jest.fn();
    notFoundMiddleware({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not Found');
  });
});

describe('Error handler middleware logic', () => {
  // From app.js lines 123-134:
  //   app.use(function(err, req, res, next) {
  //     res.status(err.status || 500);
  //     if (err.status == 404) {
  //       res.send('Page Not Found')
  //     } else {
  //       res.render('error', { ... });
  //     }
  //   });

  function errorHandler(err, req, res, next) {
    res.status(err.status || 500);
    if (err.status == 404) {
      res.send('Page Not Found');
    } else {
      res.render('error', {
        message: err.message,
        error: {},
        title: 'error',
      });
    }
  }

  function makeMockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    return res;
  }

  test('returns 404 status and "Page Not Found" for 404 errors', () => {
    const err = new Error('Not Found');
    err.status = 404;
    const res = makeMockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Page Not Found');
    expect(res.render).not.toHaveBeenCalled();
  });

  test('returns 500 status and renders error template for server errors', () => {
    const err = new Error('Something broke');
    err.status = 500;
    const res = makeMockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('error', {
      message: 'Something broke',
      error: {},
      title: 'error',
    });
    expect(res.send).not.toHaveBeenCalled();
  });

  test('defaults to 500 when err.status is not set', () => {
    const err = new Error('Unknown error');
    const res = makeMockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({ message: 'Unknown error' }));
  });

  test('does not leak error details to user (error object is empty)', () => {
    const err = new Error('Internal detail');
    err.status = 500;
    err.stack = 'detailed stack trace...';
    const res = makeMockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({ error: {} }));
  });
});

describe('Session IP extraction logic', () => {
  // From routes/cssys/index.js line 23:
  //   if (!req.session.ip) req.session.ip = (
  //     req.headers['x-forwarded-for'] ||
  //     req.socket.remoteAddress ||
  //     req.socket.remoteAddress ||
  //     (req.socket ? req.socket.remoteAddress : null)
  //   ).split(",")[0];

  function extractIp(headers, socketRemoteAddress) {
    const raw = headers['x-forwarded-for'] || socketRemoteAddress || null;
    return raw ? raw.split(',')[0] : null;
  }

  test('extracts IP from x-forwarded-for header', () => {
    expect(extractIp({ 'x-forwarded-for': '1.2.3.4' }, '10.0.0.1')).toBe('1.2.3.4');
  });

  test('extracts first IP from multiple x-forwarded-for values', () => {
    expect(extractIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, '10.0.0.1')).toBe('1.2.3.4');
  });

  test('falls back to socket.remoteAddress when no x-forwarded-for', () => {
    expect(extractIp({}, '10.0.0.1')).toBe('10.0.0.1');
  });

  test('returns null when no IP source available', () => {
    expect(extractIp({}, null)).toBeNull();
  });
});

describe('View locals middleware logic', () => {
  // From app.js lines 83-89:
  //   app.use(function(req, res, next) {
  //     res.locals.env = app.get('env');
  //     res.locals.session = function() { return req.session; };
  //     next();
  //   });

  function viewLocalsMiddleware(appEnv, req, res, next) {
    res.locals.env = appEnv;
    res.locals.session = function () {
      return req.session;
    };
    next();
  }

  test('sets env on res.locals', () => {
    const res = { locals: {} };
    const next = jest.fn();
    viewLocalsMiddleware('development', {}, res, next);

    expect(res.locals.env).toBe('development');
    expect(next).toHaveBeenCalled();
  });

  test('sets session getter on res.locals', () => {
    const req = { session: { user: { id: 1 } } };
    const res = { locals: {} };
    const next = jest.fn();
    viewLocalsMiddleware('production', req, res, next);

    expect(typeof res.locals.session).toBe('function');
    expect(res.locals.session()).toBe(req.session);
    expect(res.locals.session().user.id).toBe(1);
  });

  test('session getter reflects current session state', () => {
    const req = { session: {} };
    const res = { locals: {} };
    const next = jest.fn();
    viewLocalsMiddleware('test', req, res, next);

    // Mutate session after middleware runs
    req.session.user = { id: 42 };
    expect(res.locals.session().user.id).toBe(42);
  });
});
