const path = require('path');
const fs = require('fs');

const containerInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '.container-info.json'), 'utf8'));

// Set env vars BEFORE any app modules are loaded.
// dotenv.config() (called by config/index.js) does NOT overwrite existing vars,
// so these take precedence over .env file values.

// MySQL
process.env.DB_HOST = containerInfo.DB_HOST;
process.env.DB_PORT = containerInfo.DB_PORT;
process.env.DB_DATABASE = containerInfo.DB_DATABASE;
process.env.DB_USERNAME = containerInfo.DB_USERNAME;
process.env.DB_PASSWORD = containerInfo.DB_PASSWORD;
process.env.DB_DIALECT = 'mysql';
process.env.DB_TIMEZONE = '+09:00';
process.env.DB_LOGGING = 'false';
process.env.SESSION_SECRET = 'test-integration-secret';
process.env.CSSYS_UPLOAD_PATH = 'test-uploads';

// MinIO
process.env.MINIO_ENDPOINT = `http://${containerInfo.MINIO_HOST}:${containerInfo.MINIO_PORT}`;
process.env.MINIO_PORT = containerInfo.MINIO_PORT;
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_BUCKET = 'test-bucket';
