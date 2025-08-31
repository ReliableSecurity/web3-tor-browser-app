module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**'
  ],
  
  // Test timeout for long-running operations
  testTimeout: 300000, // 5 minutes for Tor operations
  
  // Verbose output
  verbose: true,
  
  // Handle async operations
  detectOpenHandles: true,
  forceExit: true,
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Global variables
  globals: {
    '__DEV__': true,
    '__TEST__': true
  },
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      suiteName: 'Tor Browser Tests'
    }],
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'test-report.html',
      expand: true
    }]
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Max concurrent workers for stability
  maxWorkers: 2,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Bail configuration - stop on first failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};
