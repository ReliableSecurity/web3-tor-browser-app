#!/bin/bash

echo "🧅 Запуск Tor Browser..."

# Переходим в домашнюю директорию
cd /home/toruser

# Ожидание готовности X сервера
while ! xdpyinfo -display $DISPLAY >/dev/null 2>&1; do
    echo "⏳ Ожидание X сервера..."
    sleep 1
done

echo "✅ X сервер готов"

# Поиск Tor Browser
TOR_BROWSER_DIR=$(find /home/toruser -name "tor-browser_*" -type d | head -1)

if [ -z "$TOR_BROWSER_DIR" ]; then
    echo "❌ Tor Browser не найден!"
    exit 1
fi

echo "📁 Tor Browser найден: $TOR_BROWSER_DIR"

# Запуск Tor Browser
cd "$TOR_BROWSER_DIR"

# Установка переменных окружения для Tor Browser
export MOZ_NO_REMOTE=1
export MOZ_DISABLE_CONTENT_SANDBOX=1
export MOZ_DISABLE_AUTO_SAFE_MODE=1

# Переменные для безопасности и приватности
export TZ=UTC  # Единая временная зона для анонимности

# Проверяем наличие исполняемого файла
if [ -f "./Browser/firefox" ]; then
    TOR_EXEC="./Browser/firefox"
elif [ -f "./start-tor-browser.desktop" ]; then
    TOR_EXEC="./start-tor-browser.desktop"
else
    echo "❌ Исполняемый файл Tor Browser не найден!"
    exit 1
fi

echo "🚀 Запуск Tor Browser: $TOR_EXEC"

# Создание конфигурационной директории если её нет
mkdir -p ~/.mozilla/firefox

# Создание пользовательских настроек для максимальной безопасности
cat > "$TOR_BROWSER_DIR/Browser/TorBrowser/Data/Browser/profile.default/user.js" << 'EOF'
// Настройки безопасности и приватности для Tor Browser

// Отключение сохранения паролей
user_pref("signon.rememberSignons", false);
user_pref("signon.autofillForms", false);
user_pref("signon.formlessCapture.enabled", false);
user_pref("extensions.formautofill.addresses.enabled", false);
user_pref("extensions.formautofill.creditCards.enabled", false);

// Отключение автозаполнения форм
user_pref("browser.formfill.enable", false);
user_pref("signon.storeWhenAutocompleteOff", false);

// Отключение сохранения истории
user_pref("places.history.enabled", false);
user_pref("browser.privatebrowsing.autostart", true);

// Отключение кеширования
user_pref("browser.cache.disk.enable", false);
user_pref("browser.cache.disk.capacity", 0);
user_pref("browser.cache.offline.enable", false);

// Отключение cookies (кроме сессионных)
user_pref("network.cookie.lifetimePolicy", 2); // Только сессионные cookies
user_pref("network.cookie.thirdparty.sessionOnly", true);

// Блокировка JavaScript fingerprinting
user_pref("privacy.resistFingerprinting", true);
user_pref("privacy.spoof_english", 2);

// Отключение WebRTC для предотвращения утечки IP
user_pref("media.peerconnection.enabled", false);
user_pref("media.peerconnection.ice.default_address_only", true);

// Отключение геолокации
user_pref("geo.enabled", false);
user_pref("geo.provider.network.url", "");

// Блокировка уведомлений
user_pref("dom.webnotifications.enabled", false);
user_pref("dom.push.enabled", false);

// Отключение автообновлений
user_pref("app.update.auto", false);
user_pref("extensions.update.enabled", false);

// Адаптивный интерфейс для мобильных устройств
user_pref("browser.zoom.siteSpecific", false);
user_pref("dom.meta-viewport.enabled", true);
user_pref("apz.allow_zooming", true);

// Улучшенная читаемость на небольших экранах
user_pref("font.size.variable.x-western", 16);
user_pref("font.minimum-size.x-western", 14);

// Оптимизация для мобильных устройств
user_pref("browser.tabs.remote.autostart", false);
user_pref("layers.acceleration.disabled", true);

// Безопасность загрузок
user_pref("browser.download.manager.retention", 0);
user_pref("browser.helperApps.deleteTempFileOnExit", true);

// Отключение телеметрии
user_pref("toolkit.telemetry.enabled", false);
user_pref("datareporting.healthreport.uploadEnabled", false);

EOF

# Функция для запуска Tor Browser с повторными попытками
launch_tor_browser() {
    local attempt=1
    local max_attempts=5
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔄 Попытка запуска $attempt/$max_attempts"
        
        if [ "$TOR_EXEC" == "./start-tor-browser.desktop" ]; then
            # Запуск через desktop файл
            ./start-tor-browser.desktop --detach &
        else
            # Прямой запуск firefox
            $TOR_EXEC \
                --profile ./Browser/TorBrowser/Data/Browser/profile.default \
                --new-instance \
                --no-remote \
                --disable-web-security \
                --disable-features=VizDisplayCompositor &
        fi
        
        TOR_PID=$!
        
        # Ожидание запуска браузера
        sleep 10
        
        # Проверка, запустился ли браузер
        if pgrep -f "firefox" > /dev/null || pgrep -f "tor-browser" > /dev/null; then
            echo "✅ Tor Browser успешно запущен (PID: $TOR_PID)"
            
            # Ожидание полной загрузки
            sleep 5
            
            # Максимизация окна браузера
            xdotool search --onlyvisible --class "Navigator" windowactivate windowsize 100% 100% || true
            
            return 0
        else
            echo "❌ Попытка $attempt не удалась"
            attempt=$((attempt + 1))
            sleep 5
        fi
    done
    
    echo "❌ Не удалось запустить Tor Browser после $max_attempts попыток"
    return 1
}

# Запускаем Tor Browser
if launch_tor_browser; then
    echo "🎉 Tor Browser готов к работе!"
    
    # Мониторинг процесса Tor Browser
    while true; do
        if ! pgrep -f "firefox\|tor-browser" > /dev/null; then
            echo "⚠️ Tor Browser завершился, перезапускаем..."
            sleep 5
            launch_tor_browser
        fi
        sleep 10
    done
else
    echo "❌ Критическая ошибка запуска Tor Browser"
    exit 1
fi
