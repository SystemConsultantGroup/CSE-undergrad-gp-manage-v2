const fs = require("fs");
const path = require("path");
const Minio = require("minio");
const config = require("../config");

const minioConfig = config.minio || {};
const hasMinioConfig =
  !!minioConfig.endPoint &&
  !!minioConfig.accessKey &&
  !!minioConfig.secretKey &&
  !!minioConfig.bucket;

let client = null;
let ensureBucketPromise = null;

function resolveMinioEndpoint(endpointValue, defaultUseSSL) {
  if (!endpointValue) {
    return null;
  }

  const raw = String(endpointValue).trim();
  if (!raw) {
    return null;
  }

  let useSSL = !!defaultUseSSL;
  const hasProtocol = /^https?:\/\//i.test(raw);
  const normalized = hasProtocol ? raw : `${useSSL ? "https" : "http"}://${raw}`;
  const url = new URL(normalized);

  if (hasProtocol) {
    useSSL = url.protocol === "https:";
  }

  return {
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : 9000,
    useSSL
  };
}

if (hasMinioConfig) {
  const endpoint = resolveMinioEndpoint(minioConfig.endPoint, minioConfig.useSSL);
  client = new Minio.Client({
    endPoint: endpoint.endPoint,
    port: endpoint.port,
    useSSL: endpoint.useSSL,
    accessKey: minioConfig.accessKey,
    secretKey: minioConfig.secretKey
  });
}

function assertConfigured() {
  if (!client) {
    throw new Error("MinIO is not configured. Check MINIO_* environment variables.");
  }
}

function ensureBucket() {
  assertConfigured();
  if (ensureBucketPromise) {
    return ensureBucketPromise;
  }

  ensureBucketPromise = new Promise((resolve, reject) => {
    client.bucketExists(minioConfig.bucket, (existsErr, exists) => {
      if (existsErr) {
        reject(existsErr);
        return;
      }
      if (exists) {
        resolve();
        return;
      }

      client.makeBucket(minioConfig.bucket, "us-east-1", (makeErr) => {
        if (makeErr) {
          reject(makeErr);
          return;
        }
        resolve();
      });
    });
  });

  return ensureBucketPromise;
}

function normalizeName(name) {
  return (name || "file")
    .replace(/[^0-9A-Za-z._-]/g, "_")
    .replace(/_+/g, "_");
}

function formatTimestampMs(date) {
  const d = date || new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const pad3 = (n) => String(n).padStart(3, "0");
  return (
    String(d.getFullYear()) +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds()) +
    pad3(d.getMilliseconds())
  );
}

function makeObjectKey(parts, originalName) {
  const safeParts = (parts || [])
    .filter(Boolean)
    .map((part) => String(part).replace(/\\/g, "/").replace(/\//g, "_"));
  const fileName = `${formatTimestampMs()}-${normalizeName(originalName)}`;
  return safeParts.concat([fileName]).join("/");
}

function uploadTempFile(tempPath, objectKey, contentType) {
  return ensureBucket().then(
    () =>
      new Promise((resolve, reject) => {
        const metaData = contentType ? { "Content-Type": contentType } : {};
        client.fPutObject(minioConfig.bucket, objectKey, tempPath, metaData, (err) => {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {}

          if (err) {
            reject(err);
            return;
          }
          resolve(objectKey);
        });
      })
  );
}

function encodeFileName(name) {
  return encodeURIComponent(name || "download")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function sendObjectToResponse(objectKey, fileName, contentType, res) {
  return ensureBucket().then(
    () =>
      new Promise((resolve, reject) => {
        client.getObject(minioConfig.bucket, objectKey, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          const encodedName = encodeFileName(fileName || path.basename(objectKey));
          res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encodedName);
          if (contentType) {
            res.setHeader("Content-Type", contentType);
          }

          stream.on("error", reject);
          stream.on("end", resolve);
          stream.pipe(res);
        });
      })
  );
}

function removeObject(objectKey) {
  return ensureBucket().then(
    () =>
      new Promise((resolve, reject) => {
        client.removeObject(minioConfig.bucket, objectKey, (err) => {
          if (err && err.code !== "NoSuchKey") {
            reject(err);
            return;
          }
          resolve();
        });
      })
  );
}

function isLegacyLocalPath(value) {
  if (!value) {
    return false;
  }

  if (path.isAbsolute(value) || /^[A-Za-z]:\\/.test(value)) {
    return true;
  }

  if (config.cssys && config.cssys.upload_path) {
    return String(value).indexOf(String(config.cssys.upload_path)) === 0;
  }

  return false;
}

function removeStoredFile(storedPath) {
  if (!storedPath) {
    return Promise.resolve();
  }

  if (isLegacyLocalPath(storedPath)) {
    return new Promise((resolve, reject) => {
      fs.unlink(storedPath, (err) => {
        if (err && err.code !== "ENOENT") {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  return removeObject(storedPath);
}

function sendStoredFileToResponse(storedPath, fileName, contentType, res) {
  if (!storedPath) {
    return Promise.reject(new Error("stored path is empty"));
  }

  if (isLegacyLocalPath(storedPath)) {
    return new Promise((resolve, reject) => {
      const encodedName = encodeFileName(fileName || path.basename(storedPath));
      res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encodedName);
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const readStream = fs.createReadStream(storedPath);
      readStream.on("error", reject);
      readStream.on("end", resolve);
      readStream.pipe(res);
    });
  }

  return sendObjectToResponse(storedPath, fileName, contentType, res);
}

module.exports = {
  makeObjectKey,
  uploadTempFile,
  removeStoredFile,
  sendStoredFileToResponse
};
