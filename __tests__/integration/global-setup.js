const { MySqlContainer } = require('@testcontainers/mysql');
const { GenericContainer, Wait } = require('testcontainers');
const path = require('path');
const fs = require('fs');

module.exports = async function globalSetup() {
  // MySQL과 MinIO를 병렬로 시작
  console.log('\nStarting MySQL + MinIO containers...');

  const [mysqlContainer, minioContainer] = await Promise.all([
    new MySqlContainer('mysql:8.0').withDatabase('test_integration').withRootPassword('testroot').start(),

    new GenericContainer('minio/minio')
      .withCommand(['server', '/data'])
      .withEnvironment({
        MINIO_ROOT_USER: 'minioadmin',
        MINIO_ROOT_PASSWORD: 'minioadmin',
      })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
      .start(),
  ]);

  const containerInfo = {
    DB_HOST: mysqlContainer.getHost(),
    DB_PORT: mysqlContainer.getMappedPort(3306).toString(),
    DB_DATABASE: 'test_integration',
    DB_USERNAME: 'root',
    DB_PASSWORD: 'testroot',
    MINIO_HOST: minioContainer.getHost(),
    MINIO_PORT: minioContainer.getMappedPort(9000).toString(),
  };

  fs.writeFileSync(path.join(__dirname, '.container-info.json'), JSON.stringify(containerInfo));

  global.__MYSQL_CONTAINER__ = mysqlContainer;
  global.__MINIO_CONTAINER__ = minioContainer;

  console.log(`MySQL on port ${containerInfo.DB_PORT}, MinIO on port ${containerInfo.MINIO_PORT}`);
};
