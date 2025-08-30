const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
    constructor(callbacks) {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        if (!this.token) {
            throw new Error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
        }
        
        this.bot = new TelegramBot(this.token, { polling: true });
        this.callbacks = callbacks;
        this.userSessions = new Map(); // Хранение активных сессий пользователей
        
        this.setupCommands();
        this.setupHandlers();
        
        console.log('✅ Telegram бот инициализирован');
    }

    setupCommands() {
        // Установка команд бота
        this.bot.setMyCommands([
            { command: 'start', description: '🚀 Начать работу с ботом' },
            { command: 'webapp', description: '🧅 Запустить Tor браузер (Web App)' },
            { command: 'status', description: '📊 Статус активных сессий' },
            { command: 'stop', description: '⛔ Остановить браузер' },
            { command: 'help', description: '❓ Справка по командам' },
            { command: 'web3', description: '🪙 Web3 кошелек операции' }
        ]);
    }

    setupHandlers() {
        // Обработка команды /start
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const welcomeMessage = `
ἱf Добро пожаловать в Web3 Tor Browser!

🧥 Полноценный Tor браузер прямо в Telegram!

💡 Основные возможности:
• 📱 Полноценный браузер в Telegram
• 🧥 100% анонимность через Tor
• 🚫 Никаких логов и сохранений
• 🌍 Web3 интеграция
• 🖥️ Адаптивный интерфейс

🎆 Начните пользоваться прямо сейчас!
            `;
            
            await this.bot.sendMessage(chatId, welcomeMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🧅 Открыть Tor Browser', web_app: { url: process.env.BASE_URL + '/webapp' } }
                        ],
                        [
                            { text: '📊 Статус', callback_data: 'check_status' },
                            { text: '❓ Помощь', callback_data: 'show_help' }
                        ],
                        [
                            { text: '🪙 Web3 Кошелек', callback_data: 'web3_wallet' }
                        ]
                    ]
                }
            });
        });

        // Обработка команды /webapp
        this.bot.onText(/\/webapp/, async (msg) => {
            await this.handleLaunchWebApp(msg);
        });

        // Обработка команды /mobile для мобильного режима
        this.bot.onText(/\/mobile/, async (msg) => {
            await this.handleLaunchBrowser(msg, { userAgent: 'mobile' });
        });

        // Обработка команды /desktop для десктопного режима
        this.bot.onText(/\/desktop/, async (msg) => {
            await this.handleLaunchBrowser(msg, { userAgent: 'desktop' });
        });

        // Обработка команды /status
        this.bot.onText(/\/status/, async (msg) => {
            await this.handleStatus(msg);
        });

        // Обработка команды /stop
        this.bot.onText(/\/stop(.*)/, async (msg, match) => {
            await this.handleStopBrowser(msg, match[1]);
        });

        // Обработка команды /help
        this.bot.onText(/\/help/, async (msg) => {
            await this.handleHelp(msg);
        });

        // Обработка команды /web3
        this.bot.onText(/\/web3/, async (msg) => {
            await this.handleWeb3(msg);
        });

        // Обработка callback запросов от кнопок
        this.bot.on('callback_query', async (callbackQuery) => {
            await this.handleCallbackQuery(callbackQuery);
        });

        // Обработка ошибок
        this.bot.on('error', (error) => {
            console.error('Ошибка Telegram бота:', error);
        });

        console.log('🤖 Telegram бот handlers настроены');
    }

    async handleLaunchWebApp(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const webAppUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/webapp`;

        await this.bot.sendMessage(chatId, `
🧅 Запускаю Tor браузер в Web App...

💡 Нажмите кнопку ниже чтобы открыть Tor браузер прямо в Telegram:
        `, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🚀 Открыть Tor Browser', web_app: { url: webAppUrl } }
                    ],
                    [
                        { text: '📊 Статус сессий', callback_data: 'check_status' },
                        { text: '❓ Помощь', callback_data: 'show_help' }
                    ]
                ]
            }
        });
    }

    async handleLaunchBrowser(msg, options = {}) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        // Определяем тип устройства
        const deviceType = options.userAgent || 'desktop';
        const deviceEmoji = {
            mobile: '📱',
            tablet: '📱',
            desktop: '🖥️'
        };

        try {
            // Проверка, есть ли уже активная сессия
            const existingSession = this.userSessions.get(userId);
            if (existingSession) {
                await this.bot.sendMessage(chatId, `
⚠️ У вас уже есть активная сессия браузера!

🔗 Ссылка для доступа: ${existingSession.accessUrl}
🆔 ID сессии: ${existingSession.sessionId}

Используйте /stop для остановки текущей сессии.
                `);
                return;
            }

            await this.bot.sendMessage(chatId, '🔄 Запускаю Tor браузер... Это может занять несколько минут.');

            // Вызов callback для запуска браузера
            const result = await this.callbacks.onStartBrowser(userId);

            if (result.success) {
                // Сохранение информации о сессии
                this.userSessions.set(userId, {
                    sessionId: result.sessionId,
                    accessUrl: result.accessUrl,
                    createdAt: new Date()
                });

                await this.bot.sendMessage(chatId, `
✅ Tor браузер успешно запущен!

🔗 Ссылка для доступа: ${result.accessUrl}
🆔 ID сессии: ${result.sessionId}

💡 Откройте ссылку в любом браузере для доступа к Tor браузеру
⚠️ Сохраните эту ссылку, она потребуется для доступа
                `, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🌐 Открыть браузер', url: result.accessUrl }
                            ],
                            [
                                { text: '⛔ Остановить', callback_data: `stop_${result.sessionId}` },
                                { text: '📊 Статус', callback_data: 'check_status' }
                            ]
                        ]
                    }
                });
            } else {
                await this.bot.sendMessage(chatId, `
❌ Ошибка запуска браузера: ${result.error}

Попробуйте позже или обратитесь к администратору.
                `);
            }

        } catch (error) {
            console.error('Ошибка запуска браузера:', error);
            await this.bot.sendMessage(chatId, `
❌ Произошла ошибка при запуске браузера.

Попробуйте позже или используйте /help для получения поддержки.
            `);
        }
    }

    async handleStatus(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const session = this.userSessions.get(userId);

        if (!session) {
            await this.bot.sendMessage(chatId, `
📊 Статус сессий

❌ У вас нет активных сессий браузера.

Используйте /launch для запуска Tor браузера.
            `);
            return;
        }

        const uptime = Math.floor((Date.now() - session.createdAt.getTime()) / 1000 / 60);

        await this.bot.sendMessage(chatId, `
📊 Статус активной сессии

✅ Сессия активна
🆔 ID: ${session.sessionId}
🕒 Время работы: ${uptime} мин
🔗 Ссылка: ${session.accessUrl}
        `, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🌐 Открыть браузер', url: session.accessUrl }
                    ],
                    [
                        { text: '⛔ Остановить', callback_data: `stop_${session.sessionId}` },
                        { text: '🔄 Обновить', callback_data: 'check_status' }
                    ]
                ]
            }
        });
    }

    async handleStopBrowser(msg, sessionIdSuffix = '') {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        try {
            const session = this.userSessions.get(userId);
            if (!session) {
                await this.bot.sendMessage(chatId, '❌ У вас нет активных сессий для остановки.');
                return;
            }

            await this.bot.sendMessage(chatId, '⏳ Останавливаю браузер...');

            const result = await this.callbacks.onStopBrowser(userId, session.sessionId);

            if (result.success) {
                this.userSessions.delete(userId);
                await this.bot.sendMessage(chatId, `
✅ Браузер успешно остановлен!

🆔 Сессия ${session.sessionId} завершена.
💡 Используйте /launch для запуска нового браузера.
                `);
            } else {
                await this.bot.sendMessage(chatId, `
❌ Ошибка остановки браузера: ${result.error}

Попробуйте позже или обратитесь к администратору.
                `);
            }

        } catch (error) {
            console.error('Ошибка остановки браузера:', error);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка при остановке браузера.');
        }
    }

    async handleHelp(msg) {
        const chatId = msg.chat.id;

        const helpMessage = `
❓ Справка по командам

🧅 /launch - Запустить Tor браузер
📊 /status - Проверить статус активных сессий
⛔ /stop - Остановить активный браузер
🪙 /web3 - Web3 кошелек операции
❓ /help - Показать эту справку

💡 Как это работает:
1. Используйте /launch для запуска браузера
2. Получите ссылку для доступа к браузеру
3. Откройте ссылку в любом браузере
4. Пользуйтесь анонимным Tor браузером
5. Используйте /stop когда закончите

🔒 Безопасность:
• Весь трафик проходит через сеть Tor
• Браузер изолирован в Docker контейнере
• Автоматическое удаление данных после сессии

📞 Поддержка: @admin
        `;

        await this.bot.sendMessage(chatId, helpMessage);
    }

    async handleWeb3(msg) {
        const chatId = msg.chat.id;

        await this.bot.sendMessage(chatId, `
🪙 Web3 Кошелек

💡 Функциональность в разработке!

Планируемые возможности:
• Подключение MetaMask
• Просмотр баланса
• Отправка транзакций
• Работа с DeFi протоколами
• Управление NFT

🔄 Следите за обновлениями!
        `, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🧅 Запустить Tor Browser', callback_data: 'launch_browser' }
                    ]
                ]
            }
        });
    }

    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id;
        const data = callbackQuery.data;

        try {
            await this.bot.answerCallbackQuery(callbackQuery.id);

            switch (data) {
                case 'launch_browser':
                    await this.handleLaunchBrowser({ chat: { id: chatId }, from: { id: userId } });
                    break;

                case 'check_status':
                    await this.handleStatus({ chat: { id: chatId }, from: { id: userId } });
                    break;

                case 'show_help':
                    await this.handleHelp({ chat: { id: chatId } });
                    break;

                case 'web3_wallet':
                    await this.handleWeb3({ chat: { id: chatId } });
                    break;

                default:
                    if (data.startsWith('stop_')) {
                        const sessionId = data.substring(5);
                        await this.handleStopBrowser({ chat: { id: chatId }, from: { id: userId } }, sessionId);
                    }
                    break;
            }

        } catch (error) {
            console.error('Ошибка обработки callback query:', error);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка при обработке запроса.');
        }
    }

    // Отправка уведомления пользователю
    async notifyUser(userId, message, options = {}) {
        try {
            await this.bot.sendMessage(userId, message, options);
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }

    // Получение информации о пользователе
    getUserSession(userId) {
        return this.userSessions.get(userId);
    }

    // Очистка неактивных сессий
    cleanupInactiveSessions() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 часа

        for (const [userId, session] of this.userSessions.entries()) {
            if (now - session.createdAt.getTime() > maxAge) {
                this.userSessions.delete(userId);
                console.log(`Очищена неактивная сессия пользователя ${userId}`);
            }
        }
    }
}

module.exports = TelegramBotService;
