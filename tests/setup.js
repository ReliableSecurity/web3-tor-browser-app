// Jest setup file
const fs = require('fs').promises;
const path = require('path');

// Increase test timeout for all tests
jest.setTimeout(300000); // 5 minutes

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'test-bot-token';
process.env.TOR_SOCKS_PORT = process.env.TOR_SOCKS_PORT || '9052';
process.env.TOR_CONTROL_PORT = process.env.TOR_CONTROL_PORT || '9053';
process.env.MAX_SESSIONS = process.env.MAX_SESSIONS || '5';
process.env.SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || '1800000';
process.env.TOR_CONFIG_DIR = '/tmp/tor-config';
process.env.TOR_DATA_DIR = '/tmp/tor-data';

// Global test utilities
global.TEST_TIMEOUT = {
  SHORT: 10000,    // 10 seconds
  MEDIUM: 30000,   // 30 seconds
  LONG: 60000,     // 1 minute
  VERY_LONG: 120000, // 2 minutes
  TOR_START: 90000   // 90 seconds for Tor startup
};

// Create test directories before tests
beforeAll(async () => {
  console.log('🔧 Setting up global test environment...');
  
  // Ensure test directories exist
  const testDirs = [
    '/tmp/test-tor-browser',
    '/tmp/tor-config',
    '/tmp/tor-data',
    path.join(__dirname, '..', 'test-results'),
    path.join(__dirname, '..', 'coverage')
  ];
  
  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created test directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`❌ Failed to create test directory ${dir}:`, error.message);
      }
    }
  }
  
  // Set up test data
  await setupTestData();
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up global test environment...');
  
  // Cleanup test directories (but keep results and coverage)
  const cleanupDirs = [
    '/tmp/test-tor-browser',
    '/tmp/tor-config',
    '/tmp/tor-data'
  ];
  
  for (const dir of cleanupDirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      console.log(`✅ Cleaned up directory: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup directory ${dir}:`, error.message);
    }
  }
});

// Setup test data
async function setupTestData() {
  try {
    // Create mock torrc file for tests
    const torrcContent = `
# Test Tor Configuration
SOCKSPort ${process.env.TOR_SOCKS_PORT}
ControlPort ${process.env.TOR_CONTROL_PORT}
DataDirectory ${process.env.TOR_DATA_DIR}
Log notice stdout
ExitPolicy reject *:*
DNSPort 0
TransPort 0
`;
    
    await fs.writeFile(path.join(process.env.TOR_CONFIG_DIR, 'torrc'), torrcContent);
    console.log('✅ Created test torrc configuration');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error.message);
  }
}

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };

// Custom matchers
expect.extend({
  toBeWithinTimeout(received, timeout) {
    const pass = received <= timeout;
    return {
      pass,
      message: () => `Expected ${received}ms to be within timeout of ${timeout}ms`
    };
  },
  
  toHaveTorProperties(received) {
    const requiredProps = ['IsTor', 'IP'];
    const pass = requiredProps.every(prop => received.hasOwnProperty(prop));
    return {
      pass,
      message: () => `Expected object to have Tor properties: ${requiredProps.join(', ')}`
    };
  },
  
  toBeValidSessionId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      pass,
      message: () => `Expected ${received} to be a valid session ID`
    };
  }
});

// Helper functions available in all tests
global.testHelpers = {
  // Wait for condition with timeout
  waitForCondition: async (condition, timeout = 30000, interval = 100) => {
    const maxAttempts = timeout / interval;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (await condition()) {
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  // Create mock Telegram message
  createMockTelegramMessage: (userId, text, chatId = userId) => ({
    message_id: Date.now(),
    from: {
      id: userId,
      is_bot: false,
      first_name: 'TestUser',
      username: 'testuser'
    },
    chat: {
      id: chatId,
      type: 'private'
    },
    date: Math.floor(Date.now() / 1000),
    text: text
  }),
  
  // Generate random test data
  randomSessionId: () => `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  randomUserId: () => Math.floor(Math.random() * 1000000),
  
  // Test URLs
  testUrls: {
    tor: 'https://check.torproject.org',
    duckduckgo: 'https://duckduckgo.com',
    onion: 'http://3g2upl4pq6kufc4m.onion', // DuckDuckGo onion
    blocked: 'https://google.com',
    malicious: 'http://malicious-site.example.com'
  },
  
  // Verify browser session structure
  verifySessionStructure: (session) => {
    expect(session).toHaveProperty('sessionId');
    expect(session).toHaveProperty('status');
    expect(session).toHaveProperty('createdAt');
    expect(session).toHaveProperty('lastActivity');
  },
  
  // Clean up test sessions
  cleanupTestSessions: async (webAppManager, sessionIds) => {
    if (!webAppManager || !Array.isArray(sessionIds)) return;
    
    for (const sessionId of sessionIds) {
      try {
        await webAppManager.stopSession(sessionId);
      } catch (error) {
        // Ignore cleanup errors in tests
        console.warn(`Failed to cleanup session ${sessionId}:`, error.message);
      }
    }
  }
};

// Suppress some console output during tests unless in debug mode
if (!process.env.DEBUG_TESTS) {
  const methodsToSuppress = ['log', 'info'];
  methodsToSuppress.forEach(method => {
    console[method] = jest.fn();
  });
  
  // But keep errors and warnings
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
}

console.log('✅ Test environment setup complete');
