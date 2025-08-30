#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const Web3Service = require('./src/web3Service');
const WebAppManager = require('./src/webAppManager');

class TestApp {
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
        this.sessions = new Map();
        
        this.setupMiddleware();
        this.initializeServices();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'frontend')));
    }

    async initializeServices() {
        console.log('🔧 Инициализация сервисов...');
        
        try {
            // Web3 сервис
            this.web3Service = new Web3Service();
            console.log('✅ Web3 сервис готов');
            
            // Web App менеджер
            this.webAppManager = new WebAppManager();  
            console.log('✅ Web App менеджер готов');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации сервисов:', error);
        }
    }

    setupRoutes() {
        // Главная страница
        this.app.get('/', (req, res) => {
            res.send(`
                <h1>🧅 Web3 Tor Browser App - Test Server</h1>
                <p>Сервер работает успешно!</p>
                <ul>
                    <li><a href="/webapp">📱 Telegram Web App</a></li>
                    <li><a href="/api/status">📊 API Status</a></li>
                    <li><a href="/index.html">🌐 Original Frontend</a></li>
                </ul>
                <p><strong>Telegram Bot отключен для тестирования</strong></p>
            `);
        });

        // Telegram Web App
        this.app.get('/webapp', (req, res) => {
            res.sendFile(path.join(__dirname, 'frontend/webapp.html'));
        });

        // API статуса
        this.app.get('/api/status', (req, res) => {
            res.json({
                telegram: false, // отключен для тестов
                web3: !!this.web3Service,
                webapp: !!this.webAppManager,
                activeSessions: this.webAppManager ? this.webAppManager.getActiveSessions().length : 0,
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                test_mode: true
            });
        });

        // Web App API маршруты (симуляция)
        this.app.post('/api/webapp/start-session', async (req, res) => {
            try {
                const { deviceType, userId } = req.body;
                console.log(`🧪 Симуляция запуска сессии для пользователя ${userId}, тип устройства: ${deviceType}`);
                
                res.json({
                    success: true,
                    sessionId: `test_${userId}_${Date.now()}`,
                    deviceType,
                    viewport: this.webAppManager.getViewportSettings(deviceType),
                    message: 'Тестовая сессия создана (Tor отключен)'
                });
                
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.app.post('/api/webapp/navigate', async (req, res) => {
            const { sessionId, url } = req.body;
            console.log(`🧪 Симуляция навигации к ${url} для сессии ${sessionId}`);
            
            res.json({
                success: true,
                url,
                title: 'Test Page',
                message: 'Навигация в тестовом режиме'
            });
        });

        this.app.post('/api/webapp/content', async (req, res) => {
            const { sessionId } = req.body;
            
            res.json({
                success: true,
                content: '<html><body><h1>Тестовое содержимое</h1><p>Tor браузер в тестовом режиме</p></body></html>',
                title: 'Test Page',
                url: 'test://localhost'
            });
        });

        this.app.post('/api/webapp/screenshot', async (req, res) => {
            res.json({
                success: true,
                screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                message: 'Тестовый скриншот'
            });
        });

        this.app.post('/api/webapp/end-session', async (req, res) => {
            const { sessionId } = req.body;
            console.log(`🧪 Симуляция остановки сессии ${sessionId}`);
            
            res.json({
                success: true,
                message: 'Тестовая сессия остановлена'
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('🔌 WebSocket подключение:', socket.id);
            
            socket.on('join-session', (sessionId) => {
                socket.join(sessionId);
                console.log(`Socket ${socket.id} присоединился к сессии ${sessionId}`);
            });

            socket.on('webapp-action', async (data) => {
                console.log('🎮 Web App действие:', data);
                socket.emit('webapp-action-result', {
                    action: data.action,
                    result: { success: true, message: 'Тестовое действие выполнено' }
                });
            });

            socket.on('disconnect', () => {
                console.log('❌ WebSocket отключение:', socket.id);
            });
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log('');
            console.log('🎆 Тестовый сервер запущен!');
            console.log('');
            console.log(`🌐 URL: http://localhost:${this.port}`);
            console.log(`📱 Web App: http://localhost:${this.port}/webapp`);
            console.log(`📊 API Status: http://localhost:${this.port}/api/status`);
            console.log('');
            console.log('ℹ️  Telegram Bot отключен для тестирования');
            console.log('ℹ️  Tor браузер работает в режиме симуляции');
            console.log('');
            console.log('Нажмите Ctrl+C для остановки');
        });
    }
}

const app = new TestApp();
app.start();
