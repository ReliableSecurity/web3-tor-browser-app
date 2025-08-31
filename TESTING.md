# 🧪 Testing Guide for Web3 Tor Browser App

This document provides comprehensive information about testing the Web3 Tor Browser application, including setup, running tests, and understanding test results.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Categories](#test-categories)
- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Test Configuration](#test-configuration)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Our testing strategy covers multiple aspects of the application:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interactions
- **Load Tests**: Performance under stress
- **End-to-End Tests**: Complete user workflows
- **Security Tests**: Vulnerability and security checks

## 🏷️ Test Categories

### 1. Unit Tests (`npm run test:unit`)
- Tests individual functions and classes
- Covers TorManager, WebAppManager, SecurityManager
- Fast execution (< 5 minutes)
- High code coverage requirements (85%+)

### 2. Load Tests (`npm run test:load`)
- Performance testing under various loads
- Memory leak detection
- Concurrent session handling
- Response time analysis
- Longer execution time (10-15 minutes)

### 3. End-to-End Tests (`npm run test:e2e`)
- Complete user workflows
- Browser automation
- Real Tor network integration
- Longest execution time (15-20 minutes)

### 4. Security Tests (`npm run test:security`)
- Input validation
- XSS/CSRF protection
- Rate limiting
- Authentication/authorization
- Encryption/decryption

## ⚙️ Prerequisites

### System Requirements
- Node.js 18+
- Tor installed and available in PATH
- At least 4GB RAM for load tests
- Chrome/Chromium for browser tests

### Installation
```bash
# Install dependencies
npm install

# Verify Tor installation
tor --version

# Verify Node.js version
node --version
```

### Environment Variables
Create a `.env.test` file:
```env
NODE_ENV=test
TELEGRAM_BOT_TOKEN=test-token-123
TOR_SOCKS_PORT=9052
TOR_CONTROL_PORT=9053
MAX_SESSIONS=5
SESSION_TIMEOUT=1800000
DEBUG_TESTS=false
```

## 🚀 Running Tests

### Quick Start
```bash
# Run basic unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

### All Test Categories
```bash
# Unit and integration tests
npm run test:unit

# Load and performance tests  
npm run test:load

# End-to-end tests
npm run test:e2e

# Security tests
npm run test:security

# All tests (takes 20-30 minutes)
npm run test:all

# CI/CD pipeline tests
npm run test:ci
```

### Advanced Usage
```bash
# Verbose output
node scripts/test-runner.js unit --verbose

# Skip coverage
node scripts/test-runner.js unit --no-coverage

# Bail on first failure
node scripts/test-runner.js all --bail

# Update snapshots
node scripts/test-runner.js unit --update-snapshots
```

## 📊 Test Configuration

### Jest Configuration (`jest.config.js`)
- **Environment**: Node.js
- **Timeout**: 5 minutes for most tests, 15 minutes for load tests
- **Coverage**: 85% threshold for lines, functions, branches
- **Workers**: Limited to 2 for stability
- **Setup**: `tests/setup.js` for global test configuration

### Test Structure
```
tests/
├── setup.js              # Global test setup
├── torBrowser.test.js     # Main test suite
├── load.test.js          # Load/performance tests
└── helpers/              # Test utilities
```

### Environment Setup
Tests automatically create isolated environments:
- Temporary Tor configuration directories
- Mock Telegram bot instances
- Isolated browser sessions
- Clean database states

## ✍️ Writing Tests

### Test Structure Example
```javascript
const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');

describe('🧅 Feature Name', () => {
    let manager;
    
    beforeAll(async () => {
        manager = new FeatureManager();
        await manager.initialize();
    });
    
    afterAll(async () => {
        await manager.cleanup();
    });
    
    test('should perform expected behavior', async () => {
        // Arrange
        const input = 'test-data';
        
        // Act
        const result = await manager.processInput(input);
        
        // Assert
        expect(result).toHaveProperty('success', true);
        expect(result.data).toBeDefined();
    });
});
```

### Custom Matchers
Available custom Jest matchers:
```javascript
expect(duration).toBeWithinTimeout(30000);
expect(torResponse).toHaveTorProperties();
expect(sessionId).toBeValidSessionId();
```

### Test Helpers
Use global test helpers from `tests/setup.js`:
```javascript
// Wait for conditions
await testHelpers.waitForCondition(() => service.isReady());

// Generate test data
const sessionId = testHelpers.randomSessionId();
const userId = testHelpers.randomUserId();

// Mock Telegram messages
const message = testHelpers.createMockTelegramMessage(userId, '/start');

// Cleanup test sessions
await testHelpers.cleanupTestSessions(webAppManager, sessionIds);
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Tor
        run: |
          sudo apt-get update
          sudo apt-get install -y tor
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
        env:
          CI: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: success()
```

### Docker Testing
```bash
# Build test environment
docker build -t tor-browser-test -f Dockerfile.test .

# Run tests in container
docker run --rm tor-browser-test npm run test:all
```

## 📈 Performance Benchmarks

### Expected Performance Metrics
- **Session Creation**: < 60 seconds average, < 120 seconds max
- **Navigation**: < 30 seconds for most sites
- **Memory Usage**: < 200MB growth over 20 test cycles
- **Concurrent Sessions**: Support for 5+ simultaneous sessions
- **Tor Identity Change**: < 30 seconds average

### Load Test Scenarios
1. **Maximum Concurrent Sessions**: Create MAX_SESSIONS simultaneously
2. **Rapid Cycling**: Create/destroy sessions in quick succession  
3. **Sustained Load**: 30 operations/minute for 2 minutes
4. **Memory Stress**: 20 create/navigate/screenshot/destroy cycles
5. **Recovery Testing**: Handle Tor restarts and browser crashes

## 🔒 Security Test Coverage

### Input Validation
- XSS attempt prevention
- SQL injection protection
- Path traversal blocking
- Command injection prevention

### Authentication & Authorization
- Session ownership validation
- Rate limiting enforcement
- IP whitelisting
- Token validation

### Network Security
- Tor anonymity verification
- DNS leak prevention
- WebRTC blocking
- HTTPS enforcement

## 🐛 Troubleshooting

### Common Issues

#### Tests Timeout
```bash
# Increase timeout for specific tests
TEST_TIMEOUT=600000 npm run test:load
```

#### Tor Connection Issues
```bash
# Check Tor service
systemctl status tor

# Verify ports are available
netstat -tlnp | grep 905
```

#### Memory Issues
```bash
# Run with garbage collection
node --expose-gc node_modules/.bin/jest

# Reduce concurrent workers
npm run test -- --maxWorkers=1
```

#### Permission Errors
```bash
# Fix test directory permissions
chmod -R 755 tests/
chmod +x scripts/test-runner.js
```

### Debug Mode
Enable verbose debugging:
```bash
DEBUG_TESTS=true npm run test:unit -- --verbose
```

### Test Result Analysis

#### Coverage Reports
- HTML report: `coverage/lcov-report/index.html`
- JSON report: `coverage/coverage-final.json`
- LCOV report: `coverage/lcov.info`

#### Test Reports
- JUnit XML: `test-results/junit.xml`
- HTML report: `test-results/test-report.html`
- JSON report: `test-results/test-report-{category}-{timestamp}.json`

### Performance Monitoring
Monitor test performance over time:
```bash
# Generate performance baseline
npm run test:load > performance-baseline.log

# Compare against baseline
npm run test:load > performance-current.log
diff performance-baseline.log performance-current.log
```

## 📞 Support

If you encounter issues with testing:

1. **Check Prerequisites**: Ensure all dependencies are installed
2. **Review Logs**: Check `logs/` directory for detailed error information
3. **Verify Environment**: Confirm environment variables are set correctly
4. **Clean Environment**: Remove temporary files and restart services
5. **Update Dependencies**: Ensure all packages are up to date

### Test Environment Reset
```bash
# Clean all test artifacts
rm -rf coverage/ test-results/ logs/ /tmp/tor-*

# Reinstall dependencies
rm -rf node_modules/ package-lock.json
npm install

# Verify installation
npm run test:unit
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Puppeteer Testing Guide](https://pptr.dev/)
- [Tor Testing Best Practices](https://tb-manual.torproject.org/testing/)
- [Node.js Testing Guide](https://nodejs.org/api/test.html)

**Happy Testing! 🎉**
