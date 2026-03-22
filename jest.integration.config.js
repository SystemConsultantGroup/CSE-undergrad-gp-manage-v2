module.exports = {
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  globalSetup: './__tests__/integration/global-setup.js',
  globalTeardown: './__tests__/integration/global-teardown.js',
  setupFiles: ['./__tests__/integration/setup.js'],
  testTimeout: 30000,
  // 테스트 파일 간 DB 충돌 방지 (각 파일이 force: true sync)
  maxWorkers: 1,
  // session store의 checkExpirationInterval 타이머로 인해 프로세스가 안 끝남
  forceExit: true,
  collectCoverageFrom: [
    'routes/**/*.js',
    'lib/**/*.js',
    'config/**/*.js',
    'models/**/*.js',
    'middleware.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'json-summary', 'lcov'],
  reporters: ['default', ['jest-junit', { outputDirectory: './reports', outputName: 'integration-junit.xml' }]],
};
