# 🧅 Web3 Tor Browser - Telegram Web App

**Полноценный Tor браузер прямо в Telegram с Web3 интеграцией**

## 🌟 Особенности

- 🧅 **Telegram Web App** - Полноценный Tor браузер прямо в клиенте Telegram
- 🔒 **100% Анонимность** - Весь трафик проходит через Tor сеть  
- 📱 **Мобильная адаптация** - Оптимизирован для мобильных устройств
- 🚫 **Никаких логов** - Полностью отключено сохранение истории и данных
- 🌍 **Web3 интеграция** - Поддержка MetaMask и криптокошельков
- 🚀 **Мгновенное развертывание** - Docker для легкой установки
- 🗪 **Изолированные сессии** - Каждый пользователь работает в своей среде
- 🧽 **Автоочистка** - Полное уничтожение данных после сессии

## 🏗️ Архитектура

```
[Пользователь Telegram] -> [Telegram Bot] -> [Telegram Web App] -> [Node.js API] -> [WebApp Manager] -> [Puppeteer + Tor Proxy] -> [.onion Сайты]
                                                         |
                                                [Web3 Service] -> [MetaMask/Wallet]
```

### Ключевые компоненты:

1. **Telegram Web App** - Интерфейс браузера в Telegram
2. **WebApp Manager** - Управление сессиями Puppeteer
3. **Tor Proxy** - SOCKS5 прокси через Tor сеть
4. **Security Layer** - Блокировка трекеров и очистка данных

## 🚀 Быстрая установка

### 1. Клонирование и зависимости

```bash
git clone https://github.com/yourusername/web3-tor-browser-app.git
cd web3-tor-browser-app
npm install
```

### 2. Настройка Telegram бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Создайте нового бота с помощью `/newbot`
3. Скопируйте токен и создайте файл `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
BASE_URL=https://yourdomain.com
PORT=3000
```

### 3. Установка Tor

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install tor

# CentOS/RHEL
sudo yum install tor

# Запуск Tor
sudo systemctl start tor
sudo systemctl enable tor
```

### 4. Запуск приложения

```bash
# Разработка
npm run dev

# Продакшн
npm start
```

## 📱 Использование

### Команды Telegram бота:

- `/start` - Начать работу с ботом
- `/webapp` - Запустить Tor браузер в Web App
- `/status` - Проверить статус сессий  
- `/stop` - Остановить активную сессию
- `/help` - Справка по командам

### Пошаговое использование:

1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Нажмите **"🧅 Открыть Tor Browser"** 
4. Браузер откроется прямо в Telegram
5. Используйте адресную строку для навигации
6. Поддерживаются .onion сайты и поисковые запросы

## 🔧 API Документация

### Web App API эндпоинты:

#### POST /api/webapp/start-session
Создание новой браузерной сессии

```json
{
  "deviceType": "mobile|tablet|desktop",
  "userId": "telegram_user_id"
}
```

#### POST /api/webapp/navigate
Навигация к URL

```json
{
  "sessionId": "webapp_123_timestamp",
  "url": "https://duckduckgogg42ts72.onion"
}
```

#### POST /api/webapp/screenshot
Создание скриншота страницы

```json
{
  "sessionId": "webapp_123_timestamp"
}
```

#### GET /api/status
Статус сервисов и активных сессий

```json
{
  "telegram": true,
  "webapp": true,
  "web3": true,
  "activeSessions": 2
}
```

## 🐳 Docker развертывание

### docker-compose.yml

```yaml
version: '3.8'
services:
  web3-tor-webapp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - BASE_URL=${BASE_URL}
    volumes:
      - ./logs:/app/logs
    depends_on:
      - tor-proxy
      
  tor-proxy:
    image: osminogin/tor-simple
    ports:
      - "9050:9050"
    restart: unless-stopped
```

### Запуск:

```bash
docker-compose up -d
```

## 🔒 Безопасность и приватность

### Встроенные меры безопасности:

- ✅ **Tor прокси** - Весь трафик через Tor
- ✅ **Блокировка трекеров** - Автоматическая блокировка аналитики
- ✅ **Отключение WebRTC** - Предотвращение утечки IP
- ✅ **Очистка куки** - Автоматическое удаление
- ✅ **Изолированные сессии** - Каждая сессия в отдельном контейнере
- ✅ **Временные файлы** - Полная очистка после завершения

### Рекомендуемые .onion сайты:

- `duckduckgogg42ts72.onion` - DuckDuckGo поиск
- `facebookcorewwwi.onion` - Facebook
- `3g2upl4pq6kufc4m.onion` - DuckDuckGo альтернативный

## 🚨 Устранение неполадок

### Tor не подключается:

```bash
# Проверка статуса Tor
sudo systemctl status tor

# Проверка прослушивания порта
netstat -tlnp | grep 9050

# Перезапуск Tor
sudo systemctl restart tor
```

### Telegram Web App не открывается:

1. Убедитесь, что `BASE_URL` в `.env` корректный
2. Проверьте, что сервер доступен по HTTPS
3. Проверьте права бота в Telegram

### Браузер не загружается:

```bash
# Проверка логов
npm run dev

# Проверка активных сессий
curl http://localhost:3000/api/status
```

## 📊 Мониторинг

### Основные метрики:

- Количество активных сессий
- Использование памяти/CPU
- Статус Tor соединения
- Время отклика API

### Логирование:

```bash
# Логи приложения  
tail -f logs/app.log

# Логи Web App Manager
tail -f logs/webapp.log

# Логи Telegram бота
tail -f logs/telegram.log
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature ветку: `git checkout -b feature/amazing-feature`
3. Commit изменения: `git commit -m 'Add amazing feature'`
4. Push в ветку: `git push origin feature/amazing-feature`
5. Создайте Pull Request

## 📜 Лицензия

Распространяется под лицензией MIT. Детали в файле [LICENSE](LICENSE).

## ⚠️ Отказ от ответственности

Этот проект предназначен для законного использования. Пользователи несут ответственность за соблюдение местного законодательства.

---

**Безопасность • Приватность • Удобство**
