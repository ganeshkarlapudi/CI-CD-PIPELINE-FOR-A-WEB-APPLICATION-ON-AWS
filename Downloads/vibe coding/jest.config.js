module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/database.js',
    '!src/config/redis.js',
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true,
  moduleNameMapper: {
    '^sharp$': '<rootDir>/__tests__/mocks/sharp.js',
  },
};
