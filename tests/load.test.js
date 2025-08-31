const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const WebAppManager = require('../src/webAppManager');
const TorManager = require('../src/torManager');
const { performance } = require('perf_hooks');

describe('🚀 Load Testing Suite', () => {
    let webAppManager;
    let torManager;
    const testSessions = [];

    beforeAll(async () => {
        console.log('🔧 Setting up load testing environment...');
        torManager = new TorManager();
        await torManager.startTor();
        await torManager.waitForConnection();
        
        webAppManager = new WebAppManager();
        await new Promise((resolve) => {
            if (webAppManager.isInitialized) {
                resolve();
            } else {
                webAppManager.once('ready', resolve);
            }
        });
    }, 120000);

    afterAll(async () => {
        console.log('🧹 Cleaning up load testing environment...');
        
        // Clean up all test sessions
        for (const sessionId of testSessions) {
            try {
                await webAppManager.stopSession(sessionId);
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        
        if (webAppManager) {
            await webAppManager.shutdown();
        }
        if (torManager) {
            await torManager.stop();
        }
    });

    describe('📊 Session Load Tests', () => {
        test('should handle maximum concurrent sessions', async () => {
            const maxSessions = parseInt(process.env.MAX_SESSIONS) || 5;
            const sessionPromises = [];
            const successfulSessions = [];
            
            console.log(`Creating ${maxSessions} concurrent sessions...`);
            
            // Create sessions concurrently
            for (let i = 0; i < maxSessions; i++) {
                const sessionId = `load-test-concurrent-${Date.now()}-${i}`;
                testSessions.push(sessionId);
                
                sessionPromises.push(
                    webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' })
                        .then((result) => {
                            successfulSessions.push(sessionId);
                            return result;
                        })
                        .catch((error) => {
                            console.warn(`Session ${sessionId} failed:`, error.message);
                            return { error };
                        })
                );
            }
            
            const results = await Promise.allSettled(sessionPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error);
            
            console.log(`Successfully created ${successful.length}/${maxSessions} sessions`);
            
            // Should be able to create at least 80% of max sessions
            expect(successful.length).toBeGreaterThanOrEqual(Math.floor(maxSessions * 0.8));
            
            // Verify sessions are active
            const activeSessions = webAppManager.getActiveSessions();
            expect(activeSessions.length).toBe(successful.length);
            
        }, 180000);

        test('should handle rapid session creation and destruction', async () => {
            const cycleCount = 10;
            const sessionCreationTimes = [];
            const sessionDestructionTimes = [];
            
            console.log(`Performing ${cycleCount} rapid session cycles...`);
            
            for (let i = 0; i < cycleCount; i++) {
                const sessionId = `load-test-rapid-${Date.now()}-${i}`;
                testSessions.push(sessionId);
                
                // Measure session creation time
                const createStart = performance.now();
                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                const createEnd = performance.now();
                sessionCreationTimes.push(createEnd - createStart);
                
                // Measure session destruction time
                const destroyStart = performance.now();
                await webAppManager.stopSession(sessionId);
                const destroyEnd = performance.now();
                sessionDestructionTimes.push(destroyEnd - destroyStart);
                
                // Remove from cleanup list since we already destroyed it
                const index = testSessions.indexOf(sessionId);
                testSessions.splice(index, 1);
            }
            
            // Analyze performance
            const avgCreationTime = sessionCreationTimes.reduce((a, b) => a + b, 0) / sessionCreationTimes.length;
            const avgDestructionTime = sessionDestructionTimes.reduce((a, b) => a + b, 0) / sessionDestructionTimes.length;
            const maxCreationTime = Math.max(...sessionCreationTimes);
            const maxDestructionTime = Math.max(...sessionDestructionTimes);
            
            console.log(`Average session creation time: ${avgCreationTime.toFixed(2)}ms`);
            console.log(`Average session destruction time: ${avgDestructionTime.toFixed(2)}ms`);
            console.log(`Max session creation time: ${maxCreationTime.toFixed(2)}ms`);
            console.log(`Max session destruction time: ${maxDestructionTime.toFixed(2)}ms`);
            
            // Performance assertions
            expect(avgCreationTime).toBeLessThan(60000); // Average < 60 seconds
            expect(avgDestructionTime).toBeLessThan(5000); // Average < 5 seconds
            expect(maxCreationTime).toBeLessThan(120000); // Max < 2 minutes
            expect(maxDestructionTime).toBeLessThan(10000); // Max < 10 seconds
            
        }, 300000);

        test('should maintain performance under sustained load', async () => {
            const sustainedMinutes = 2; // 2 minutes of sustained load
            const operationsPerMinute = 30; // 30 operations per minute
            const totalOperations = sustainedMinutes * operationsPerMinute;
            const operationInterval = (60 * 1000) / operationsPerMinute; // ms between operations
            
            console.log(`Running sustained load test: ${totalOperations} operations over ${sustainedMinutes} minutes`);
            
            const operationTimes = [];
            const errors = [];
            let operationCount = 0;
            
            const performOperation = async () => {
                const sessionId = `load-test-sustained-${Date.now()}-${operationCount}`;
                const startTime = performance.now();
                
                try {
                    await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                    testSessions.push(sessionId);
                    
                    // Perform a quick navigation
                    await webAppManager.navigateToUrl(sessionId, 'https://check.torproject.org');
                    
                    // Clean up immediately to maintain steady state
                    await webAppManager.stopSession(sessionId);
                    const index = testSessions.indexOf(sessionId);
                    testSessions.splice(index, 1);
                    
                    const endTime = performance.now();
                    operationTimes.push(endTime - startTime);
                    
                } catch (error) {
                    errors.push({ operationCount, error: error.message });
                    console.warn(`Operation ${operationCount} failed:`, error.message);
                }
                
                operationCount++;
            };
            
            // Schedule operations
            const operationPromises = [];
            for (let i = 0; i < totalOperations; i++) {
                operationPromises.push(
                    new Promise((resolve) => {
                        setTimeout(async () => {
                            await performOperation();
                            resolve();
                        }, i * operationInterval);
                    })
                );
            }
            
            // Wait for all operations to complete
            await Promise.all(operationPromises);
            
            // Analyze results
            const successfulOperations = operationTimes.length;
            const errorRate = (errors.length / totalOperations) * 100;
            const avgOperationTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
            
            console.log(`Successful operations: ${successfulOperations}/${totalOperations}`);
            console.log(`Error rate: ${errorRate.toFixed(2)}%`);
            console.log(`Average operation time: ${avgOperationTime.toFixed(2)}ms`);
            
            // Performance assertions
            expect(successfulOperations).toBeGreaterThan(totalOperations * 0.8); // 80% success rate
            expect(errorRate).toBeLessThan(20); // Less than 20% error rate
            expect(avgOperationTime).toBeLessThan(90000); // Average < 90 seconds
            
        }, 300000);
    });

    describe('🌐 Network Load Tests', () => {
        test('should handle concurrent navigation requests', async () => {
            const sessionCount = 3;
            const urlsToTest = [
                'https://check.torproject.org',
                'https://duckduckgo.com',
                'https://www.torproject.org'
            ];
            
            // Create sessions
            const sessionIds = [];
            for (let i = 0; i < sessionCount; i++) {
                const sessionId = `load-test-nav-${Date.now()}-${i}`;
                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                sessionIds.push(sessionId);
                testSessions.push(sessionId);
            }
            
            // Perform concurrent navigation
            const navigationPromises = [];
            sessionIds.forEach((sessionId, index) => {
                const url = urlsToTest[index % urlsToTest.length];
                navigationPromises.push(
                    webAppManager.navigateToUrl(sessionId, url)
                        .then(result => ({ sessionId, url, result }))
                        .catch(error => ({ sessionId, url, error: error.message }))
                );
            });
            
            const results = await Promise.allSettled(navigationPromises);
            const successful = results.filter(r => 
                r.status === 'fulfilled' && 
                r.value.result && 
                r.value.result.success
            );
            
            console.log(`Successful navigations: ${successful.length}/${sessionCount}`);
            
            // Should have at least 80% success rate
            expect(successful.length).toBeGreaterThanOrEqual(Math.floor(sessionCount * 0.8));
            
        }, 120000);

        test('should handle Tor identity changes under load', async () => {
            const identityChanges = 5;
            const changeInterval = 10000; // 10 seconds between changes
            
            console.log(`Performing ${identityChanges} Tor identity changes...`);
            
            const initialIdentity = await torManager.verifyTorConnection();
            const identities = [initialIdentity];
            const changeTimes = [];
            
            for (let i = 0; i < identityChanges; i++) {
                const startTime = performance.now();
                const newIdentity = await torManager.newIdentity();
                const endTime = performance.now();
                
                changeTimes.push(endTime - startTime);
                identities.push(newIdentity);
                
                console.log(`Identity change ${i + 1}: ${newIdentity.IP} (${(endTime - startTime).toFixed(2)}ms)`);
                
                if (i < identityChanges - 1) {
                    await new Promise(resolve => setTimeout(resolve, changeInterval));
                }
            }
            
            // Analyze performance
            const avgChangeTime = changeTimes.reduce((a, b) => a + b, 0) / changeTimes.length;
            const maxChangeTime = Math.max(...changeTimes);
            
            console.log(`Average identity change time: ${avgChangeTime.toFixed(2)}ms`);
            console.log(`Max identity change time: ${maxChangeTime.toFixed(2)}ms`);
            
            // Performance assertions
            expect(avgChangeTime).toBeLessThan(30000); // Average < 30 seconds
            expect(maxChangeTime).toBeLessThan(60000); // Max < 60 seconds
            
            // Verify identities changed
            const uniqueIPs = new Set(identities.map(id => id.IP));
            expect(uniqueIPs.size).toBeGreaterThan(1);
            
        }, 180000);
    });

    describe('💾 Memory Load Tests', () => {
        test('should not have excessive memory growth', async () => {
            const iterations = 20;
            const memorySnapshots = [];
            
            // Force garbage collection if available
            const forceGC = () => {
                if (global.gc) {
                    global.gc();
                    global.gc(); // Call twice for thoroughness
                }
            };
            
            // Initial memory snapshot
            forceGC();
            memorySnapshots.push(process.memoryUsage());
            
            console.log(`Performing ${iterations} memory stress iterations...`);
            
            for (let i = 0; i < iterations; i++) {
                const sessionId = `load-test-memory-${Date.now()}-${i}`;
                
                // Create session, navigate, take screenshot, destroy
                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                await webAppManager.navigateToUrl(sessionId, 'https://check.torproject.org');
                await webAppManager.getScreenshot(sessionId);
                await webAppManager.stopSession(sessionId);
                
                // Force garbage collection every 5 iterations
                if (i % 5 === 0) {
                    forceGC();
                    memorySnapshots.push(process.memoryUsage());
                    
                    const current = memorySnapshots[memorySnapshots.length - 1];
                    const initial = memorySnapshots[0];
                    const heapGrowth = current.heapUsed - initial.heapUsed;
                    
                    console.log(`Iteration ${i}: Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
                }
            }
            
            // Final memory snapshot
            forceGC();
            memorySnapshots.push(process.memoryUsage());
            
            // Analyze memory growth
            const initialMemory = memorySnapshots[0];
            const finalMemory = memorySnapshots[memorySnapshots.length - 1];
            
            const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
            const rssGrowth = finalMemory.rss - initialMemory.rss;
            
            console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            console.log(`Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
            console.log(`RSS growth: ${(rssGrowth / 1024 / 1024).toFixed(2)}MB`);
            
            // Memory growth should be reasonable (less than 200MB)
            expect(heapGrowth).toBeLessThan(200 * 1024 * 1024);
            expect(rssGrowth).toBeLessThan(500 * 1024 * 1024);
            
        }, 300000);

        test('should clean up resources properly', async () => {
            const sessionCount = 5;
            const sessionIds = [];
            
            // Create multiple sessions
            for (let i = 0; i < sessionCount; i++) {
                const sessionId = `load-test-cleanup-${Date.now()}-${i}`;
                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                sessionIds.push(sessionId);
            }
            
            expect(webAppManager.getActiveSessions()).toHaveLength(sessionCount);
            
            // Shutdown manager (should clean up all sessions)
            const shutdownPromise = webAppManager.shutdown();
            
            // Verify shutdown completes within reasonable time
            const shutdownStart = performance.now();
            await shutdownPromise;
            const shutdownEnd = performance.now();
            const shutdownTime = shutdownEnd - shutdownStart;
            
            console.log(`Shutdown time: ${shutdownTime.toFixed(2)}ms`);
            
            // Verify all sessions are cleaned up
            expect(webAppManager.getActiveSessions()).toHaveLength(0);
            expect(shutdownTime).toBeLessThan(30000); // Should shutdown within 30 seconds
            
            // Reinitialize for other tests
            webAppManager = new WebAppManager();
            await new Promise((resolve) => {
                if (webAppManager.isInitialized) {
                    resolve();
                } else {
                    webAppManager.once('ready', resolve);
                }
            });
            
        }, 60000);
    });

    describe('🔄 Recovery Load Tests', () => {
        test('should recover from Tor service interruption', async () => {
            // Create a session
            const sessionId = `load-test-recovery-${Date.now()}`;
            await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
            testSessions.push(sessionId);
            
            // Verify initial functionality
            const initialNav = await webAppManager.navigateToUrl(sessionId, 'https://check.torproject.org');
            expect(initialNav.success).toBe(true);
            
            // Restart Tor service
            console.log('Restarting Tor service...');
            const restartStart = performance.now();
            await torManager.restart();
            const restartEnd = performance.now();
            const restartTime = restartEnd - restartStart;
            
            console.log(`Tor restart time: ${restartTime.toFixed(2)}ms`);
            
            // Wait for Tor to be ready
            await torManager.waitForConnection();
            
            // Verify recovery
            const recoveryNav = await webAppManager.navigateToUrl(sessionId, 'https://check.torproject.org');
            expect(recoveryNav.success).toBe(true);
            
            // Restart should complete within 2 minutes
            expect(restartTime).toBeLessThan(120000);
            
        }, 180000);

        test('should handle browser process crashes gracefully', async () => {
            const sessionCount = 3;
            const sessionIds = [];
            
            // Create multiple sessions
            for (let i = 0; i < sessionCount; i++) {
                const sessionId = `load-test-crash-${Date.now()}-${i}`;
                await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                sessionIds.push(sessionId);
                testSessions.push(sessionId);
            }
            
            expect(webAppManager.getActiveSessions()).toHaveLength(sessionCount);
            
            // Simulate browser crashes by closing browsers manually
            for (const sessionId of sessionIds) {
                const session = webAppManager.sessions.get(sessionId);
                if (session && session.browser) {
                    await session.browser.close();
                }
            }
            
            // Run monitoring to detect crashes
            const monitorStart = performance.now();
            await webAppManager.monitorSessions();
            const monitorEnd = performance.now();
            const monitorTime = monitorEnd - monitorStart;
            
            console.log(`Monitor cleanup time: ${monitorTime.toFixed(2)}ms`);
            
            // All sessions should be cleaned up
            expect(webAppManager.getActiveSessions()).toHaveLength(0);
            expect(monitorTime).toBeLessThan(10000); // Should detect and cleanup within 10 seconds
            
            // Clear from cleanup list since they're already handled
            testSessions.length = 0;
            
        }, 60000);
    });

    describe('📈 Scalability Tests', () => {
        test('should maintain response times under increasing load', async () => {
            const loadLevels = [1, 2, 3, 5]; // Increasing concurrent sessions
            const responseTimesByLoad = {};
            
            for (const loadLevel of loadLevels) {
                console.log(`Testing with ${loadLevel} concurrent sessions...`);
                
                const sessionIds = [];
                const responseTimes = [];
                
                // Create sessions for this load level
                for (let i = 0; i < loadLevel; i++) {
                    const sessionId = `load-test-scalability-${loadLevel}-${Date.now()}-${i}`;
                    
                    const startTime = performance.now();
                    await webAppManager.startBrowserSession(sessionId, { userAgent: 'desktop' });
                    const endTime = performance.now();
                    
                    responseTimes.push(endTime - startTime);
                    sessionIds.push(sessionId);
                    testSessions.push(sessionId);
                }
                
                // Calculate average response time for this load level
                const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                responseTimesByLoad[loadLevel] = avgResponseTime;
                
                console.log(`Load level ${loadLevel}: Average response time ${avgResponseTime.toFixed(2)}ms`);
                
                // Clean up sessions for this load level
                for (const sessionId of sessionIds) {
                    await webAppManager.stopSession(sessionId);
                    const index = testSessions.indexOf(sessionId);
                    testSessions.splice(index, 1);
                }
                
                // Wait between load levels
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // Analyze scalability
            const baselineResponseTime = responseTimesByLoad[1];
            const maxLoadResponseTime = responseTimesByLoad[Math.max(...loadLevels)];
            const responseTimeDegradation = (maxLoadResponseTime / baselineResponseTime) - 1;
            
            console.log(`Response time degradation: ${(responseTimeDegradation * 100).toFixed(2)}%`);
            
            // Response time should not degrade more than 200% under max load
            expect(responseTimeDegradation).toBeLessThan(2.0);
            
        }, 300000);
    });
});
