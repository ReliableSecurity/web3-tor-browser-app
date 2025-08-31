require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const TelegramBot = require('./telegramBot');
const Web3Service = require('./web3Service');
const EnhancedWeb3Service = require('./enhancedWeb3Service');
const WebAppManager = require('./webAppManager');
const SessionManager = require('./sessionManager');
const SecurityManager = require('./securityManager');
const MonitoringManager = require('./monitoringManager');
const PremiumManager = require('./premiumManager');
const AIManager = require('./aiManager');

class App {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.port = process.env.PORT || 3000;
        this.sessions = new Map(); // Хранение активных сессий браузера
        
        this.setupMiddleware();
        this.initializeServices();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../frontend')));
    }

    async initializeServices() {
        console.log('Инициализация сервисов...');
        
        try {
            // Инициализация Telegram бота
            this.telegramBot = new TelegramBot({
                onStartBrowser: this.handleStartBrowser.bind(this),
                onStopBrowser: this.handleStopBrowser.bind(this)
            });

            // Инициализация Web3 сервиса
            this.web3Service = new Web3Service();
            
            // Инициализация Session Manager
            this.sessionManager = new SessionManager();
            
            // Инициализация Web App менеджера
            this.webAppManager = new WebAppManager();
            
            // Интеграция SessionManager с WebAppManager
            this.setupSessionManagerIntegration();
            
            console.log('Все сервисы успешно инициализированы');
        } catch (error) {
            console.error('Ошибка инициализации сервисов:', error);
        }
    }

    setupSessionManagerIntegration() {
        // Обработка событий SessionManager
        this.sessionManager.on('cleanupRequested', async () => {
            await this.webAppManager.cleanupInactiveSessions();
        });
        
        this.sessionManager.on('forceCleanup', async ({ userId, sessionId }) => {
            try {
                await this.webAppManager.stopSession(sessionId);
            } catch (error) {
                console.error(`Ошибка принудительной очистки сессии ${sessionId}:`, error);
            }
        });
        
        console.log('🔗 SessionManager интегрирован с WebAppManager');
    }

    setupRoutes() {
        // Главная страница
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/index.html'));
        });

        // API для получения информации о сессии
        this.app.get('/api/session/:sessionId', (req, res) => {
            const sessionId = req.params.sessionId;
            const session = this.sessions.get(sessionId);
            
            if (!session) {
                return res.status(404).json({ error: 'Сессия не найдена' });
            }
            
            res.json(session);
        });

        // API для Web3 операций
        this.app.post('/api/web3/connect', async (req, res) => {
            try {
                const { address } = req.body;
                const result = await this.web3Service.connectWallet(address);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Telegram Web App
        this.app.get('/webapp', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/webapp.html'));
        });

        // Web App API маршруты
        this.app.post('/api/webapp/start-session', async (req, res) => {
            try {
                const { deviceType, userId } = req.body;
                
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId обязателен'
                    });
                }
                
                const sessionId = `webapp_${userId}_${Date.now()}`;
                
                // Проверка лимитов через SessionManager
                this.sessionManager.createUserSession(userId, sessionId);
                
                // Запуск браузерной сессии
                const result = await this.webAppManager.startBrowserSession(sessionId, {
                    userAgent: deviceType || 'desktop'
                });
                
                // Добавление сессии в общий реестр
                this.sessions.set(sessionId, {
                    sessionId,
                    userId,
                    webAppSession: result,
                    createdAt: new Date(),
                    status: 'active',
                    type: 'webapp'
                });
                
                res.json({
                    success: true,
                    sessionId,
                    userId,
                    userInfo: this.sessionManager.getUserInfo(userId),
                    ...result
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.app.post('/api/webapp/navigate', async (req, res) => {
            try {
                const { sessionId, url } = req.body;
                const result = await this.webAppManager.navigateToUrl(sessionId, url);
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.app.post('/api/webapp/content', async (req, res) => {
            try {
                const { sessionId } = req.body;
                const result = await this.webAppManager.getPageContent(sessionId);
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.app.post('/api/webapp/screenshot', async (req, res) => {
            try {
                const { sessionId } = req.body;
                const result = await this.webAppManager.getScreenshot(sessionId);
                res.json(result);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.app.post('/api/webapp/end-session', async (req, res) => {
            try {
                const { sessionId, userId } = req.body;
                
                // Проверка принадлежности сессии
                if (userId && !this.sessionManager.isUserSession(userId, sessionId)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Нет доступа к данной сессии'
                    });
                }
                
                // Остановка браузерной сессии
                const result = await this.webAppManager.stopSession(sessionId);
                
                // Удаление из SessionManager и общего реестра
                this.sessionManager.removeUserSession(sessionId);
                this.sessions.delete(sessionId);
                
                res.json({
                    ...result,
                    userInfo: userId ? this.sessionManager.getUserInfo(userId) : null
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API статуса
        this.app.get('/api/status', (req, res) => {
            const sessionStats = this.sessionManager ? this.sessionManager.getStats() : {};
            
            res.json({
                telegram: !!this.telegramBot,
                web3: !!this.web3Service,
                webapp: !!this.webAppManager,
                sessionManager: !!this.sessionManager,
                activeSessions: this.webAppManager ? this.webAppManager.getActiveSessions().length : 0,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                sessionStats
            });
        });
        
        // API статистики сессий
        this.app.get('/api/sessions/stats', (req, res) => {
            res.json(this.sessionManager.getStats());
        });
        
        // API информации о пользователе
        this.app.get('/api/user/:userId/sessions', (req, res) => {
            const userId = req.params.userId;
            const userInfo = this.sessionManager.getUserInfo(userId);
            
            if (!userInfo) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            res.json(userInfo);
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Новое WebSocket соединение:', socket.id);

            socket.on('join-session', (sessionId) => {
                socket.join(sessionId);
                console.log(`Сокет ${socket.id} присоединился к сессии ${sessionId}`);
            });

            socket.on('webapp-action', async (data) => {
                const { sessionId, action, payload } = data;
                await this.handleWebAppAction(sessionId, action, payload);
            });

            socket.on('disconnect', () => {
                console.log('WebSocket соединение закрыто:', socket.id);
            });
        });
    }

    async handleStartBrowser(userId, options = {}) {
        try {
            console.log(`Запуск Web App сессии для пользователя ${userId}`);
            
            // Создание уникальной сессии
            const sessionId = `webapp_${userId}_${Date.now()}`;
            
            // Запуск Web App сессии через WebAppManager
            const webAppSession = await this.webAppManager.startBrowserSession(sessionId, {
                userAgent: options.userAgent || 'desktop'
            });
            
            // Сохранение информации о сессии
            const session = {
                sessionId,
                userId,
                webAppSession,
                createdAt: new Date(),
                status: 'active',
                type: 'webapp'
            };
            
            this.sessions.set(sessionId, session);
            
            // Web App URL для доступа
            const accessUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/webapp`;
            
            return {
                success: true,
                sessionId,
                accessUrl,
                type: 'webapp'
            };
            
        } catch (error) {
            console.error('Ошибка запуска Web App сессии:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async handleStopBrowser(userId, sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (!session || session.userId !== userId) {
                throw new Error('Сессия не найдена или нет доступа');
            }
            
            // Остановка Web App сессии
            if (session.type === 'webapp') {
                await this.webAppManager.stopSession(sessionId);
            }
            
            // Удаление сессии
            this.sessions.delete(sessionId);
            
            return {
                success: true,
                message: 'Web App сессия успешно остановлена'
            };
            
        } catch (error) {
            console.error('Ошибка остановки Web App сессии:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }


    // Обработка действий Web App через WebSocket (для будущих расширений)
    async handleWebAppAction(sessionId, action, payload) {
        try {
            const session = this.sessions.get(sessionId);
            
            if (!session || session.type !== 'webapp') {
                throw new Error('Сессия Web App не найдена');
            }
            
            let result;
            switch (action) {
                case 'navigate':
                    result = await this.webAppManager.navigateToUrl(sessionId, payload.url);
                    break;
                case 'screenshot':
                    result = await this.webAppManager.getScreenshot(sessionId);
                    break;
                case 'getContent':
                    result = await this.webAppManager.getPageContent(sessionId);
                    break;
                default:
                    throw new Error(`Неизвестное действие: ${action}`);
            }
            
            // Отправка результата обратно клиенту
            this.io.to(sessionId).emit('webapp-action-result', {
                action,
                result
            });
            
        } catch (error) {
            console.error('Ошибка выполнения действия Web App:', error);
            this.io.to(sessionId).emit('webapp-action-error', {
                action,
                error: error.message
            });
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🎆 Сервер запущен на порту ${this.port}`);
            console.log(`📱 Telegram бот активен`);
            console.log(`🌐 Web3 сервисы готовы`);
            console.log(`🧅 Web App менеджер готов`);
            console.log(`🖥️ Telegram Web App доступен на /webapp`);
        });
    }
}

// Запуск приложения
const app = new App();
app.start();

module.exports = App;
