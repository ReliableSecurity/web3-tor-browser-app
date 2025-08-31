const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const TorManager = require('../src/torManager');
const WebAppManager = require('../src/webAppManager');
const TelegramBot = require('../src/telegramBot');
const SecurityManager = require('../src/securityManager');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TOR_SOCKS_PORT = '9052';
process.env.TOR_CONTROL_PORT = '9053';
process.env.MAX_SESSIONS = '5';

describe('🧅 Tor Browser Core Functionality Tests', () => {
    let torManager;
    let webAppManager;
    let securityManager;

    beforeAll(async () => {
        console.log('🔧 Setting up test environment...');
        
        // Initialize core managers
        torManager = new TorManager();
        securityManager = new SecurityManager();
        
        // Create test directories
        await fs.mkdir('/tmp/test-tor-browser', { recursive: true });
    });

    afterAll(async () => {
        console.log('🧹 Cleaning up test environment...');
        
        // Stop all services
        if (torManager) {
            await torManager.stop();
        }
        if (webAppManager) {
            await webAppManager.shutdown();
        }
        
        // Cleanup test directories
        await fs.rm('/tmp/test-tor-browser', { recursive: true, force: true });
    });

    describe('🔧 TorManager Tests', () => {
        test('should initialize Tor configuration', async () => {
            await expect(torManager.createTorConfig()).resolves.toBeDefined();
            
            // Verify config file exists
            const configExists = await fs.access('/tmp/tor-config/torrc')
                .then(() => true)
                .catch(() => false);
            expect(configExists).toBe(true);
        });

        test('should check Tor installation', async () => {
            await expect(torManager.checkTorInstallation()).resolves.toMatch(/Tor version/);
        });

        test('should start Tor process', async () => {
            // This test may take time, so increase timeout
            await expect(torManager.startTor()).resolves.toBeUndefined();
            expect(torManager.isRunning).toBe(true);
        }, 90000);

        test('should verify Tor connection', async () => {
            // Wait for Tor to be fully ready
            await torManager.waitForConnection();
            
            const connectionInfo = await torManager.verifyTorConnection();
            expect(connectionInfo).toHaveProperty('IsTor', true);
            expect(connectionInfo).toHaveProperty('IP');
        }, 60000);

        test('should get new Tor identity', async () => {
            const oldInfo = await torManager.verifyTorConnection();
            const newInfo = await torManager.newIdentity();
            
            expect(newInfo).toHaveProperty('IP');
            // IP should change (though not guaranteed)
            console.log(`Old IP: ${oldInfo.IP}, New IP: ${newInfo.IP}`);
        });

        test('should provide proxy configuration', () => {
            const proxyConfig = torManager.getProxyConfig();
            expect(proxyConfig).toHaveProperty('protocol', 'socks5');
            expect(proxyConfig).toHaveProperty('host', '127.0.0.1');
            expect(proxyConfig).toHaveProperty('port');
            expect(proxyConfig).toHaveProperty('url');
        });

        test('should perform health checks', async () => {
            const isHealthy = await torManager.healthCheck();
            expect(isHealthy).toBe(true);
        });
    });

    describe('🌐 WebAppManager Tests', () => {
        beforeEach(async () => {
            webAppManager = new WebAppManager();
            // Wait for initialization
            await new Promise((resolve) => {
                if (webAppManager.isInitialized) {
                    resolve();
                } else {
                    webAppManager.once('ready', resolve);
                }
            });
        });

        afterEach(async () => {
            if (webAppManager) {
                await webAppManager.shutdown();
            }
        });

        test('should initialize successfully', () => {
            expect(webAppManager.isInitialized).toBe(true);
            expect(webAppManager.torManager).toBeDefined();
        });

        test('should start browser session', async () => {
            const sessionId = 'test-session-' + Date.now();
            const options = { userAgent: 'desktop' };
            
            const result = await webAppManager.startBrowserSession(sessionId, options);
            
            expect(result).toHaveProperty('sessionId', sessionId);
            expect(result).toHaveProperty('status', 'active');
            expect(result).toHaveProperty('deviceType', 'desktop');
            
            // Cleanup
            await webAppManager.stopSession(sessionId);
        }, 60000);

        test('should handle multiple sessions', async () => {
            const sessions = [];
            const sessionCount = 3;
            
            // Create multiple sessions
            for (let i = 0; i < sessionCount; i++) {
                const sessionId = `test-multi-session-${Date.now()}-${i}`;
                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                sessions.push(sessionId);
            }
            
            expect(webAppManager.getActiveSessions()).toHaveLength(sessionCount);
            
            // Cleanup all sessions
            for (const sessionId of sessions) {
                await webAppManager.stopSession(sessionId);
            }
        }, 120000);

        test('should navigate to allowed URLs', async () => {
            const sessionId = 'test-nav-session-' + Date.now();
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            
            const result = await webAppManager.navigateToUrl(sessionId, 'https://check.torproject.org');
            expect(result.success).toBe(true);
            
            await webAppManager.stopSession(sessionId);
        }, 90000);

        test('should block unauthorized URLs', async () => {
            const sessionId = 'test-block-session-' + Date.now();
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            
            const result = await webAppManager.navigateToUrl(sessionId, 'https://google.com');
            expect(result.success).toBe(false);
            expect(result.error).toContain('URL не разрешен');
            
            await webAppManager.stopSession(sessionId);
        }, 60000);

        test('should handle viewport settings', () => {
            const mobileViewport = webAppManager.getViewportSettings('mobile');
            expect(mobileViewport).toHaveProperty('isMobile', true);
            expect(mobileViewport).toHaveProperty('hasTouch', true);
            
            const desktopViewport = webAppManager.getViewportSettings('desktop');
            expect(desktopViewport).toHaveProperty('isMobile', false);
            expect(desktopViewport).toHaveProperty('hasTouch', false);
        });

        test('should monitor session health', async () => {
            const sessionId = 'test-health-session-' + Date.now();
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            
            // Wait for monitoring cycle
            const statsPromise = new Promise((resolve) => {
                webAppManager.once('sessionStats', resolve);
            });
            
            // Trigger monitoring
            await webAppManager.monitorSessions();
            
            const stats = await statsPromise;
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('healthy');
            
            await webAppManager.stopSession(sessionId);
        });
    });

    describe('🔒 Security Manager Tests', () => {
        test('should validate input data', async () => {
            const validUrl = 'https://duckduckgo.com';
            const invalidUrl = '<script>alert("xss")</script>';
            
            expect(securityManager.validateUrl(validUrl)).toBe(true);
            expect(() => securityManager.validateInput(invalidUrl)).toThrow();
        });

        test('should detect malicious URLs', async () => {
            const suspiciousUrl = 'http://malicious-site.evil.com';
            const safeUrl = 'https://duckduckgo.com';
            
            const suspiciousResult = await securityManager.analyzeUrl(suspiciousUrl);
            const safeResult = await securityManager.analyzeUrl(safeUrl);
            
            expect(suspiciousResult.isSafe).toBe(false);
            expect(safeResult.isSafe).toBe(true);
        });

        test('should enforce rate limiting', async () => {
            const userId = 'test-user-123';
            
            // First request should pass
            expect(securityManager.checkRateLimit(userId)).toBe(true);
            
            // Simulate multiple rapid requests
            for (let i = 0; i < 100; i++) {
                securityManager.checkRateLimit(userId);
            }
            
            // Should be rate limited now
            expect(securityManager.checkRateLimit(userId)).toBe(false);
        });

        test('should handle IP whitelisting', () => {
            const allowedIp = '127.0.0.1';
            const blockedIp = '192.168.1.100';
            
            expect(securityManager.isIpWhitelisted(allowedIp)).toBe(true);
            expect(securityManager.isIpWhitelisted(blockedIp)).toBe(false);
        });
    });

    describe('🤖 Telegram Bot Tests', () => {
        let mockBot;
        
        beforeEach(() => {
            // Mock Telegram Bot for testing
            mockBot = {
                onStartBrowser: jest.fn(),
                onStopBrowser: jest.fn()
            };
        });

        test('should handle /start command', async () => {
            const telegramBot = new TelegramBot(mockBot);
            expect(telegramBot).toBeDefined();
            expect(telegramBot.callbacks).toBe(mockBot);
        });

        test('should manage user sessions', async () => {
            const telegramBot = new TelegramBot(mockBot);
            const userId = 12345;
            const sessionData = {
                sessionId: 'test-session',
                accessUrl: 'http://localhost:3000/webapp',
                createdAt: new Date()
            };
            
            telegramBot.userSessions.set(userId, sessionData);
            
            const userSession = telegramBot.getUserSession(userId);
            expect(userSession).toEqual(sessionData);
        });
    });

    describe('📊 Integration Tests', () => {
        test('should integrate all components', async () => {
            // Test full integration flow
            const sessionId = 'integration-test-' + Date.now();
            
            // Start session
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            
            // Check Tor status
            const torStatus = webAppManager.getTorStatus();
            expect(torStatus.isRunning).toBe(true);
            
            // Navigate to safe site
            const navResult = await webAppManager.navigateToUrl(sessionId, 'https://check.torproject.org');
            expect(navResult.success).toBe(true);
            
            // Get page content
            const content = await webAppManager.getPageContent(sessionId);
            expect(content.success).toBe(true);
            expect(content.content).toContain('Tor');
            
            // Get screenshot
            const screenshot = await webAppManager.getScreenshot(sessionId);
            expect(screenshot.success).toBe(true);
            expect(screenshot.screenshot).toBeDefined();
            
            // Stop session
            await webAppManager.stopSession(sessionId);
        }, 180000);

        test('should handle error conditions gracefully', async () => {
            const sessionId = 'error-test-' + Date.now();
            
            // Test navigation without active session
            const navResult = await webAppManager.navigateToUrl(sessionId, 'https://duckduckgo.com');
            expect(navResult.success).toBe(false);
            
            // Test screenshot without active session
            const screenshotResult = await webAppManager.getScreenshot(sessionId);
            expect(screenshotResult.success).toBe(false);
        });

        test('should cleanup inactive sessions', async () => {
            const oldSessionId = 'old-session-' + Date.now();
            
            // Create session
            await webAppManager.startBrowserSession(oldSessionId, { userAgent: 'desktop' });
            
            // Simulate old session
            const session = webAppManager.sessions.get(oldSessionId);
            session.lastActivity = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
            
            // Trigger cleanup
            await webAppManager.cleanupInactiveSessions();
            
            // Session should be removed
            expect(webAppManager.sessions.has(oldSessionId)).toBe(false);
        });
    });

    describe('🚀 Performance Tests', () => {
        test('should handle concurrent session requests', async () => {
            const concurrentSessions = 3;
            const sessionPromises = [];
            
            for (let i = 0; i < concurrentSessions; i++) {
                const sessionId = `concurrent-test-${Date.now()}-${i}`;
                sessionPromises.push(
                    webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' })
                );
            }
            
            const results = await Promise.allSettled(sessionPromises);
            
            // At least some should succeed
            const successful = results.filter(r => r.status === 'fulfilled');
            expect(successful.length).toBeGreaterThan(0);
            
            // Cleanup
            for (let i = 0; i < concurrentSessions; i++) {
                const sessionId = `concurrent-test-${Date.now()}-${i}`;
                try {
                    await webAppManager.stopSession(sessionId);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        }, 120000);

        test('should respond to API within acceptable time', async () => {
            const sessionId = 'perf-test-' + Date.now();
            
            const startTime = Date.now();
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            const endTime = Date.now();
            
            const duration = endTime - startTime;
            expect(duration).toBeLessThan(60000); // Should start within 60 seconds
            
            await webAppManager.stopSession(sessionId);
        }, 90000);
    });

    describe('🔐 Security Tests', () => {
        test('should validate session ownership', async () => {
            const sessionId = 'security-test-' + Date.now();
            const userId1 = 'user1';
            const userId2 = 'user2';
            
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            
            // Simulate session ownership
            const session = webAppManager.sessions.get(sessionId);
            session.userId = userId1;
            
            // User1 should have access
            const user1Session = webAppManager.getSessionInfo(sessionId);
            expect(user1Session).toBeDefined();
            
            await webAppManager.stopSession(sessionId);
        });

        test('should sanitize malicious input', () => {
            const maliciousScript = '<script>alert(\"xss\")</script><img src=x onerror=alert(1)>';
            
            expect(() => {
                securityManager.validateInput(maliciousScript);
            }).toThrow();
        });

        test('should encrypt sensitive data', () => {
            const sensitiveData = 'user-secret-token-123';
            const encrypted = securityManager.encrypt(sensitiveData);
            const decrypted = securityManager.decrypt(encrypted);
            
            expect(encrypted).not.toBe(sensitiveData);
            expect(decrypted).toBe(sensitiveData);
        });
    });

    describe('🌐 Network Tests', () => {
        test('should verify Tor anonymity', async () => {
            // Check that we get a Tor IP
            const response = await axios.get('https://check.torproject.org/api/ip', {
                proxy: false,
                httpsAgent: new (require('socks-proxy-agent').SocksProxyAgent)('socks5://127.0.0.1:9052'),
                timeout: 30000
            });
            
            expect(response.data.IsTor).toBe(true);
            expect(response.data.IP).toBeDefined();
        }, 45000);

        test('should handle network failures gracefully', async () => {
            // Test with invalid proxy
            const invalidTorManager = new TorManager();
            invalidTorManager.torPort = 9999; // Invalid port
            
            await expect(invalidTorManager.verifyTorConnection()).rejects.toThrow();
        });
    });

    describe('📱 Telegram WebApp Tests', () => {
        test('should handle different device types', () => {
            const mobileViewport = webAppManager.getViewportSettings('mobile');
            const desktopViewport = webAppManager.getViewportSettings('desktop');
            
            expect(mobileViewport.isMobile).toBe(true);
            expect(desktopViewport.isMobile).toBe(false);
            expect(mobileViewport.width).toBeLessThan(desktopViewport.width);
        });

        test('should validate allowed URLs', () => {
            expect(webAppManager.isAllowedUrl('https://duckduckgo.com')).toBe(true);
            expect(webAppManager.isAllowedUrl('http://test.onion')).toBe(true);
            expect(webAppManager.isAllowedUrl('https://google.com')).toBe(false);
            expect(webAppManager.isAllowedUrl('https://facebook.com')).toBe(false);
        });
    });

    describe('💾 Memory and Resource Tests', () => {
        test('should not have memory leaks', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Create and destroy multiple sessions
            for (let i = 0; i < 5; i++) {
                const sessionId = `memory-test-${Date.now()}-${i}`;\n                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                await webAppManager.stopSession(sessionId);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 100MB)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        }, 180000);

        test('should respect session limits', async () => {
            const maxSessions = parseInt(process.env.MAX_SESSIONS);
            const sessions = [];
            
            // Try to create more sessions than allowed
            for (let i = 0; i < maxSessions + 2; i++) {
                try {
                    const sessionId = `limit-test-${Date.now()}-${i}`;
                    await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                    sessions.push(sessionId);
                } catch (error) {
                    // Expected to fail at some point
                    break;
                }
            }
            
            expect(sessions.length).toBeLessThanOrEqual(maxSessions);
            
            // Cleanup
            for (const sessionId of sessions) {
                try {
                    await webAppManager.stopSession(sessionId);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        }, 240000);
    });

    describe('🔄 Recovery Tests', () => {
        test('should recover from Tor restart', async () => {
            // Stop Tor
            await torManager.stop();
            expect(torManager.isRunning).toBe(false);
            
            // Restart Tor
            await torManager.restart();
            expect(torManager.isRunning).toBe(true);
            
            // Verify connection works
            const connectionInfo = await torManager.verifyTorConnection();
            expect(connectionInfo.IsTor).toBe(true);
        }, 120000);

        test('should handle browser crashes gracefully', async () => {
            const sessionId = 'crash-test-' + Date.now();
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            
            // Simulate browser crash by closing it manually
            const session = webAppManager.sessions.get(sessionId);
            await session.browser.close();
            
            // Monitor should detect and cleanup
            await webAppManager.monitorSessions();
            
            expect(webAppManager.sessions.has(sessionId)).toBe(false);
        });
    });
});

// Helper functions for testing
function createMockTelegramMessage(userId, text, chatId = userId) {
    return {
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
    };
}

function waitForCondition(condition, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const interval = 100;
        const maxAttempts = timeout / interval;
        let attempts = 0;
        
        const check = () => {
            attempts++;
            if (condition()) {
                resolve(true);
            } else if (attempts >= maxAttempts) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(check, interval);
            }
        };
        
        check();
    });
}

module.exports = {
    createMockTelegramMessage,
    waitForCondition
};
