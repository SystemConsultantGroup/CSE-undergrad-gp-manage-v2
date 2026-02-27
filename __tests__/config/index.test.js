describe('config/index', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadConfig() {
    return require('../../config/index');
  }

  test('exports default values when no env vars set', () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(config.port).toBe(8091);
    expect(config.db).toBeDefined();
    expect(config.db.dialect).toBe('mysql');
    expect(config.db.timezone).toBe('+09:00');
    expect(config.db.logging).toBe(true);
    expect(config.cssys.permit_student_count).toBe(8);
    expect(config.cssys.permit_student_count_semicon).toBe(7);
  });

  test('overrides port from env', () => {
    process.env.PORT = '3000';
    const config = loadConfig();
    expect(config.port).toBe(3000);
  });

  test('overrides db settings from env', () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_USERNAME = 'testuser';
    process.env.DB_PASSWORD = 'testpass';
    process.env.DB_DATABASE = 'testdb';
    process.env.DB_PORT = '3307';
    const config = loadConfig();
    expect(config.db.host).toBe('localhost');
    expect(config.db.username).toBe('testuser');
    expect(config.db.password).toBe('testpass');
    expect(config.db.database).toBe('testdb');
    expect(config.db.port).toBe('3307');
  });

  test('parses boolean DB_LOGGING correctly', () => {
    process.env.DB_LOGGING = 'false';
    const config = loadConfig();
    expect(config.db.logging).toBe(false);
  });

  test('parses DB_LOGGING=true', () => {
    process.env.DB_LOGGING = 'true';
    const config = loadConfig();
    expect(config.db.logging).toBe(true);
  });

  test('parses numeric DB_CONNECT_TIMEOUT', () => {
    process.env.DB_CONNECT_TIMEOUT = '30000';
    const config = loadConfig();
    expect(config.db.dialectOptions.connectTimeout).toBe(30000);
  });

  test('overrides minio settings from env', () => {
    process.env.MINIO_ENDPOINT = 'minio.example.com';
    process.env.MINIO_PORT = '9000';
    process.env.MINIO_ACCESS_KEY = 'access123';
    process.env.MINIO_SECRET_KEY = 'secret456';
    process.env.MINIO_BUCKET = 'testbucket';
    const config = loadConfig();
    expect(config.minio.endPoint).toBe('minio.example.com');
    expect(config.minio.port).toBe(9000);
    expect(config.minio.accessKey).toBe('access123');
    expect(config.minio.secretKey).toBe('secret456');
    expect(config.minio.bucket).toBe('testbucket');
  });

  test('overrides session secret from env', () => {
    process.env.SESSION_SECRET = 'mysecret';
    const config = loadConfig();
    expect(config.session.secret).toBe('mysecret');
  });

  test('overrides cssys settings from env', () => {
    process.env.CSSYS_UPLOAD_PATH = '/uploads';
    process.env.CSSYS_PERMIT_STUDENT_COUNT = '10';
    process.env.CSSYS_PERMIT_STUDENT_COUNT_SEMICON = '9';
    const config = loadConfig();
    expect(config.cssys.upload_path).toBe('/uploads');
    expect(config.cssys.permit_student_count).toBe(10);
    expect(config.cssys.permit_student_count_semicon).toBe(9);
  });
});
