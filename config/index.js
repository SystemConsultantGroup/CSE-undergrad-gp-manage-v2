const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function parseBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function parseNumber(value) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function applyEnv(baseConfig) {
  const config = JSON.parse(JSON.stringify(baseConfig || {}));
  config.db = config.db || {};
  config.cssys = config.cssys || {};
  config.session = config.session || {};
  config.minio = config.minio || {};

  const pick = (key) => process.env[key];

  const port = parseNumber(pick("PORT"));
  if (port !== undefined) config.port = port;

  const dbHost = pick("DB_HOST");
  if (dbHost !== undefined) config.db.host = dbHost;

  const dbUser = pick("DB_USERNAME");
  if (dbUser !== undefined) config.db.username = dbUser;

  const dbPassword = pick("DB_PASSWORD");
  if (dbPassword !== undefined) config.db.password = dbPassword;

  const dbName = pick("DB_DATABASE");
  if (dbName !== undefined) config.db.database = dbName;

  const dbDialect = pick("DB_DIALECT");
  if (dbDialect !== undefined) config.db.dialect = dbDialect;

  const dbPort = pick("DB_PORT");
  if (dbPort !== undefined) config.db.port = dbPort;

  const dbTimezone = pick("DB_TIMEZONE");
  if (dbTimezone !== undefined) config.db.timezone = dbTimezone;

  const dbLogging = parseBoolean(pick("DB_LOGGING"));
  if (dbLogging !== undefined) config.db.logging = dbLogging;

  const dbConnectTimeout = parseNumber(pick("DB_CONNECT_TIMEOUT"));
  if (dbConnectTimeout !== undefined) {
    config.db.dialectOptions = config.db.dialectOptions || {};
    config.db.dialectOptions.connectTimeout = dbConnectTimeout;
  }

  const cssysUploadPath = pick("CSSYS_UPLOAD_PATH");
  if (cssysUploadPath !== undefined) config.cssys.upload_path = cssysUploadPath;

  const permitStudentCount = parseNumber(pick("CSSYS_PERMIT_STUDENT_COUNT"));
  if (permitStudentCount !== undefined) config.cssys.permit_student_count = permitStudentCount;

  const permitStudentCountSemicon = parseNumber(pick("CSSYS_PERMIT_STUDENT_COUNT_SEMICON"));
  if (permitStudentCountSemicon !== undefined) {
    config.cssys.permit_student_count_semicon = permitStudentCountSemicon;
  }

  const sessionSecret = pick("SESSION_SECRET");
  if (sessionSecret !== undefined) config.session.secret = sessionSecret;

  const minioEndPoint = pick("MINIO_ENDPOINT");
  if (minioEndPoint !== undefined) config.minio.endPoint = minioEndPoint;

  const minioPort = parseNumber(pick("MINIO_PORT"));
  if (minioPort !== undefined) config.minio.port = minioPort;

  const minioAccessKey = pick("MINIO_ACCESS_KEY");
  if (minioAccessKey !== undefined) config.minio.accessKey = minioAccessKey;

  const minioSecretKey = pick("MINIO_SECRET_KEY");
  if (minioSecretKey !== undefined) config.minio.secretKey = minioSecretKey;

  const minioBucket = pick("MINIO_BUCKET");
  if (minioBucket !== undefined) config.minio.bucket = minioBucket;

  return config;
}

const baseConfig = {
  port: 8091,
  db: {
    host: "",
    username: "",
    password: "",
    database: "",
    dialect: "",
    dialectOptions: {
      connectTimeout: 60000
    },
    timezone: "+09:00",
    logging: true,
    port: ""
  },
  session: {
    secret: ""
  },
  cssys: {
    upload_path: "",
    permit_student_count: 8,
    permit_student_count_semicon: 7
  },
  minio: {
    endPoint: "",
    port: 0,
    accessKey: "",
    secretKey: "",
    bucket: ""
  }
};

module.exports = applyEnv(baseConfig);
