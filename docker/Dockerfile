# Используем Ubuntu как базовый образ
FROM ubuntu:22.04

# Отключаем интерактивные запросы
ENV DEBIAN_FRONTEND=noninteractive

# Устанавливаем необходимые пакеты
RUN apt-get update && apt-get install -y \
    # Система и утилиты
    wget \
    curl \
    gpg \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    # X11 и GUI
    xorg \
    xvfb \
    x11vnc \
    fluxbox \
    xdotool \
    imagemagick \
    # VNC и веб-интерфейс
    tightvncserver \
    websockify \
    novnc \
    # Шрифты для лучшей читаемости на мобильных
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-color-emoji \
    # Дополнительные утилиты
    unzip \
    psmisc \
    # Сетевые утилиты
    net-tools \
    netcat-openbsd \
    # Безопасность
    sudo \
    # Очистка кеша
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Создаем пользователя для безопасности
RUN useradd -m -s /bin/bash toruser \
    && echo "toruser:toruser123" | chpasswd \
    && usermod -aG sudo toruser

# Скачиваем и устанавливаем Tor Browser
WORKDIR /home/toruser
RUN wget -q "https://www.torproject.org/dist/torbrowser/12.5.6/tor-browser-linux64-12.5.6_ALL.tar.xz" \
    && tar -xJf tor-browser-linux64-12.5.6_ALL.tar.xz \
    && rm tor-browser-linux64-12.5.6_ALL.tar.xz \
    && chown -R toruser:toruser /home/toruser

# Создаем директории для VNC
RUN mkdir -p /home/toruser/.vnc \
    && mkdir -p /home/toruser/.fluxbox \
    && mkdir -p /home/toruser/Downloads \
    && chown -R toruser:toruser /home/toruser

# Копируем конфигурационные файлы
COPY config/vnc_startup.sh /usr/local/bin/
COPY config/fluxbox_menu /home/toruser/.fluxbox/menu
COPY config/fluxbox_init /home/toruser/.fluxbox/init
COPY config/tor_launcher.sh /usr/local/bin/
COPY config/cleanup_session.sh /usr/local/bin/

# Устанавливаем права на выполнение
RUN chmod +x /usr/local/bin/vnc_startup.sh \
    && chmod +x /usr/local/bin/tor_launcher.sh \
    && chmod +x /usr/local/bin/cleanup_session.sh \
    && chown toruser:toruser /home/toruser/.fluxbox/*

# Переключаемся на пользователя toruser
USER toruser

# Создаем VNC пароль
RUN echo "toruser123" | vncpasswd -f > /home/toruser/.vnc/passwd \
    && chmod 600 /home/toruser/.vnc/passwd

# Настраиваем переменные окружения
ENV DISPLAY=:10
ENV VNC_PORT=5910
ENV WEB_PORT=6080
ENV GEOMETRY=1920x1080
ENV VNC_PASSWORD=toruser123

# Экспортируем порты
EXPOSE $VNC_PORT $WEB_PORT

# Создаем точку входа
ENTRYPOINT ["/usr/local/bin/vnc_startup.sh"]
