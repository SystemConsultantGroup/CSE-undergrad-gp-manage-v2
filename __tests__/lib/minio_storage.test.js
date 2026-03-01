describe('lib/minio_storage', () => {
  let makeObjectKey;

  beforeAll(() => {
    jest.resetModules();
    // Mock config to avoid real env dependency
    jest.mock('../../config', () => ({
      cssys: { upload_path: 'uploads/cssys' },
      minio: {
        endPoint: '',
        accessKey: '',
        secretKey: '',
        bucket: '',
      },
    }));
    // Mock minio client to prevent connection
    jest.mock('minio', () => ({
      Client: jest.fn().mockImplementation(() => ({
        regionMap: {},
      })),
    }));
    const storage = require('../../lib/minio_storage');
    makeObjectKey = storage.makeObjectKey;
  });

  test('makeObjectKey creates path with upload root', () => {
    const key = makeObjectKey(['board', 'files'], 'test.pdf');
    expect(key).toMatch(/^uploads\/cssys\/board\/files\/\d+-test\.pdf$/);
  });

  test('makeObjectKey handles empty parts', () => {
    const key = makeObjectKey([], 'file.txt');
    expect(key).toMatch(/^uploads\/cssys\/\d+-file\.txt$/);
  });

  test('makeObjectKey filters null/undefined parts', () => {
    const key = makeObjectKey([null, 'docs', undefined, 'sub'], 'report.docx');
    expect(key).toMatch(/^uploads\/cssys\/docs\/sub\/\d+-report\.docx$/);
  });

  test('makeObjectKey handles no originalName', () => {
    const key = makeObjectKey(['test'], null);
    expect(key).toMatch(/^uploads\/cssys\/test\/\d+-file$/);
  });

  test('makeObjectKey strips leading/trailing slashes from parts', () => {
    const key = makeObjectKey(['/leading/', '/trailing/'], 'test.txt');
    expect(key).toMatch(/^uploads\/cssys\/leading\/trailing\/\d+-test\.txt$/);
  });

  test('makeObjectKey uses timestamp prefix for uniqueness', () => {
    const before = Date.now();
    const key = makeObjectKey(['dir'], 'test.txt');
    const after = Date.now();
    const match = key.match(/\/(\d+)-test\.txt$/);
    expect(match).toBeTruthy();
    const ts = parseInt(match[1], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
