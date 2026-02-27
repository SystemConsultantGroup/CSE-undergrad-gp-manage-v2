const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const config = require('../config');

const minioConfig = config.minio || {};
const hasMinioConfig =
  !!minioConfig.endPoint && !!minioConfig.accessKey && !!minioConfig.secretKey && !!minioConfig.bucket;

let client = null;

function resolveMinioEndpoint(endpointValue, explicitPort) {
  if (!endpointValue) {
    return null;
  }

  const raw = String(endpointValue).trim();
  if (!raw) {
    return null;
  }

  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(normalized);

  const port = explicitPort || (url.port ? Number(url.port) : 9000);

  return {
    endPoint: url.hostname,
    port,
    useSSL: url.protocol === 'https:',
  };
}

if (hasMinioConfig) {
  const endpoint = resolveMinioEndpoint(minioConfig.endPoint, minioConfig.port);
  client = new Minio.Client({
    endPoint: endpoint.endPoint,
    port: endpoint.port,
    useSSL: endpoint.useSSL,
    accessKey: minioConfig.accessKey,
    secretKey: minioConfig.secretKey,
  });
  // Some MinIO gateways/proxies fail on GetBucketLocation; pin bucket region to avoid preflight lookup.
  if (minioConfig.bucket) {
    client.regionMap[minioConfig.bucket] = 'us-east-1';
  }
}

function assertConfigured() {
  if (!client) {
    throw new Error('MinIO is not configured. Check MINIO_* environment variables.');
  }
}

function makeObjectKey(parts, originalName) {
  const safeParts = (parts || []).filter(Boolean).map((part) =>
    String(part)
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, ''),
  );
  const uploadRoot = String((config.cssys && config.cssys.upload_path) || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const rawName = path.basename(String(originalName || 'file'));
  const fileName = `${Date.now()}-${rawName}`;
  const keyParts = uploadRoot ? [uploadRoot].concat(safeParts) : safeParts;
  return keyParts.concat([fileName]).join('/');
}

function uploadTempFile(tempPath, objectKey, contentType) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    const metaData = contentType ? { 'Content-Type': contentType } : {};
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
  });
}

function encodeFileName(name) {
  return encodeURIComponent(name || 'download').replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function sendObjectToResponse(objectKey, fileName, contentType, res) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    client.getObject(minioConfig.bucket, objectKey, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }

      const encodedName = encodeFileName(fileName || path.basename(objectKey));
      res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodedName);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      stream.on('error', reject);
      stream.on('end', resolve);
      stream.pipe(res);
    });
  });
}

function removeObject(objectKey) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    client.removeObject(minioConfig.bucket, objectKey, (err) => {
      if (err && err.code !== 'NoSuchKey') {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function isLocalStaticPath() {
  return false;
}

function removeStoredFile(storedPath) {
  if (!storedPath) {
    return Promise.resolve();
  }

  if (isLocalStaticPath(storedPath)) {
    return new Promise((resolve, reject) => {
      fs.unlink(storedPath, (err) => {
        if (err && err.code !== 'ENOENT') {
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
    return Promise.reject(new Error('stored path is empty'));
  }

  if (isLocalStaticPath(storedPath)) {
    return new Promise((resolve, reject) => {
      const encodedName = encodeFileName(fileName || path.basename(storedPath));
      res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodedName);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const readStream = fs.createReadStream(storedPath);
      readStream.on('error', reject);
      readStream.on('end', resolve);
      readStream.pipe(res);
    });
  }

  return sendObjectToResponse(storedPath, fileName, contentType, res);
}

module.exports = {
  makeObjectKey,
  uploadTempFile,
  removeStoredFile,
  sendStoredFileToResponse,
};
