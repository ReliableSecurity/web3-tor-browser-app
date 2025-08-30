#!/bin/bash

set -e

echo "🚀 Запуск VNC сервера для Tor Browser..."

# Настраиваем переменные окружения с значениями по умолчанию
DISPLAY=${DISPLAY:-:10}
VNC_PORT=${VNC_PORT:-5910}
WEB_PORT=${WEB_PORT:-6080}
GEOMETRY=${GEOMETRY:-1920x1080}
VNC_PASSWORD=${VNC_PASSWORD:-toruser123}
USER_AGENT=${USER_AGENT:-desktop}

# Определяем тип устройства и настраиваем разрешение соответственно
case "$USER_AGENT" in
    mobile)
        GEOMETRY="390x844"  # Мобильное разрешение (iPhone 14 размер)
        VNC_QUALITY="6"     # Среднее качество для мобильных
        VNC_COMPRESSION="9" # Высокое сжатие для мобильных
        ;;
    tablet)
        GEOMETRY="768x1024" # Планшетное разрешение (iPad)
        VNC_QUALITY="7"     # Хорошее качество
        VNC_COMPRESSION="6" # Среднее сжатие
        ;;
    *)
        GEOMETRY="1920x1080" # Десктопное разрешение по умолчанию
        VNC_QUALITY="9"      # Высокое качество для десктопа
        VNC_COMPRESSION="3"  # Низкое сжатие для десктопа
        ;;
esac

# Извлекаем номер дисплея
DISPLAY_NUM=$(echo $DISPLAY | sed 's/://g')

echo "📊 Конфигурация:"
echo "  - Дисплей: $DISPLAY"
echo "  - VNC порт: $VNC_PORT"
echo "  - Веб порт: $WEB_PORT"
echo "  - Разрешение: $GEOMETRY"

# Функция для безопасного завершения процессов
cleanup() {
    echo "🛑 Получен сигнал завершения, останавливаем сервисы..."
    
    # Остановка Tor Browser
    pkill -f "firefox" || true
    pkill -f "tor-browser" || true
    
    # Остановка VNC
    vncserver -kill $DISPLAY || true
    pkill -f "x11vnc" || true
    
    # Остановка websockify
    pkill -f "websockify" || true
    
    # Остановка Xvfb
    pkill -f "Xvfb" || true
    
    echo "🧼 Запуск процедуры очистки сессии..."
    /usr/local/bin/cleanup_session.sh
    
    echo "✅ Все сервисы остановлены и данные очищены"
    exit 0
}

# Регистрируем обработчик сигналов
trap cleanup SIGTERM SIGINT SIGQUIT

# Создание файла паролей VNC
echo "$VNC_PASSWORD" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Запуск Xvfb (виртуальный X сервер)
echo "🖥️ Запуск виртуального X сервера..."
Xvfb $DISPLAY -screen 0 ${GEOMETRY}x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Ожидание запуска X сервера
sleep 3

# Установка переменной DISPLAY для текущей сессии
export DISPLAY=$DISPLAY

# Запуск оконного менеджера Fluxbox
echo "🪟 Запуск оконного менеджера..."
fluxbox &
FLUXBOX_PID=$!

# Ожидание запуска Fluxbox
sleep 2

# Запуск VNC сервера
echo "🔗 Запуск VNC сервера на порту $VNC_PORT..."
x11vnc -display $DISPLAY -forever -usepw -shared -rfbport $VNC_PORT -bg -o /tmp/x11vnc.log
sleep 2

# Запуск websockify для веб-доступа
echo "🌐 Запуск веб-интерфейса на порту $WEB_PORT..."
websockify --web=/usr/share/novnc/ $WEB_PORT localhost:$VNC_PORT &
WEBSOCKIFY_PID=$!

# Ожидание запуска websockify
sleep 3

# Запуск Tor Browser
echo "🧅 Запуск Tor Browser..."
/usr/local/bin/tor_launcher.sh &
TOR_PID=$!

# Проверка состояния сервисов
check_services() {
    local all_running=true
    
    # Проверка Xvfb
    if ! kill -0 $XVFB_PID 2>/dev/null; then
        echo "❌ Xvfb не запущен"
        all_running=false
    fi
    
    # Проверка Fluxbox
    if ! kill -0 $FLUXBOX_PID 2>/dev/null; then
        echo "❌ Fluxbox не запущен"
        all_running=false
    fi
    
    # Проверка websockify
    if ! kill -0 $WEBSOCKIFY_PID 2>/dev/null; then
        echo "❌ Websockify не запущен"
        all_running=false
    fi
    
    # Проверка VNC
    if ! pgrep x11vnc > /dev/null; then
        echo "❌ VNC сервер не запущен"
        all_running=false
    fi
    
    if $all_running; then
        echo "✅ Все сервисы запущены успешно"
    else
        echo "⚠️ Некоторые сервисы не запущены"
    fi
}

# Проверка сервисов после запуска
sleep 5
check_services

echo "🎉 VNC сервер готов к работе!"
echo "📱 Веб-интерфейс доступен: http://localhost:$WEB_PORT/vnc.html"
echo "🔗 VNC подключение: localhost:$VNC_PORT"
echo "🔑 Пароль VNC: $VNC_PASSWORD"

# Вывод логов в реальном времени
tail -f /tmp/x11vnc.log &

# Мониторинг сервисов каждые 30 секунд
while true; do
    sleep 30
    
    # Перезапуск Tor Browser если он упал
    if ! pgrep -f "firefox\|tor-browser" > /dev/null; then
        echo "⚠️ Tor Browser не запущен, перезапускаем..."
        /usr/local/bin/tor_launcher.sh &
    fi
    
    # Проверка VNC сервера
    if ! pgrep x11vnc > /dev/null; then
        echo "⚠️ VNC сервер упал, перезапускаем..."
        x11vnc -display $DISPLAY -forever -usepw -shared -rfbport $VNC_PORT -bg -o /tmp/x11vnc.log
    fi
    
    # Проверка websockify
    if ! kill -0 $WEBSOCKIFY_PID 2>/dev/null; then
        echo "⚠️ Websockify упал, перезапускаем..."
        websockify --web=/usr/share/novnc/ $WEB_PORT localhost:$VNC_PORT &
        WEBSOCKIFY_PID=$!
    fi
done
