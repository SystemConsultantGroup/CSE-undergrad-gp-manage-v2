let tablesCreated = false;

/**
 * DB 초기화 — 첫 호출만 DROP+CREATE, 이후는 TRUNCATE만 수행 (빠름)
 */
async function resetDatabase(...sequelizeInstances) {
  const primary = sequelizeInstances[0];

  if (!tablesCreated) {
    // 첫 호출: 테이블 DROP 후 재생성
    await primary.getQueryInterface().dropAllTables();
    for (const sequelize of sequelizeInstances) {
      await sequelize.sync();
    }
    tablesCreated = true;
  } else {
    // 이후 호출: 데이터만 삭제 (DDL 없이 빠름)
    const tables = await primary.getQueryInterface().showAllTables();
    await primary.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      if (table !== 'sessions') {
        await primary.query(`TRUNCATE TABLE \`${table}\``);
      }
    }
    await primary.query('SET FOREIGN_KEY_CHECKS = 1');
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
