# 👥 Руководство по множественным пользователям

## 📊 Возможности системы

### Лимиты по умолчанию:
- **Максимум сессий на пользователя**: 3
- **Общий лимит сессий**: 50
- **Время неактивности**: 30 минут
- **Автоочистка**: каждые 5 минут

## 🔧 Настройка лимитов

### В .env файле:
```env
MAX_SESSIONS_PER_USER=3
MAX_TOTAL_SESSIONS=50
SESSION_TIMEOUT=1800000
```

### Через код:
```javascript
// Изменение лимитов во время работы
sessionManager.setLimits({
    maxSessionsPerUser: 5,
    maxTotalSessions: 100,
    sessionTimeout: 60 * 60 * 1000 // 1 час
});
```

## 📈 API для управления пользователями

### GET /api/sessions/stats
Получение общей статистики:
```json
{
  "totalUsers": 15,
  "totalSessions": 28,
  "maxSessionsPerUser": 3,
  "maxTotalSessions": 50,
  "activeUsers": [
    {
      "userId": "123456789",
      "sessionCount": 2,
      "sessions": ["webapp_123456789_1640995200000", "webapp_123456789_1640995300000"]
    }
  ]
}
```

### GET /api/user/:userId/sessions
Информация о сессиях конкретного пользователя:
```json
{
  "userId": "123456789",
  "sessionCount": 2,
  "sessions": ["webapp_123456789_1640995200000"],
  "maxSessions": 3,
  "canCreateMore": true
}
```

### POST /api/webapp/start-session
Создание новой сессии с проверкой лимитов:
```json
{
  "deviceType": "mobile",
  "userId": "123456789"
}
```

Ответ:
```json
{
  "success": true,
  "sessionId": "webapp_123456789_1640995200000",
  "userId": "123456789",
  "userInfo": {
    "userId": "123456789",
    "sessionCount": 1,
    "canCreateMore": true
  },
  "deviceType": "mobile",
  "viewport": {
    "width": 390,
    "height": 844,
    "deviceScaleFactor": 3,
    "isMobile": true,
    "hasTouch": true
  }
}
```

### POST /api/webapp/end-session
Завершение сессии с проверкой владельца:
```json
{
  "sessionId": "webapp_123456789_1640995200000",
  "userId": "123456789"
}
```

## 🛡️ Безопасность и изоляция

### Изоляция сессий:
- ✅ Каждая сессия в отдельном браузерном процессе
- ✅ Уникальная временная директория `/tmp/browser-session-{sessionId}`
- ✅ Отдельные cookies и localStorage
- ✅ Независимые User-Agent и настройки

### Проверка доступа:
```javascript
// Проверка принадлежности сессии пользователю
if (!sessionManager.isUserSession(userId, sessionId)) {
    return res.status(403).json({
        success: false,
        error: 'Нет доступа к данной сессии'
    });
}
```

## 📊 Мониторинг

### WebSocket события:
```javascript
// Подписка на события SessionManager
sessionManager.on('sessionCreated', ({ userId, sessionId }) => {
    console.log(`Новая сессия ${sessionId} для пользователя ${userId}`);
});

sessionManager.on('sessionRemoved', ({ userId, sessionId }) => {
    console.log(`Удалена сессия ${sessionId} пользователя ${userId}`);
});

sessionManager.on('cleanupRequested', () => {
    console.log('Запрос автоочистки неактивных сессий');
});
```

### Telegram Bot команды:
```javascript
// /status - показывает информацию о сессиях пользователя
// /stop - останавливает все сессии пользователя
// /webapp - запускает новую сессию с проверкой лимитов
```

## ⚡ Автоматическое управление

### Автоочистка:
- ✅ Каждые 5 минут проверка неактивных сессий
- ✅ Автоматическое удаление сессий старше 30 минут
- ✅ Очистка временных файлов и ресурсов
- ✅ Обновление счетчиков SessionManager

### События очистки:
```javascript
// Принудительная очистка всех сессий пользователя
sessionManager.forceCleanupUser(userId);

// Обработка события принудительной очистки
sessionManager.on('forceCleanup', async ({ userId, sessionId }) => {
    await webAppManager.stopSession(sessionId);
});
```

## 🚦 Обработка ошибок

### Превышение лимитов:
```json
{
  "success": false,
  "error": "Пользователь 123456789 достиг лимита сессий (3)"
}
```

### Общий лимит:
```json
{
  "success": false,
  "error": "Достигнут лимит общего количества сессий"
}
```

### Доступ запрещен:
```json
{
  "success": false,
  "error": "Нет доступа к данной сессии"
}
```

## 📱 Telegram Web App интеграция

### Получение userId:
```javascript
// В webapp.html
const userId = tg?.initDataUnsafe?.user?.id || 'anonymous';
```

### Создание сессии:
```javascript
const response = await fetch('/api/webapp/start-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        deviceType: getDeviceType(),
        userId: userId
    })
});
```

### Отображение лимитов в UI:
```javascript
if (data.userInfo) {
    console.log(`Сессий: ${data.userInfo.sessionCount}/${data.userInfo.maxSessions}`);
    console.log(`Можно создать еще: ${data.userInfo.canCreateMore}`);
}
```

## 🔧 Настройки производительности

### Оптимизация для множественных пользователей:
```yaml
# docker-compose.yml
services:
  web3-tor-app:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
    environment:
      - MAX_SESSIONS_PER_USER=2
      - MAX_TOTAL_SESSIONS=30
```

### Мониторинг ресурсов:
```bash
# Проверка использования памяти
docker stats

# Мониторинг активных сессий
curl http://localhost:3000/api/sessions/stats
```

## ⚠️ Рекомендации

1. **Мониторинг**: Регулярно проверяйте `/api/sessions/stats`
2. **Лимиты**: Настраивайте в зависимости от ресурсов сервера
3. **Очистка**: Убедитесь что автоочистка работает
4. **Логирование**: Отслеживайте создание/удаление сессий
5. **Ресурсы**: Каждая сессия ~200-500MB RAM

---

**Система готова для поддержки множественных пользователей с автоматическим управлением ресурсами и безопасностью!** 🎉
