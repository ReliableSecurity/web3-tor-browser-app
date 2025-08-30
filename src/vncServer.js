const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class VncServer {
    constructor() {
        this.sessions = new Map();
        console.log('🖥️ VNC сервер инициализирован');
    }

    // Запуск VNC сессии
    async startSession(sessionId, displayNumber) {
        try {
            console.log(`🚀 Запуск VNC сессии для ${sessionId} на дисплее :${displayNumber}`);

            if (this.sessions.has(sessionId)) {
                throw new Error('VNC сессия уже существует');
            }

            // Генерация порта для веб-интерфейса
            const webPort = 6080 + this.sessions.size;
            const vncPort = 5900 + displayNumber;

            // В Docker контейнере VNC уже настроен, просто возвращаем информацию
            const sessionData = {
                sessionId,
                displayNumber,
                vncPort,
                webPort,
                status: 'running',
                createdAt: new Date()
            };

            this.sessions.set(sessionId, sessionData);

            console.log(`✅ VNC сессия ${sessionId} запущена на порту ${webPort}`);

            return {
                sessionId,
                port: webPort,
                vncPort,
                displayNumber,
                webUrl: `http://localhost:${webPort}/vnc.html?autoconnect=true`
            };

        } catch (error) {
            console.error(`❌ Ошибка запуска VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Остановка VNC сессии
    async stopSession(sessionId) {
        try {
            console.log(`⏹️ Остановка VNC сессии ${sessionId}`);

            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            // В Docker контейнере VNC останавливается автоматически с контейнером
            this.sessions.delete(sessionId);

            console.log(`✅ VNC сессия ${sessionId} остановлена`);

            return {
                success: true,
                message: 'VNC сессия остановлена'
            };

        } catch (error) {
            console.error(`❌ Ошибка остановки VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Получение информации о сессии
    getSessionInfo(sessionId) {
        return this.sessions.get(sessionId);
    }

    // Получение списка активных сессий
    getActiveSessions() {
        const sessions = [];
        for (const [sessionId, data] of this.sessions.entries()) {
            sessions.push({
                sessionId,
                status: data.status,
                createdAt: data.createdAt,
                vncPort: data.vncPort,
                webPort: data.webPort,
                displayNumber: data.displayNumber
            });
        }
        return sessions;
    }

    // Создание конфигурации для noVNC
    generateNoVncConfig(sessionId, vncPort, password = 'toruser123') {
        const config = {
            host: 'localhost',
            port: vncPort,
            password: password,
            encrypt: false,
            true_color: true,
            cursor: true,
            shared: true,
            view_only: false,
            resize: 'remote'
        };

        return config;
    }

    // Проверка доступности VNC порта
    async checkPortAvailability(port) {
        return new Promise((resolve) => {
            const net = require('net');
            const server = net.createServer();
            
            server.listen(port, () => {
                server.once('close', () => {
                    resolve(true);
                });
                server.close();
            });
            
            server.on('error', () => {
                resolve(false);
            });
        });
    }

    // Генерация случайного порта
    async findAvailablePort(startPort = 6080) {
        for (let port = startPort; port < startPort + 100; port++) {
            const available = await this.checkPortAvailability(port);
            if (available) {
                return port;
            }
        }
        throw new Error('Не удалось найти доступный порт');
    }

    // Создание скриншота VNC сессии
    async takeScreenshot(sessionId) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            const screenshotPath = `/tmp/vnc_screenshot_${sessionId}_${Date.now()}.png`;
            
            // Команда для создания скриншота через VNC
            const command = `vncsnapshot -quality 90 localhost:${sessionData.displayNumber} ${screenshotPath}`;
            
            return new Promise((resolve, reject) => {
                const process = spawn('bash', ['-c', command]);
                
                process.on('close', (code) => {
                    if (code === 0) {
                        resolve({
                            success: true,
                            screenshotPath,
                            sessionId
                        });
                    } else {
                        reject(new Error(`Ошибка создания скриншота: код ${code}`));
                    }
                });
                
                process.on('error', reject);
            });

        } catch (error) {
            console.error(`❌ Ошибка создания скриншота VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Отправка VNC команды
    async sendVncCommand(sessionId, command) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            // Реализация отправки команд через VNC протокол
            // Это упрощенная версия - в реальном проекте нужна полная реализация VNC клиента
            
            return {
                success: true,
                message: `Команда ${command} отправлена в сессию ${sessionId}`
            };

        } catch (error) {
            console.error(`❌ Ошибка отправки VNC команды ${sessionId}:`, error);
            throw error;
        }
    }

    // Получение статистики VNC сессии
    async getSessionStats(sessionId) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            const uptime = Date.now() - sessionData.createdAt.getTime();
            
            return {
                sessionId,
                uptime: Math.floor(uptime / 1000), // в секундах
                status: sessionData.status,
                displayNumber: sessionData.displayNumber,
                vncPort: sessionData.vncPort,
                webPort: sessionData.webPort,
                createdAt: sessionData.createdAt
            };

        } catch (error) {
            console.error(`❌ Ошибка получения статистики VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Изменение пароля VNC сессии
    async changeSessionPassword(sessionId, newPassword) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            // В реальной реализации здесь нужно изменить пароль VNC сервера
            sessionData.password = newPassword;
            
            return {
                success: true,
                message: 'Пароль VNC сессии изменен'
            };

        } catch (error) {
            console.error(`❌ Ошибка изменения пароля VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Настройка качества видео
    async setVideoQuality(sessionId, quality = 'medium') {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            const qualitySettings = {
                low: { quality: 30, compress: 9 },
                medium: { quality: 60, compress: 6 },
                high: { quality: 90, compress: 3 }
            };

            const settings = qualitySettings[quality] || qualitySettings.medium;
            sessionData.videoQuality = settings;
            
            return {
                success: true,
                quality: settings,
                message: `Качество видео установлено: ${quality}`
            };

        } catch (error) {
            console.error(`❌ Ошибка настройки качества видео VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Получение логов VNC сессии
    async getSessionLogs(sessionId, lines = 100) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('VNC сессия не найдена');
            }

            // В реальной реализации здесь нужно читать логи VNC сервера
            const logs = [
                `[${new Date().toISOString()}] VNC сессия ${sessionId} запущена`,
                `[${new Date().toISOString()}] Дисплей :${sessionData.displayNumber}`,
                `[${new Date().toISOString()}] VNC порт: ${sessionData.vncPort}`,
                `[${new Date().toISOString()}] Веб порт: ${sessionData.webPort}`,
                `[${new Date().toISOString()}] Статус: ${sessionData.status}`
            ];
            
            return {
                success: true,
                logs: logs.slice(-lines),
                sessionId
            };

        } catch (error) {
            console.error(`❌ Ошибка получения логов VNC сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Очистка всех сессий
    async cleanup() {
        console.log('🧹 Очистка всех VNC сессий...');
        
        const cleanupPromises = [];
        for (const sessionId of this.sessions.keys()) {
            cleanupPromises.push(this.stopSession(sessionId));
        }
        
        await Promise.allSettled(cleanupPromises);
        console.log('✅ Все VNC сессии очищены');
    }

    // Мониторинг активности сессий
    startMonitoring() {
        console.log('📊 Запуск мониторинга VNC сессий...');
        
        setInterval(() => {
            const activeSessions = this.getActiveSessions();
            console.log(`📈 Активных VNC сессий: ${activeSessions.length}`);
            
            // Проверка "зависших" сессий
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 часа
            
            for (const session of activeSessions) {
                const age = now - session.createdAt.getTime();
                if (age > maxAge) {
                    console.log(`⚠️ Обнаружена старая сессия ${session.sessionId}, возраст: ${Math.floor(age / 1000 / 60)} мин`);
                }
            }
        }, 5 * 60 * 1000); // Проверка каждые 5 минут
    }

    // Остановка мониторинга
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            console.log('📊 Мониторинг VNC сессий остановлен');
        }
    }
}

module.exports = VncServer;
