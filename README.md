# 🧅 Web3 Tor Browser - Revolutionary Telegram Web App

**Полноценный анонимный Tor браузер прямо в Telegram с поддержкой множественных пользователей и Web3 интеграцией**

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Puppeteer](https://img.shields.io/badge/puppeteer-21.3.8-orange.svg)
![Tor](https://img.shields.io/badge/tor-proxy-purple.svg)
![Telegram](https://img.shields.io/badge/telegram-web--app-blue.svg)
![Web3](https://img.shields.io/badge/web3-ready-green.svg)
![Multi-User](https://img.shields.io/badge/multi--user-50%20sessions-red.svg)

## 📖 Обзор проекта

**Web3 Tor Browser** - это прорывное решение, которое объединяет анонимность Tor сети, удобство **Telegram Web App** и мощь **Web3 технологий**. Проект создает полноценный браузер, работающий прямо в интерфейсе Telegram, обеспечивая максимальную приватность и безопасность для **множественных пользователей** одновременно.

### 🎆 **Революционные особенности:**

- 🔥 **Нативная интеграция с Telegram** - Полноценный браузер без внешних приложений
- 👥 **Масштабируемая мультипользовательская архитектура** - До 50 изолированных сессий
- 🔒 **Абсолютная Tor анонимность** - Весь трафик только через Tor сеть
- 🌍 **Enterprise-grade Web3** - Полная поддержка криптокошельков и DeFi
- 🚫 **Zero-logs политика** - Никаких сохранений данных или истории
- ⚡ **Автоматическое управление** - Интеллектуальная очистка и оптимизация

> 🎯 **Цель:** Создание первого в мире полноценного многопользовательского анонимного браузера, интегрированного напрямую в Telegram с поддержкой Web3 экосистемы.

## 🌟 Ключевые особенности

### 👥 **Множественные пользователи**
- **Одновременные сессии**: До 50 общих сессий, по 3 на пользователя
- **Изоляция**: Каждая сессия полностью изолирована
- **Управление лимитами**: Гибкая настройка ограничений
- **Автоочистка**: Автоматическое удаление неактивных сессий

### 🧅 **Telegram Web App**
- **Нативная интеграция**: Работает прямо в Telegram без VNC
- **Мобильная оптимизация**: Адаптивный интерфейс для всех устройств
- **Быстрый запуск**: Мгновенное создание браузерных сессий
- **Полный UI**: Адресная строка, навигация, скриншоты

### 🔒 **Безопасность и приватность**
- **100% Tor трафик**: Весь трафик через Tor сеть
- **Блокировка трекеров**: Автоматическая защита от аналитики
- **Отсутствие логов**: Никаких сохранений истории
- **Временные сессии**: Полная очистка после завершения

### 🌍 **Web3 интеграция**
- **MetaMask поддержка**: Подключение криптокошельков
- **Multi-chain**: Ethereum, Polygon, BSC, Arbitrum
- **DeFi готовность**: Работа с децентрализованными приложениями

## 🏗️ Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Telegram Bot  │───▶│   Node.js API    │───▶│  Docker Engine  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Web3 Service   │    │  Tor Containers │
                       └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │   VNC Server    │
                                              └─────────────────┘
```

## 📋 Требования

### Системные требования

- **ОС**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: Минимум 4GB (рекомендуется 8GB+)
- **CPU**: 2+ ядра
- **Диск**: 20GB+ свободного места
- **Сеть**: Стабильное интернет-соединение

### Программное обеспечение

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- Git

## 🚀 Быстрая установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/yourusername/web3-tor-browser-app.git
cd web3-tor-browser-app
```

### 2. Установка зависимостей

```bash
# Установка Node.js зависимостей
npm install

# Установка Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 3. Настройка конфигурации

```bash
# Копирование примера конфигурации
cp .env.example .env

# Редактирование конфигурации
nano .env
```

### 4. Создание Telegram бота

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям для создания бота
4. Получите токен и добавьте в файл `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 5. Сборка Docker образа

```bash
# Сборка образа Tor браузера
docker build -t tor-browser-app -f docker/Dockerfile .

# Или использование Docker Compose
docker-compose build
```

### 6. Запуск приложения

```bash
# Запуск в режиме разработки
npm run dev

# Или запуск через Docker Compose
docker-compose up -d
```

## ⚙️ Детальная настройка

### Переменные окружения

#### Основные настройки

```env
# Основные параметры
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

#### Web3 настройки

```env
# RPC провайдеры (опционально)
ETHEREUM_RPC=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC=https://polygon-rpc.com/
BSC_RPC=https://bsc-dataseed.binance.org/
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
```

#### Безопасность

```env
# Секретные ключи
JWT_SECRET=your_32_character_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key
REDIS_PASSWORD=your_secure_redis_password
```

### Настройка SSL/TLS

1. Получите SSL сертификат (Let's Encrypt рекомендуется):

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

2. Настройте Nginx конфигурацию:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📱 Использование Telegram бота

### Основные команды

- `/start` - Начать работу с ботом
- `/launch` - Запустить Tor браузер (десктоп разрешение)
- `/mobile` - Запустить в мобильном режиме (390x844)
- `/desktop` - Запустить в десктопном режиме (1920x1080)
- `/status` - Проверить статус сессий
- `/stop` - Остановить активную сессию
- `/web3` - Web3 функции
- `/help` - Справка по командам

### Пример использования

1. Найдите вашего бота в Telegram
2. Отправьте `/start` для инициализации
3. Нажмите "🧅 Запустить Tor Browser"
4. Дождитесь запуска (1-2 минуты)
5. Получите ссылку для доступа к браузеру
6. Откройте ссылку в любом браузере

## 🔧 API Документация

### Основные эндпоинты

#### GET /api/status
Получение статуса всех сервисов

```json
{
  "telegram": true,
  "web3": true,
  "tor": true,
  "vnc": true,
  "activeSessions": 2
}
```

#### POST /api/web3/connect
Подключение Web3 кошелька

```json
{
  "address": "0x742d35Cc6634C0532925a3b8D95D22ac528B30c"
}
```

#### GET /api/session/:sessionId
Получение информации о сессии

```json
{
  "sessionId": "123456_1640995200000",
  "status": "running",
  "accessUrl": "http://yourdomain.com/vnc/123456_1640995200000",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## 🐳 Docker развертывание

### Простое развертывание

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### Продакшн развертывание

```yaml
version: '3.8'
services:
  web3-tor-app:
    image: your-registry/web3-tor-app:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    ports:
      - "3000:3000"
      - "5900-5950:5900-5950"
      - "6080-6130:6080-6130"
```

## 🔒 Безопасность

### Рекомендации по безопасности

1. **Используйте сильные пароли** для всех сервисов
2. **Настройте файрвол** для ограничения доступа
3. **Регулярно обновляйте** систему и зависимости
4. **Мониторьте логи** на предмет подозрительной активности
5. **Ограничьте количество** одновременных сессий

### Настройка файрвола

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # App
sudo ufw allow 5900:5950/tcp  # VNC
sudo ufw allow 6080:6130/tcp  # Web VNC
sudo ufw enable
```

### Мониторинг

```bash
# Просмотр активных сессий
docker ps | grep tor-browser

# Мониторинг ресурсов
docker stats

# Логи приложения
tail -f logs/app.log
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Unit тесты
npm test

# Интеграционные тесты
npm run test:integration

# E2E тесты
npm run test:e2e
```

### Тестирование API

```bash
# Проверка статуса
curl http://localhost:3000/api/status

# Проверка healthcheck
curl http://localhost:3000/health
```

## 📊 Мониторинг и логирование

### Структура логов

```
logs/
├── app.log          # Основные логи приложения
├── error.log        # Ошибки
├── telegram.log     # Логи Telegram бота
├── web3.log         # Web3 операции
└── access.log       # HTTP запросы
```

### Интеграция с мониторингом

- **Prometheus** - метрики
- **Grafana** - визуализация
- **Sentry** - отслеживание ошибок
- **ELK Stack** - анализ логов

## 🚨 Устранение неполадок

### Частые проблемы

#### Tor браузер не запускается

```bash
# Проверка Docker
docker ps
docker logs tor-browser-sessionId

# Проверка ресурсов
df -h
free -m
```

#### VNC не подключается

```bash
# Проверка портов
netstat -tlnp | grep 59
ss -tlnp | grep 6080

# Проверка файрвола
sudo ufw status
```

#### Telegram бот не отвечает

```bash
# Проверка токена
echo $TELEGRAM_BOT_TOKEN

# Проверка соединения
curl -X GET "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

### Диагностические команды

```bash
# Полная диагностика
./scripts/diagnose.sh

# Проверка зависимостей
./scripts/check-deps.sh

# Очистка
./scripts/cleanup.sh
```

## 📈 Производительность

### Оптимизация

1. **Ограничение ресурсов Docker контейнеров**:

```yaml
services:
  tor-browser:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

2. **Настройка Redis кеширования**
3. **Оптимизация VNC сжатия**
4. **Балансировка нагрузки**

### Масштабирование

```bash
# Горизонтальное масштабирование
docker-compose up --scale web3-tor-app=3

# Кластер с Docker Swarm
docker swarm init
docker stack deploy -c docker-stack.yml web3-tor
```

## 🤝 Вклад в проект

### Как внести вклад

1. Fork репозитория
2. Создайте feature ветку
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

### Стандарты кода

```bash
# Форматирование
npm run format

# Линтинг
npm run lint

# Проверка типов
npm run type-check
```

## 📜 Лицензия

Этот проект распространяется под лицензией MIT. См. файл [LICENSE](LICENSE) для подробностей.

## 📞 Поддержка

- **GitHub Issues**: [Создать issue](https://github.com/yourusername/web3-tor-browser-app/issues)
- **Telegram**: [@your_support_bot](https://t.me/your_support_bot)
- **Email**: support@yourdomain.com

## 🙏 Благодарности

- [Tor Project](https://www.torproject.org/) за анонимность
- [Telegram](https://telegram.org/) за API
- [Docker](https://docker.com/) за контейнеризацию
- [Node.js](https://nodejs.org/) сообщество

## 🗓️ Changelog

### v1.0.0 (2024-01-01)
- ✨ Первый релиз
- 🧅 Интеграция с Tor браузером
- 📱 Telegram бот
- 🌐 Web3 поддержка
- 🖥️ VNC доступ

---

**⚠️ Отказ от ответственности**: Этот проект предназначен только для законного использования. Пользователи несут полную ответственность за соблюдение местного законодательства.
