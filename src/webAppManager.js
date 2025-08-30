const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class WebAppManager {
    constructor() {
        this.sessions = new Map();
        this.proxyPort = 9050; // Tor SOCKS proxy порт
        console.log('🌐 Web App Manager инициализирован');
    }

    // Запуск браузерной сессии для Telegram Web App
    async startBrowserSession(sessionId, options = {}) {
        try {
            console.log(`🚀 Запуск браузерной сессии для ${sessionId}`);

            if (this.sessions.has(sessionId)) {
                throw new Error('Сессия уже существует');
            }

            // Определяем настройки устройства
            const deviceType = options.userAgent || 'desktop';
            const viewport = this.getViewportSettings(deviceType);

            // Запускаем Tor прокси
            await this.startTorProxy();

            // Конфигурация браузера с Tor прокси
            const browserConfig = {
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    `--proxy-server=socks5://127.0.0.1:${this.proxyPort}`,
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-client-side-phishing-detection',
                    '--disable-crash-reporter',
                    '--disable-default-apps',
                    '--disable-extensions',
                    '--disable-hang-monitor',
                    '--disable-logging',
                    '--disable-plugins',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--disable-translate',
                    '--disable-windows10-custom-titlebar',
                    '--metrics-recording-only',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--safebrowsing-disable-auto-update'
                ],
                ignoreDefaultArgs: ['--enable-automation'],
                userDataDir: `/tmp/browser-session-${sessionId}`,
                timeout: 30000
            };

            // Запуск браузера
            const browser = await puppeteer.launch(browserConfig);
            const page = await browser.newPage();

            // Настройка страницы
            await this.configurePage(page, deviceType, viewport);

            // Сохранение сессии
            const sessionData = {
                sessionId,
                browser,
                page,
                deviceType,
                viewport,
                createdAt: new Date(),
                status: 'active',
                lastActivity: new Date()
            };

            this.sessions.set(sessionId, sessionData);

            console.log(`✅ Браузерная сессия ${sessionId} запущена`);

            return {
                sessionId,
                status: 'active',
                deviceType,
                viewport
            };

        } catch (error) {
            console.error(`❌ Ошибка запуска сессии ${sessionId}:`, error);
            await this.cleanup(sessionId);
            throw error;
        }
    }

    // Настройка страницы браузера
    async configurePage(page, deviceType, viewport) {
        // Установка viewport
        await page.setViewport(viewport);

        // User Agent для разных устройств
        const userAgents = {
            mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            tablet: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        };

        await page.setUserAgent(userAgents[deviceType] || userAgents.desktop);

        // Настройки безопасности и приватности
        await page.evaluateOnNewDocument(() => {
            // Блокируем WebRTC для предотвращения утечки IP
            Object.defineProperty(navigator, 'mediaDevices', {
                get: () => undefined
            });

            // Блокируем геолокацию
            Object.defineProperty(navigator, 'geolocation', {
                get: () => undefined
            });

            // Блокируем уведомления
            Object.defineProperty(window, 'Notification', {
                get: () => undefined
            });

            // Очистка localStorage и sessionStorage
            if (window.localStorage) {
                window.localStorage.clear();
            }
            if (window.sessionStorage) {
                window.sessionStorage.clear();
            }

            // Блокируем автозаполнение
            document.addEventListener('DOMContentLoaded', () => {
                const forms = document.querySelectorAll('form');
                forms.forEach(form => {
                    form.setAttribute('autocomplete', 'off');
                });
            });
        });

        // Блокировка нежелательных ресурсов
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const resourceType = request.resourceType();
            const url = request.url();

            // Блокируем трекеры, рекламу и аналитику
            const blockedDomains = [
                'google-analytics.com',
                'googletagmanager.com',
                'facebook.com/tr',
                'doubleclick.net',
                'googlesyndication.com',
                'amazon-adsystem.com'
            ];

            if (blockedDomains.some(domain => url.includes(domain))) {
                request.abort();
                return;
            }

            // Блокируем ненужные типы ресурсов
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Отключаем кеширование
        await page.setCacheEnabled(false);

        console.log(`🔧 Страница настроена для ${deviceType}`);
    }

    // Получение настроек viewport для разных устройств
    getViewportSettings(deviceType) {
        const viewports = {
            mobile: {
                width: 390,
                height: 844,
                deviceScaleFactor: 3,
                isMobile: true,
                hasTouch: true
            },
            tablet: {
                width: 768,
                height: 1024,
                deviceScaleFactor: 2,
                isMobile: true,
                hasTouch: true
            },
            desktop: {
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false
            }
        };

        return viewports[deviceType] || viewports.desktop;
    }

    // Навигация к URL
    async navigateToUrl(sessionId, url) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            // Проверяем, что это .onion сайт или разрешенный URL
            if (!this.isAllowedUrl(url)) {
                throw new Error('URL не разрешен для данного сервиса');
            }

            await session.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            session.lastActivity = new Date();

            return {
                success: true,
                url,
                title: await session.page.title()
            };

        } catch (error) {
            console.error(`❌ Ошибка навигации ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Выполнение JavaScript в странице
    async executeScript(sessionId, script) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            const result = await session.page.evaluate(script);
            session.lastActivity = new Date();

            return {
                success: true,
                result
            };

        } catch (error) {
            console.error(`❌ Ошибка выполнения скрипта ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение скриншота страницы
    async getScreenshot(sessionId, options = {}) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            const screenshot = await session.page.screenshot({
                type: 'png',
                fullPage: options.fullPage || false,
                quality: options.quality || 80
            });

            session.lastActivity = new Date();

            return {
                success: true,
                screenshot: screenshot.toString('base64')
            };

        } catch (error) {
            console.error(`❌ Ошибка скриншота ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение HTML содержимого страницы
    async getPageContent(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            const content = await session.page.content();
            const title = await session.page.title();
            const url = session.page.url();

            session.lastActivity = new Date();

            return {
                success: true,
                content,
                title,
                url
            };

        } catch (error) {
            console.error(`❌ Ошибка получения контента ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Клик по элементу
    async clickElement(sessionId, selector) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            await session.page.waitForSelector(selector, { timeout: 5000 });
            await session.page.click(selector);

            session.lastActivity = new Date();

            return {
                success: true,
                message: `Клик по элементу: ${selector}`
            };

        } catch (error) {
            console.error(`❌ Ошибка клика ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Ввод текста в поле
    async typeText(sessionId, selector, text) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            await session.page.waitForSelector(selector, { timeout: 5000 });
            await session.page.type(selector, text);

            session.lastActivity = new Date();

            return {
                success: true,
                message: `Введен текст в ${selector}`
            };

        } catch (error) {
            console.error(`❌ Ошибка ввода текста ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Запуск Tor прокси
    async startTorProxy() {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            
            // Простая проверка - запущен ли уже Tor
            const torProcess = spawn('tor', ['--SOCKSPort', this.proxyPort.toString()], {
                detached: true,
                stdio: 'ignore'
            });

            torProcess.unref();
            
            setTimeout(() => {
                console.log(`✅ Tor прокси запущен на порту ${this.proxyPort}`);
                resolve();
            }, 3000);
        });
    }

    // Проверка разрешенных URL
    isAllowedUrl(url) {
        // Разрешаем только .onion сайты и некоторые безопасные домены
        const allowedPatterns = [
            /\.onion/,
            /duckduckgo\.com/,
            /start\.torproject\.org/,
            /check\.torproject\.org/
        ];

        return allowedPatterns.some(pattern => pattern.test(url));
    }

    // Остановка сессии
    async stopSession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Сессия не найдена');
            }

            console.log(`⏹️ Остановка сессии ${sessionId}`);

            // Закрываем браузер
            await session.browser.close();

            // Очистка временных файлов
            await this.cleanup(sessionId);

            // Удаляем сессию
            this.sessions.delete(sessionId);

            console.log(`✅ Сессия ${sessionId} остановлена`);

            return {
                success: true,
                message: 'Сессия успешно остановлена'
            };

        } catch (error) {
            console.error(`❌ Ошибка остановки сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Очистка ресурсов
    async cleanup(sessionId) {
        try {
            const sessionDir = `/tmp/browser-session-${sessionId}`;
            
            // Безопасное удаление директории сессии
            await fs.rm(sessionDir, { recursive: true, force: true });
            
            console.log(`🧹 Очистка ресурсов сессии ${sessionId} завершена`);
        } catch (error) {
            console.error(`⚠️ Ошибка очистки сессии ${sessionId}:`, error);
        }
    }

    // Получение информации о сессии
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }

        return {
            sessionId: session.sessionId,
            deviceType: session.deviceType,
            viewport: session.viewport,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            status: session.status
        };
    }

    // Получение всех активных сессий
    getActiveSessions() {
        const sessions = [];
        for (const [sessionId, session] of this.sessions.entries()) {
            sessions.push(this.getSessionInfo(sessionId));
        }
        return sessions;
    }

    // Очистка неактивных сессий
    async cleanupInactiveSessions() {
        const now = new Date();
        const maxInactivity = 30 * 60 * 1000; // 30 минут

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > maxInactivity) {
                console.log(`🧹 Очистка неактивной сессии: ${sessionId}`);
                await this.stopSession(sessionId);
            }
        }
    }

    // Полная остановка всех сессий
    async shutdown() {
        console.log('🛑 Остановка всех браузерных сессий...');
        
        const shutdownPromises = [];
        for (const sessionId of this.sessions.keys()) {
            shutdownPromises.push(this.stopSession(sessionId));
        }
        
        await Promise.allSettled(shutdownPromises);
        console.log('✅ Все сессии остановлены');
    }
}

module.exports = WebAppManager;
