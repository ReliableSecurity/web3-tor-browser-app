const EventEmitter = require('events');

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.userSessions = new Map(); // userId -> Set of sessionIds
        this.sessionUsers = new Map(); // sessionId -> userId
        this.sessionLimits = {
            maxSessionsPerUser: 3,
            maxTotalSessions: 50,
            sessionTimeout: 30 * 60 * 1000 // 30 минут
        };
        
        // Автоочистка каждые 5 минут
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000);
        
        console.log('📊 Session Manager инициализирован');
    }

    // Создание новой сессии для пользователя
    createUserSession(userId, sessionId) {
        // Проверка лимитов
        if (this.getTotalSessions() >= this.sessionLimits.maxTotalSessions) {
            throw new Error('Достигнут лимит общего количества сессий');
        }

        if (this.getUserSessionCount(userId) >= this.sessionLimits.maxSessionsPerUser) {
            throw new Error(`Пользователь ${userId} достиг лимита сессий (${this.sessionLimits.maxSessionsPerUser})`);
        }

        // Создание связей
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, new Set());
        }
        
        this.userSessions.get(userId).add(sessionId);
        this.sessionUsers.set(sessionId, userId);

        console.log(`👤 Создана сессия ${sessionId} для пользователя ${userId}`);
        this.emit('sessionCreated', { userId, sessionId });
        
        return true;
    }

    // Удаление сессии
    removeUserSession(sessionId) {
        const userId = this.sessionUsers.get(sessionId);
        if (!userId) {
            return false;
        }

        // Удаление связей
        this.sessionUsers.delete(sessionId);
        if (this.userSessions.has(userId)) {
            this.userSessions.get(userId).delete(sessionId);
            
            // Удаление пустого набора сессий
            if (this.userSessions.get(userId).size === 0) {
                this.userSessions.delete(userId);
            }
        }

        console.log(`🗑️ Удалена сессия ${sessionId} пользователя ${userId}`);
        this.emit('sessionRemoved', { userId, sessionId });
        
        return true;
    }

    // Получение количества сессий пользователя
    getUserSessionCount(userId) {
        return this.userSessions.has(userId) ? this.userSessions.get(userId).size : 0;
    }

    // Получение всех сессий пользователя
    getUserSessions(userId) {
        return this.userSessions.has(userId) ? 
            Array.from(this.userSessions.get(userId)) : [];
    }

    // Получение общего количества сессий
    getTotalSessions() {
        return this.sessionUsers.size;
    }

    // Получение пользователя по сессии
    getSessionUser(sessionId) {
        return this.sessionUsers.get(sessionId);
    }

    // Проверка принадлежности сессии пользователю
    isUserSession(userId, sessionId) {
        return this.sessionUsers.get(sessionId) === userId;
    }

    // Получение статистики
    getStats() {
        const userCount = this.userSessions.size;
        const sessionCount = this.sessionUsers.size;
        const activeUsers = [];
        
        for (const [userId, sessions] of this.userSessions.entries()) {
            activeUsers.push({
                userId,
                sessionCount: sessions.size,
                sessions: Array.from(sessions)
            });
        }

        return {
            totalUsers: userCount,
            totalSessions: sessionCount,
            maxSessionsPerUser: this.sessionLimits.maxSessionsPerUser,
            maxTotalSessions: this.sessionLimits.maxTotalSessions,
            activeUsers
        };
    }

    // Очистка просроченных сессий (интегрируется с WebAppManager)
    async cleanupExpiredSessions() {
        console.log('🧹 Проверка просроченных сессий...');
        
        // Эмитим событие для WebAppManager
        this.emit('cleanupRequested');
    }

    // Принудительная очистка всех сессий пользователя
    async forceCleanupUser(userId) {
        const sessions = this.getUserSessions(userId);
        
        for (const sessionId of sessions) {
            this.emit('forceCleanup', { userId, sessionId });
            this.removeUserSession(sessionId);
        }
        
        console.log(`🧹 Принудительная очистка всех сессий пользователя ${userId}`);
    }

    // Установка лимитов
    setLimits(limits) {
        this.sessionLimits = { ...this.sessionLimits, ...limits };
        console.log('⚙️ Лимиты сессий обновлены:', this.sessionLimits);
    }

    // Получение информации о пользователе
    getUserInfo(userId) {
        if (!this.userSessions.has(userId)) {
            return null;
        }

        return {
            userId,
            sessionCount: this.getUserSessionCount(userId),
            sessions: this.getUserSessions(userId),
            maxSessions: this.sessionLimits.maxSessionsPerUser,
            canCreateMore: this.getUserSessionCount(userId) < this.sessionLimits.maxSessionsPerUser
        };
    }

    // Shutdown
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        console.log('🛑 Session Manager остановлен');
    }
}

module.exports = SessionManager;
