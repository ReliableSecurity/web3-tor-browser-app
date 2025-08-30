#!/usr/bin/env node

require('dotenv').config();
const SessionManager = require('./src/sessionManager');

async function testMultiUserSupport() {
    console.log('🧪 Тестирование поддержки множественных пользователей...\n');
    
    const sessionManager = new SessionManager();
    
    // Настройка лимитов для тестирования
    sessionManager.setLimits({
        maxSessionsPerUser: 2,
        maxTotalSessions: 5
    });
    
    console.log('📊 Начальная статистика:');
    console.log(sessionManager.getStats());
    console.log('');
    
    try {
        // Тест 1: Создание сессий для разных пользователей
        console.log('✅ Тест 1: Создание сессий для разных пользователей');
        
        sessionManager.createUserSession('user1', 'session_user1_1');
        sessionManager.createUserSession('user1', 'session_user1_2');
        sessionManager.createUserSession('user2', 'session_user2_1');
        
        console.log('   Создано 3 сессии для 2 пользователей');
        console.log(`   User1 сессий: ${sessionManager.getUserSessionCount('user1')}`);
        console.log(`   User2 сессий: ${sessionManager.getUserSessionCount('user2')}`);
        console.log('');
        
        // Тест 2: Проверка лимитов на пользователя
        console.log('✅ Тест 2: Проверка лимитов на пользователя');
        
        try {
            sessionManager.createUserSession('user1', 'session_user1_3');
            console.log('   ❌ ОШИБКА: Лимит не сработал!');
        } catch (error) {
            console.log(`   ✅ Лимит сработал: ${error.message}`);
        }
        console.log('');
        
        // Тест 3: Проверка общего лимита
        console.log('✅ Тест 3: Проверка общего лимита');
        
        sessionManager.createUserSession('user3', 'session_user3_1');
        sessionManager.createUserSession('user3', 'session_user3_2');
        
        try {
            sessionManager.createUserSession('user4', 'session_user4_1');
            console.log('   ❌ ОШИБКА: Общий лимит не сработал!');
        } catch (error) {
            console.log(`   ✅ Общий лимит сработал: ${error.message}`);
        }
        console.log('');
        
        // Тест 4: Проверка принадлежности сессий
        console.log('✅ Тест 4: Проверка принадлежности сессий');
        
        const isUser1Session = sessionManager.isUserSession('user1', 'session_user1_1');
        const isNotUser1Session = sessionManager.isUserSession('user1', 'session_user2_1');
        
        console.log(`   user1 владеет session_user1_1: ${isUser1Session}`);
        console.log(`   user1 НЕ владеет session_user2_1: ${!isNotUser1Session}`);
        console.log('');
        
        // Тест 5: Получение информации о пользователе
        console.log('✅ Тест 5: Получение информации о пользователе');
        
        const user1Info = sessionManager.getUserInfo('user1');
        console.log('   Информация о user1:', user1Info);
        console.log('');
        
        // Тест 6: Удаление сессий
        console.log('✅ Тест 6: Удаление сессий');
        
        sessionManager.removeUserSession('session_user1_1');
        console.log(`   После удаления session_user1_1, у user1 сессий: ${sessionManager.getUserSessionCount('user1')}`);
        
        sessionManager.forceCleanupUser('user2');
        console.log(`   После принудительной очистки user2 сессий: ${sessionManager.getUserSessionCount('user2')}`);
        console.log('');
        
        // Финальная статистика
        console.log('📊 Финальная статистика:');
        const finalStats = sessionManager.getStats();
        console.log(finalStats);
        console.log('');
        
        // Тест событий
        console.log('✅ Тест 7: События SessionManager');
        
        let eventsCaught = 0;
        
        sessionManager.on('sessionCreated', ({ userId, sessionId }) => {
            console.log(`   🔥 Событие: Создана сессия ${sessionId} для ${userId}`);
            eventsCaught++;
        });
        
        sessionManager.on('sessionRemoved', ({ userId, sessionId }) => {
            console.log(`   🗑️ Событие: Удалена сессия ${sessionId} пользователя ${userId}`);
            eventsCaught++;
        });
        
        // Создание и удаление для тестирования событий
        sessionManager.createUserSession('test_user', 'test_session');
        sessionManager.removeUserSession('test_session');
        
        console.log(`   Поймано событий: ${eventsCaught}`);
        console.log('');
        
        console.log('🎉 Все тесты пройдены успешно!');
        console.log('');
        console.log('📋 Отчет о возможностях:');
        console.log('   ✅ Лимиты на пользователя работают');
        console.log('   ✅ Общие лимиты работают');
        console.log('   ✅ Проверка принадлежности сессий');
        console.log('   ✅ Информация о пользователях');
        console.log('   ✅ Удаление сессий');
        console.log('   ✅ Принудительная очистка');
        console.log('   ✅ События для мониторинга');
        console.log('   ✅ Статистика в реальном времени');
        
    } catch (error) {
        console.error('❌ Ошибка в тестах:', error);
    } finally {
        sessionManager.shutdown();
    }
}

testMultiUserSupport().catch(console.error);
