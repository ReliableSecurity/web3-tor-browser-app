const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const net = require('net');
const EventEmitter = require('events');
const axios = require('axios');

class TorManager extends EventEmitter {
    constructor() {
        super();
        this.torProcess = null;
        this.torPort = parseInt(process.env.TOR_SOCKS_PORT) || 9050;
        this.controlPort = parseInt(process.env.TOR_CONTROL_PORT) || 9051;
        this.controlPassword = process.env.TOR_CONTROL_PASSWORD || 'torcontrol123';
        this.isRunning = false;
        this.circuits = new Map();
        this.connectionAttempts = 0;
        this.maxAttempts = 5;
        this.healthCheckInterval = null;
        
        console.log('🧅 Tor Manager инициализирован');
    }

    // Инициализация Tor сервиса
    async initialize() {
        try {
            console.log('🔄 Инициализация Tor сервиса...');
            
            // Проверяем, установлен ли Tor
            await this.checkTorInstallation();
            
            // Создаем конфигурационные файлы
            await this.createTorConfig();
            
            // Запускаем Tor
            await this.startTor();
            
            // Ожидаем подключения к сети Tor
            await this.waitForConnection();
            
            // Проверяем соединение
            await this.verifyTorConnection();
            
            // Настраиваем мониторинг
            this.setupHealthMonitoring();
            
            console.log('✅ Tor сервис успешно запущен и готов к работе');
            this.emit('ready');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Tor:', error);
            throw error;
        }
    }

    // Проверка установки Tor
    async checkTorInstallation() {
        return new Promise((resolve, reject) => {
            exec('tor --version', (error, stdout, stderr) => {
                if (error) {
                    reject(new Error('Tor не установлен. Установите Tor: apt-get install tor'));
                } else {
                    const version = stdout.split('\n')[0];
                    console.log(`✅ Найден ${version}`);
                    resolve(version);
                }
            });
        });
    }

    // Создание конфигурации Tor
    async createTorConfig() {
        const configDir = '/tmp/tor-config';
        const configFile = path.join(configDir, 'torrc');
        
        try {
            await fs.mkdir(configDir, { recursive: true });
            
            const torConfig = `
# Tor Configuration for Web3 Tor Browser
# Generated automatically - do not edit manually

# Network settings
SOCKSPort ${this.torPort}
ControlPort ${this.controlPort}
HashedControlPassword 16:$(echo -n "${this.controlPassword}" | tor --hash-password -)

# Security settings
ExitRelay 0
DataDirectory ${configDir}/data
GeoIPFile /usr/share/tor/geoip
GeoIPv6File /usr/share/tor/geoip6

# Circuit settings
NewCircuitPeriod 120
MaxCircuitDirtiness 300
EnforceDistinctSubnets 1
NumEntryGuards 3

# Performance settings
AvoidDiskWrites 1
DisableDebuggerAttachment 1
SafeLogging 0
LogTimeGranularity 1

# Bridge and obfuscation support
UseBridges 0
ClientTransportPlugin obfs4 exec /usr/bin/obfs4proxy

# Hidden service settings
HiddenServiceSingleHopMode 0
HiddenServiceNonAnonymousMode 0

# Connection limits
ConnectionPadding 1
ReducedConnectionPadding 0
MaxClientCircuitsPending 32
MaxMemInQueues 512MB

# Bandwidth settings
RelayBandwidthRate 0
RelayBandwidthBurst 0
MaxAdvertisedBandwidth 1GB

# Exit policy
ExitPolicy reject *:*

# Directory authorities
DirReqStatistics 0
DirPortFrontPage /usr/share/tor/tor-exit-notice.html

# Additional security
DisableAllSwap 1
HardwareAccel 1
SafeSocks 1
TestSocks 1
WarnUnsafeSocks 1

# Logging
Log notice file ${configDir}/tor.log
Log info file ${configDir}/debug.log
            `;

            await fs.writeFile(configFile, torConfig);
            console.log(`✅ Конфигурация Tor создана: ${configFile}`);
            return configFile;
            
        } catch (error) {
            console.error('❌ Ошибка создания конфигурации Tor:', error);
            throw error;
        }
    }

