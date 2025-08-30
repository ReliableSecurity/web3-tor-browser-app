const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TorBrowserManager {
    constructor() {
        this.sessions = new Map();
        this.basePort = 5900; // Базовый порт для VNC
        this.displayBase = 10; // Базовый номер дисплея
        console.log('🧅 Tor браузер менеджер инициализирован');
    }

    // Запуск Tor браузера в Docker контейнере
    async startBrowser(sessionId, options = {}) {
        try {
            console.log(`🚀 Запуск Tor браузера для сессии ${sessionId}`);

            // Проверка, что сессия еще не существует
            if (this.sessions.has(sessionId)) {
                throw new Error('Сессия уже существует');
            }

            // Генерация уникальных портов и дисплея
            const displayNumber = this.displayBase + this.sessions.size;
            const vncPort = this.basePort + this.sessions.size;
            const webPort = 6080 + this.sessions.size;

            // Создание временной директории для сессии
            const sessionDir = path.join('/tmp', `tor-session-${sessionId}`);
            await fs.mkdir(sessionDir, { recursive: true });

            // Определяем разрешение на основе типа устройства
            const userAgent = options.userAgent || 'desktop';
            let geometry;
            
            switch (userAgent) {
                case 'mobile':
                    geometry = '390x844';
                    break;
                case 'tablet':
                    geometry = '768x1024';
                    break;
                default:
                    geometry = '1920x1080';
                    break;
            }
            
            // Создание Docker команды
            const dockerImage = 'tor-browser-app';
            const containerName = `tor-browser-${sessionId}`;

            const dockerCommand = [
                'run',
                '--rm',
                '--name', containerName,
                '--shm-size=2g',
                '-e', `DISPLAY=:${displayNumber}`,
                '-e', `VNC_PORT=${vncPort}`,
                '-e', `WEB_PORT=${webPort}`,
                '-e', 'VNC_PASSWORD=toruser123',
                '-e', `GEOMETRY=${geometry}`,
                '-e', `USER_AGENT=${userAgent}`,
                '-p', `${vncPort}:${vncPort}`,
                '-p', `${webPort}:${webPort}`,
                '-v', `${sessionDir}:/home/toruser/Downloads`,
                '--cap-add=SYS_ADMIN',
                '--security-opt', 'seccomp=unconfined',
                // Ограничение ресурсов для безопасности
                '--memory=2g',
                '--cpus=1.0',
                '--read-only',
                '--tmpfs=/tmp:rw,noexec,nosuid,size=100m',
                '-d',
                dockerImage
            ];

            // Запуск Docker контейнера
            const dockerProcess = await this.executeCommand('docker', dockerCommand);

            // Ожидание запуска контейнера
            await this.waitForContainer(containerName);

            // Сохранение информации о сессии
            const sessionData = {
                sessionId,
                containerName,
                displayNumber,
                vncPort,
                webPort,
                sessionDir,
                status: 'starting',
                createdAt: new Date(),
                dockerProcess
            };

            this.sessions.set(sessionId, sessionData);

            // Ожидание полного запуска Tor браузера
            await this.waitForTorBrowser(sessionData);

            sessionData.status = 'running';

            console.log(`✅ Tor браузер запущен для сессии ${sessionId}`);

            return {
                sessionId,
                display: displayNumber,
                vncPort,
                webPort,
                status: 'running'
            };

        } catch (error) {
            console.error(`❌ Ошибка запуска Tor браузера для сессии ${sessionId}:`, error);
            
            // Очистка в случае ошибки
            await this.cleanup(sessionId);
            
            throw error;
        }
    }

    // Остановка Tor браузера
    async stopBrowser(sessionId) {
        try {
            console.log(`⏹️ Остановка Tor браузера для сессии ${sessionId}`);

            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('Сессия не найдена');
            }

            // Остановка Docker контейнера
            await this.executeCommand('docker', ['stop', sessionData.containerName]);
            await this.executeCommand('docker', ['rm', '-f', sessionData.containerName]);

            // Очистка временных файлов
            await this.cleanup(sessionId);

            // Удаление сессии
            this.sessions.delete(sessionId);

            console.log(`✅ Tor браузер остановлен для сессии ${sessionId}`);

            return {
                success: true,
                message: 'Браузер успешно остановлен'
            };

        } catch (error) {
            console.error(`❌ Ошибка остановки Tor браузера для сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Выполнение действий в браузере
    async executeAction(sessionId, action, payload = {}) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (!sessionData) {
                throw new Error('Сессия не найдена');
            }

            switch (action) {
                case 'navigate':
                    return await this.navigateToUrl(sessionData, payload.url);
                
                case 'screenshot':
                    return await this.takeScreenshot(sessionData);
                
                case 'get_title':
                    return await this.getPageTitle(sessionData);
                
                case 'click':
                    return await this.clickElement(sessionData, payload.x, payload.y);
                
                case 'type':
                    return await this.typeText(sessionData, payload.text);
                
                case 'scroll':
                    return await this.scrollPage(sessionData, payload.direction);
                
                default:
                    throw new Error(`Неизвестное действие: ${action}`);
            }

        } catch (error) {
            console.error(`❌ Ошибка выполнения действия ${action} для сессии ${sessionId}:`, error);
            throw error;
        }
    }

    // Навигация к URL
    async navigateToUrl(sessionData, url) {
        const command = `xdotool search --onlyvisible --class "firefox" windowfocus && xdotool key ctrl+l && sleep 1 && xdotool type "${url}" && xdotool key Return`;
        
        await this.executeCommandInContainer(sessionData.containerName, command);
        
        return {
            success: true,
            message: `Переход к ${url}`
        };
    }

    // Создание скриншота
    async takeScreenshot(sessionData) {
        const screenshotPath = `/tmp/screenshot_${sessionData.sessionId}.png`;
        const command = `DISPLAY=:${sessionData.displayNumber} import -window root ${screenshotPath}`;
        
        await this.executeCommandInContainer(sessionData.containerName, command);
        
        return {
            success: true,
            screenshotPath
        };
    }

    // Получение заголовка страницы
    async getPageTitle(sessionData) {
        const command = `xdotool search --onlyvisible --class "firefox" getwindowname`;
        
        const result = await this.executeCommandInContainer(sessionData.containerName, command);
        
        return {
            success: true,
            title: result.stdout.trim()
        };
    }

    // Клик по координатам
    async clickElement(sessionData, x, y) {
        const command = `xdotool mousemove ${x} ${y} && xdotool click 1`;
        
        await this.executeCommandInContainer(sessionData.containerName, command);
        
        return {
            success: true,
            message: `Клик по координатам ${x}, ${y}`
        };
    }

    // Ввод текста
    async typeText(sessionData, text) {
        const command = `xdotool type "${text}"`;
        
        await this.executeCommandInContainer(sessionData.containerName, command);
        
        return {
            success: true,
            message: `Введен текст: ${text.substring(0, 50)}...`
        };
    }

    // Прокрутка страницы
    async scrollPage(sessionData, direction = 'down') {
        let command;
        
        switch (direction) {
            case 'down':
                command = 'xdotool key Page_Down';
                break;
            case 'up':
                command = 'xdotool key Page_Up';
                break;
            case 'top':
                command = 'xdotool key ctrl+Home';
                break;
            case 'bottom':
                command = 'xdotool key ctrl+End';
                break;
            default:
                throw new Error('Неизвестное направление прокрутки');
        }
        
        await this.executeCommandInContainer(sessionData.containerName, command);
        
        return {
            success: true,
            message: `Прокрутка: ${direction}`
        };
    }

    // Выполнение команды в контейнере
    async executeCommandInContainer(containerName, command) {
        return await this.executeCommand('docker', ['exec', containerName, 'bash', '-c', command]);
    }

    // Ожидание запуска контейнера
    async waitForContainer(containerName, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const result = await this.executeCommand('docker', ['ps', '--filter', `name=${containerName}`, '--format', 'table {{.Names}}'b]);
                
                if (result.stdout.includes(containerName)) {
                    console.log(`✅ Контейнер ${containerName} запущен`);
                    return true;
                }
            } catch (error) {
                // Игнорируем ошибки проверки
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error(`Контейнер ${containerName} не запустился в течение ${maxAttempts * 2} секунд`);
    }

    // Ожидание запуска Tor браузера
    async waitForTorBrowser(sessionData, maxAttempts = 30) {
        console.log('⏳ Ожидание запуска Tor браузера...');
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const result = await this.executeCommandInContainer(
                    sessionData.containerName,
                    'pgrep firefox || pgrep tor-browser'
                );
                
                if (result.stdout.trim()) {
                    console.log('✅ Tor браузер запущен');
                    return true;
                }
            } catch (error) {
                // Игнорируем ошибки проверки
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        throw new Error('Tor браузер не запустился в течение ожидаемого времени');
    }

    // Выполнение системной команды
    executeCommand(command, args = []) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr, exitCode: code });
                } else {
                    reject(new Error(`Команда "${command} ${args.join(' ')}" завершилась с кодом ${code}. stderr: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    // Очистка ресурсов сессии
    async cleanup(sessionId) {
        try {
            const sessionData = this.sessions.get(sessionId);
            if (sessionData) {
                // Удаление временной директории
                if (sessionData.sessionDir) {
                    await fs.rmdir(sessionData.sessionDir, { recursive: true });
                }

                // Попытка остановить контейнер если он еще работает
                try {
                    await this.executeCommand('docker', ['rm', '-f', sessionData.containerName]);
                } catch (error) {
                    // Игнорируем ошибки если контейнер уже остановлен
                }
            }
        } catch (error) {
            console.error(`Ошибка очистки сессии ${sessionId}:`, error);
        }
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
                webPort: data.webPort
            });
        }
        return sessions;
    }

    // Получение информации о сессии
    getSessionInfo(sessionId) {
        return this.sessions.get(sessionId);
    }

    // Проверка доступности Docker
    async checkDockerAvailability() {
        try {
            await this.executeCommand('docker', ['--version']);
            return true;
        } catch (error) {
            console.error('Docker недоступен:', error);
            return false;
        }
    }

    // Сборка Docker образа
    async buildDockerImage() {
        try {
            console.log('🔨 Сборка Docker образа для Tor браузера...');
            
            const dockerfilePath = path.join(__dirname, '../docker');
            await this.executeCommand('docker', [
                'build',
                '-t', 'tor-browser-app',
                dockerfilePath
            ]);
            
            console.log('✅ Docker образ собран успешно');
            return true;
        } catch (error) {
            console.error('❌ Ошибка сборки Docker образа:', error);
            return false;
        }
    }

    // Очистка всех сессий при выключении
    async shutdown() {
        console.log('🛑 Остановка всех Tor браузер сессий...');
        
        const shutdownPromises = [];
        for (const sessionId of this.sessions.keys()) {
            shutdownPromises.push(this.stopBrowser(sessionId));
        }
        
        await Promise.allSettled(shutdownPromises);
        console.log('✅ Все сессии остановлены');
    }
}

module.exports = TorBrowserManager;
