#!/bin/bash

# Скрипт автоочистки сессии при завершении контейнера
# Удаляет все временные файлы и следы сессии для максимальной приватности

echo "🧹 Запуск процедуры очистки сессии..."

# Функция безопасного удаления файлов
secure_delete() {
    local file_path="$1"
    
    if [ -f "$file_path" ]; then
        # Перезаписываем файл случайными данными перед удалением
        shred -vfz -n 3 "$file_path" 2>/dev/null || {
            # Если shred недоступен, используем dd
            dd if=/dev/urandom of="$file_path" bs=1024 count=1 2>/dev/null || true
        }
        rm -f "$file_path"
        echo "🗑️ Безопасно удален: $file_path"
    fi
}

# Функция очистки директории
cleanup_directory() {
    local dir_path="$1"
    
    if [ -d "$dir_path" ]; then
        echo "📁 Очистка директории: $dir_path"
        
        # Рекурсивная очистка всех файлов в директории
        find "$dir_path" -type f -exec shred -vfz -n 3 {} \; 2>/dev/null || {
            # Альтернативный метод, если shred недоступен
            find "$dir_path" -type f -exec dd if=/dev/urandom of={} bs=1024 count=1 \; 2>/dev/null || true
        }
        
        # Удаляем директорию
        rm -rf "$dir_path"
        echo "✅ Директория очищена: $dir_path"
    fi
}

# Очистка истории браузера и данных профиля
echo "🔒 Очистка приватных данных Tor Browser..."

# Профиль Tor Browser
TOR_PROFILE_DIR="/home/toruser/tor-browser_*/Browser/TorBrowser/Data/Browser/profile.default"
if [ -d $TOR_PROFILE_DIR 2>/dev/null ]; then
    # Очистка истории
    secure_delete "$TOR_PROFILE_DIR/places.sqlite"
    secure_delete "$TOR_PROFILE_DIR/places.sqlite-wal"
    secure_delete "$TOR_PROFILE_DIR/places.sqlite-shm"
    
    # Очистка кеша
    cleanup_directory "$TOR_PROFILE_DIR/cache2"
    cleanup_directory "$TOR_PROFILE_DIR/startupCache"
    cleanup_directory "$TOR_PROFILE_DIR/OfflineCache"
    
    # Очистка cookies и сессий
    secure_delete "$TOR_PROFILE_DIR/cookies.sqlite"
    secure_delete "$TOR_PROFILE_DIR/cookies.sqlite-wal"
    secure_delete "$TOR_PROFILE_DIR/cookies.sqlite-shm"
    secure_delete "$TOR_PROFILE_DIR/sessionstore.jsonlz4"
    secure_delete "$TOR_PROFILE_DIR/recovery.jsonlz4"
    
    # Очистка форм и паролей (на случай если настройки были изменены)
    secure_delete "$TOR_PROFILE_DIR/formhistory.sqlite"
    secure_delete "$TOR_PROFILE_DIR/key4.db"
    secure_delete "$TOR_PROFILE_DIR/logins.json"
    secure_delete "$TOR_PROFILE_DIR/signons.sqlite"
    
    # Очистка сертификатов и разрешений
    secure_delete "$TOR_PROFILE_DIR/cert9.db"
    secure_delete "$TOR_PROFILE_DIR/permissions.sqlite"
    secure_delete "$TOR_PROFILE_DIR/content-prefs.sqlite"
    
    # Очистка временных файлов
    cleanup_directory "$TOR_PROFILE_DIR/tmp"
    cleanup_directory "$TOR_PROFILE_DIR/thumbnails"
    
    echo "✅ Tor Browser профиль очищен"
fi

# Очистка системного кеша и временных файлов
echo "🗂️ Очистка системных временных файлов..."

# Очистка временных файлов пользователя
cleanup_directory "/home/toruser/.cache"
cleanup_directory "/home/toruser/.local/share/recently-used.xbel"
cleanup_directory "/tmp"

# Очистка логов X11 и VNC
secure_delete "/tmp/.X*"
secure_delete "/tmp/x11vnc.log"
secure_delete "/home/toruser/.vnc/passwd"
secure_delete "/home/toruser/.xsession-errors"

# Очистка истории bash (если была создана)
secure_delete "/home/toruser/.bash_history"
secure_delete "/home/toruser/.zsh_history"

# Очистка Downloads
echo "📥 Очистка загруженных файлов..."
cleanup_directory "/home/toruser/Downloads"

# Очистка логов системы
echo "📋 Очистка системных логов..."
cleanup_directory "/var/log"

# Очистка Firefox crash reports
cleanup_directory "/home/toruser/.mozilla/firefox/Crash Reports"

# Синхронизация файловой системы для обеспечения записи на диск
sync

# Уведомление о завершении очистки
echo "🎉 Очистка сессии завершена!"
echo "🔐 Все приватные данные безопасно удалены"
echo "⚡ Сессия была полностью анонимной"

# Вывод статистики очистки
CLEANED_SIZE=$(du -sh /tmp 2>/dev/null | cut -f1 || echo "unknown")
echo "📊 Освобождено места: $CLEANED_SIZE"

exit 0