    // Запуск Tor процесса
    async startTor() {
        if (this.torProcess) {
            console.log('⚠️ Tor уже запущен');
            return;
        }

        return new Promise((resolve, reject) => {
            const configFile = '/tmp/tor-config/torrc';
            
            console.log('🚀 Запуск Tor процесса...');
            
            this.torProcess = spawn('tor', ['-f', configFile], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            let output = '';
            let errorOutput = '';

            this.torProcess.stdout.on('data', (data) => {
                output += data.toString();
                const lines = data.toString().split('\n');
                
                lines.forEach(line => {
                    if (line.includes('Bootstrapped 100%')) {
                        console.log('✅ Tor подключен к сети (100%)');
                        this.isRunning = true;
                        resolve();
                    } else if (line.includes('Bootstrapped')) {
                        const match = line.match(/Bootstrapped (\d+)%/);
                        if (match) {
                            console.log(`🔄 Подключение к Tor: ${match[1]}%`);
                        }
                    }
                });
            });

            this.torProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.error('Tor stderr:', data.toString());
            });

            this.torProcess.on('exit', (code, signal) => {
                console.log(`Tor процесс завершен с кодом: ${code}, сигнал: ${signal}`);
                this.isRunning = false;
                this.torProcess = null;
                this.emit('exit', { code, signal });
                
                // Автоматический перезапуск при неожиданном завершении
                if (code !== 0 && this.connectionAttempts < this.maxAttempts) {
                    console.log('🔄 Попытка автоматического перезапуска Tor...');
                    setTimeout(() => this.restart(), 5000);
                }
            });

            this.torProcess.on('error', (error) => {
                console.error('❌ Ошибка Tor процесса:', error);
                reject(error);
            });

            // Таймаут для запуска
            setTimeout(() => {
                if (!this.isRunning) {
                    reject(new Error('Таймаут запуска Tor (60 секунд)'));
                }
            }, 60000);
        });
    }

    // Ожидание подключения к Tor сети
    async waitForConnection(timeout = 60000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                if (await this.checkPortOpen(this.torPort)) {
                    console.log(`✅ SOCKS порт ${this.torPort} открыт`);
                    return true;
                }
            } catch (error) {
                // Игнорируем ошибки проверки
            }
            
            await this.sleep(2000);
        }
        
        throw new Error('Таймаут ожидания подключения к Tor');
    }

    // Проверка открытия порта
    checkPortOpen(port) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            
            socket.setTimeout(2000);
            
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            
            socket.on('error', () => {
                resolve(false);
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            
            socket.connect(port, '127.0.0.1');
        });
    }

    // Верификация подключения к Tor сети
    async verifyTorConnection() {
        try {
            console.log('🔍 Проверка подключения к сети Tor...');
            
            // Создаем HTTP агент с SOCKS прокси
            const { SocksProxyAgent } = require('socks-proxy-agent');
            const agent = new SocksProxyAgent(`socks5://127.0.0.1:${this.torPort}`);
            
            // Проверяем подключение к check.torproject.org
            const response = await axios.get('https://check.torproject.org/api/ip', {
                httpAgent: agent,
                httpsAgent: agent,
                timeout: 30000
            });
            
            if (response.data.IsTor) {
                console.log('✅ Успешно подключены к сети Tor');
                console.log(`🌐 Tor IP: ${response.data.IP}`);
                this.emit('connected', response.data);
                return response.data;
            } else {
                throw new Error('Трафик не проходит через Tor');
            }
            
        } catch (error) {
            console.error('❌ Ошибка проверки Tor подключения:', error.message);
            throw error;
        }
    }

    // Настройка мониторинга здоровья
    setupHealthMonitoring() {
        // Проверка каждые 30 секунд
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.healthCheck();
            } catch (error) {
                console.error('⚠️ Проблема со здоровьем Tor:', error.message);
                this.emit('healthIssue', error);
            }
        }, 30000);
        
        console.log('📊 Мониторинг здоровья Tor настроен');
    }

    // Проверка здоровья Tor сервиса
    async healthCheck() {
        // Проверяем процесс
        if (!this.torProcess || this.torProcess.killed) {
            throw new Error('Tor процесс не запущен');
        }
        
        // Проверяем порты
        if (!await this.checkPortOpen(this.torPort)) {
            throw new Error(`SOCKS порт ${this.torPort} недоступен`);
        }
        
        // Проверяем подключение раз в 5 минут
        if (Math.random() < 0.1) { // 10% вероятность
            await this.verifyTorConnection();
        }
        
        this.emit('healthy');
        return true;
    }

    // Получение нового IP (новая цепочка)
    async newIdentity() {
        try {
            console.log('🔄 Получение новой Tor цепочки...');
            
            // Подключаемся к control порту
            await this.sendControlCommand('SIGNAL NEWNYM');
            
            // Ждем обновления цепочки
            await this.sleep(3000);
            
            // Проверяем новый IP
            const connectionInfo = await this.verifyTorConnection();
            
            console.log(`✅ Новая Tor цепочка получена, IP: ${connectionInfo.IP}`);
            this.emit('newIdentity', connectionInfo);
            
            return connectionInfo;
            
        } catch (error) {
            console.error('❌ Ошибка получения новой цепочки:', error);
            throw error;
        }
    }

    // Отправка команды через control порт
    async sendControlCommand(command) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            
            socket.connect(this.controlPort, '127.0.0.1', () => {
                // Аутентификация
                socket.write(`AUTHENTICATE "${this.controlPassword}"\r\n`);
            });
            
            let response = '';
            let authenticated = false;
            
            socket.on('data', (data) => {
                response += data.toString();
                
                if (!authenticated && response.includes('250 OK')) {
                    authenticated = true;
                    response = '';
                    socket.write(`${command}\r\n`);
                } else if (authenticated && response.includes('250 OK')) {
                    socket.write('QUIT\r\n');
                    socket.end();
                    resolve(response);
                } else if (response.includes('515') || response.includes('551')) {
                    socket.end();
                    reject(new Error(`Control command failed: ${response}`));
                }
            });
            
            socket.on('error', (error) => {
                reject(error);
            });
            
            socket.on('timeout', () => {
                socket.end();
                reject(new Error('Control command timeout'));
            });
            
            socket.setTimeout(10000);
        });
    }

    // Получение информации о цепочках
    async getCircuitInfo() {
        try {
            const response = await this.sendControlCommand('GETINFO circuit-status');
            // Парсинг информации о цепочках
            return this.parseCircuitInfo(response);
        } catch (error) {
            console.error('❌ Ошибка получения информации о цепочках:', error);
            return [];
        }
    }

    // Парсинг информации о цепочках
    parseCircuitInfo(response) {
        const circuits = [];
        const lines = response.split('\n');
        
        lines.forEach(line => {
            if (line.startsWith('250') && line.includes('circuit-status=')) {
                const circuitData = line.split('circuit-status=')[1];
                if (circuitData) {
                    // Простой парсинг для демонстрации
                    circuits.push({
                        raw: circuitData,
                        timestamp: new Date()
                    });
                }
            }
        });
        
        return circuits;
    }

    // Перезапуск Tor сервиса
    async restart() {
        console.log('🔄 Перезапуск Tor сервиса...');
        
        try {
            this.connectionAttempts++;
            
            // Остановка текущего процесса
            await this.stop();
            
            // Ожидание
            await this.sleep(3000);
            
            // Повторный запуск
            await this.startTor();
            await this.waitForConnection();
            await this.verifyTorConnection();
            
            this.connectionAttempts = 0;
            console.log('✅ Tor сервис успешно перезапущен');
            this.emit('restarted');
            
        } catch (error) {
            console.error('❌ Ошибка перезапуска Tor:', error);
            
            if (this.connectionAttempts >= this.maxAttempts) {
                console.error('❌ Превышено максимальное количество попыток перезапуска');
                this.emit('failed');
                throw new Error('Не удается перезапустить Tor сервис');
            }
            
            // Повторная попытка через 10 секунд
            setTimeout(() => this.restart(), 10000);
        }
    }

    // Остановка Tor сервиса
    async stop() {
        console.log('🛑 Остановка Tor сервиса...');
        
        // Остановка мониторинга
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        // Остановка процесса
        if (this.torProcess) {
            this.torProcess.kill('SIGTERM');
            
            // Ожидаем корректного завершения
            await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.torProcess) {
                        this.torProcess.kill('SIGKILL');
                    }
                    resolve();
                }, 5000);
                
                if (this.torProcess) {
                    this.torProcess.on('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                } else {
                    clearTimeout(timeout);
                    resolve();
                }
            });
            
            this.torProcess = null;
        }
        
        this.isRunning = false;
        console.log('✅ Tor сервис остановлен');
        this.emit('stopped');
    }

    // Получение статуса
    getStatus() {
        return {
            isRunning: this.isRunning,
            torPort: this.torPort,
            controlPort: this.controlPort,
            processId: this.torProcess ? this.torProcess.pid : null,
            connectionAttempts: this.connectionAttempts,
            uptime: this.torProcess ? Date.now() - this.torProcess.spawnTime : 0
        };
    }

    // Получение прокси конфигурации для браузера
    getProxyConfig() {
        return {
            protocol: 'socks5',
            host: '127.0.0.1',
            port: this.torPort,
            url: `socks5://127.0.0.1:${this.torPort}`
        };
    }

    // Utility функция для паузы
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = TorManager;
