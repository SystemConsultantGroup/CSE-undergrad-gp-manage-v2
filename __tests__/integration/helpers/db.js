/**
 * 모든 테이블 DROP 후 재생성 (FK 제약 안전하게 처리)
 * dropAllTables()는 MySQL에서 SET FOREIGN_KEY_CHECKS = 0 을 내부적으로 처리함
 */
async function resetDatabase(...sequelizeInstances) {
  // 첫 번째 인스턴스로 모든 테이블 DROP (같은 DB이므로 한 번이면 됨)
  await sequelizeInstances[0].getQueryInterface().dropAllTables();

  // 모든 인스턴스의 모델 sync
  for (const sequelize of sequelizeInstances) {
    await sequelize.sync();
  }
}

/**
 * MinIO 테스트 버킷 생성 (이미 존재하면 무시)
 */
async function ensureMinioBucket() {
  const Minio = require('minio');
  const config = require('../../../config');

  if (!config.minio.endPoint || !config.minio.accessKey) {
    return; // MinIO 미설정 시 스킵
  }

  const endpoint = new URL(
    /^https?:\/\//i.test(config.minio.endPoint) ? config.minio.endPoint : `http://${config.minio.endPoint}`,
  );

  const client = new Minio.Client({
    endPoint: endpoint.hostname,
    port: config.minio.port || Number(endpoint.port) || 9000,
    useSSL: endpoint.protocol === 'https:',
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });

  const bucket = config.minio.bucket;
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
  }
}

module.exports = { resetDatabase, ensureMinioBucket };
