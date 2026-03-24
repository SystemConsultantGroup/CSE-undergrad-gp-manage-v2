const path = require('path');
const fs = require('fs');

module.exports = async function globalTeardown() {
  const stops = [];

  if (global.__MYSQL_CONTAINER__) {
    stops.push(global.__MYSQL_CONTAINER__.stop());
  }
  if (global.__MINIO_CONTAINER__) {
    stops.push(global.__MINIO_CONTAINER__.stop());
  }

  if (stops.length > 0) {
    console.log('\nStopping containers...');
    await Promise.all(stops);
    console.log('Containers stopped');
  }

  const infoFile = path.join(__dirname, '.container-info.json');
  if (fs.existsSync(infoFile)) {
    fs.unlinkSync(infoFile);
  }
};
