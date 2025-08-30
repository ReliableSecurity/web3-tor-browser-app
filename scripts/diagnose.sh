#!/bin/bash

echo "🔍 Web3 Tor Browser App - Диагностика системы"
echo "================================================="

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка системных требований
echo ""
print_info "Проверка системных требований..."

# ОС
OS=$(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")
print_info "Операционная система: $OS"

# Память
TOTAL_RAM=$(free -h | awk '/^Mem:/ {print $2}')
AVAILABLE_RAM=$(free -h | awk '/^Mem:/ {print $7}')
print_info "Память: $TOTAL_RAM (доступно: $AVAILABLE_RAM)"

# Диск
DISK_USAGE=$(df -h / | awk 'NR==2 {print $3"/"$2" ("$5")"}')
print_info "Использование диска: $DISK_USAGE"

# CPU
CPU_INFO=$(lscpu | grep "Model name" | cut -d':' -f2 | xargs)
CPU_CORES=$(nproc)
print_info "CPU: $CPU_INFO ($CPU_CORES ядер)"

echo ""
print_info "Проверка зависимостей..."

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_status 0 "Docker установлен (версия: $DOCKER_VERSION)"
    
    # Проверка Docker daemon
    if docker info &> /dev/null; then
        print_status 0 "Docker daemon запущен"
    else
        print_status 1 "Docker daemon не запущен"
    fi
else
    print_status 1 "Docker не установлен"
fi

# Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    print_status 0 "Docker Compose установлен (версия: $COMPOSE_VERSION)"
else
    print_status 1 "Docker Compose не установлен"
fi

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js установлен (версия: $NODE_VERSION)"
else
    print_status 1 "Node.js не установлен"
fi

# NPM
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status 0 "NPM установлен (версия: $NPM_VERSION)"
else
    print_status 1 "NPM не установлен"
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_status 0 "Git установлен (версия: $GIT_VERSION)"
else
    print_status 1 "Git не установлен"
fi

echo ""
print_info "Проверка конфигурации..."

# .env файл
if [ -f ".env" ]; then
    print_status 0 ".env файл существует"
    
    # Проверка обязательных переменных
    if grep -q "TELEGRAM_BOT_TOKEN=" .env; then
        print_status 0 "TELEGRAM_BOT_TOKEN настроен"
    else
        print_status 1 "TELEGRAM_BOT_TOKEN не настроен"
    fi
    
    if grep -q "BASE_URL=" .env; then
        print_status 0 "BASE_URL настроен"
    else
        print_warning "BASE_URL не настроен (не критично)"
    fi
else
    print_status 1 ".env файл не найден"
fi

# package.json
if [ -f "package.json" ]; then
    print_status 0 "package.json существует"
else
    print_status 1 "package.json не найден"
fi

# node_modules
if [ -d "node_modules" ]; then
    print_status 0 "Зависимости Node.js установлены"
else
    print_status 1 "Зависимости Node.js не установлены"
fi

echo ""
print_info "Проверка портов..."

# Функция проверки порта
check_port() {
    local port=$1
    local name=$2
    
    if ss -tuln | grep -q ":$port "; then
        print_warning "Порт $port ($name) занят"
        return 1
    else
        print_status 0 "Порт $port ($name) свободен"
        return 0
    fi
}

check_port 3000 "Основное приложение"
check_port 6379 "Redis"
check_port 5900 "VNC base"
check_port 6080 "Web VNC"

echo ""
print_info "Проверка сетевого подключения..."

# Интернет соединение
if ping -c 1 8.8.8.8 &> /dev/null; then
    print_status 0 "Интернет соединение работает"
else
    print_status 1 "Нет интернет соединения"
fi

# Tor сеть (проверка через API)
if curl -s --max-time 5 "https://check.torproject.org/api/ip" &> /dev/null; then
    print_status 0 "Tor API доступен"
else
    print_warning "Tor API недоступен (возможны проблемы с сетью)"
fi

# Telegram API
if [ -f ".env" ]; then
    source .env
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        if curl -s --max-time 5 "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe" | grep -q '"ok":true'; then
            print_status 0 "Telegram Bot API работает"
        else
            print_status 1 "Telegram Bot API недоступен или неверный токен"
        fi
    fi
fi

echo ""
print_info "Проверка Docker образов..."

# Проверка базовых образов
if docker images | grep -q "tor-browser-app"; then
    print_status 0 "Docker образ tor-browser-app найден"
else
    print_status 1 "Docker образ tor-browser-app не найден"
fi

if docker images | grep -q "redis"; then
    print_status 0 "Docker образ redis найден"
else
    print_warning "Docker образ redis не найден (будет загружен при запуске)"
fi

if docker images | grep -q "nginx"; then
    print_status 0 "Docker образ nginx найден"
else
    print_warning "Docker образ nginx не найден (будет загружен при запуске)"
fi

echo ""
print_info "Проверка запущенных сервисов..."

# Проверка контейнеров
if docker ps | grep -q "web3-tor-app"; then
    print_status 0 "Основное приложение запущено"
else
    print_warning "Основное приложение не запущено"
fi

if docker ps | grep -q "redis"; then
    print_status 0 "Redis сервер запущен"
else
    print_warning "Redis сервер не запущен"
fi

if docker ps | grep -q "nginx"; then
    print_status 0 "Nginx сервер запущен"
else
    print_warning "Nginx сервер не запущен"
fi

echo ""
print_info "Проверка файловой системы..."

# Права доступа
if [ -r "package.json" ]; then
    print_status 0 "Права доступа к файлам проекта корректны"
else
    print_status 1 "Нет прав доступа к файлам проекта"
fi

# Директории
for dir in "logs" "data" "docker" "src" "frontend"; do
    if [ -d "$dir" ]; then
        print_status 0 "Директория $dir существует"
    else
        print_status 1 "Директория $dir не найдена"
    fi
done

echo ""
print_info "Проверка системных ресурсов..."

# Использование памяти
MEM_USAGE=$(free | awk 'FNR==2{printf "%.0f%%", $3/($3+$4)*100}')
if [ "${MEM_USAGE%?}" -lt 80 ]; then
    print_status 0 "Использование памяти: $MEM_USAGE"
else
    print_warning "Высокое использование памяти: $MEM_USAGE"
fi

# Использование диска
DISK_USAGE_PERCENT=$(df / | awk 'FNR==2{print $5}' | sed 's/%//')
if [ "$DISK_USAGE_PERCENT" -lt 80 ]; then
    print_status 0 "Использование диска: $DISK_USAGE_PERCENT%"
else
    print_warning "Высокое использование диска: $DISK_USAGE_PERCENT%"
fi

# CPU Load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
print_info "Нагрузка CPU: $CPU_LOAD"

echo ""
print_info "Рекомендации по исправлению проблем:"
echo ""

# Рекомендации
if ! command -v docker &> /dev/null; then
    echo "🔧 Установите Docker:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    echo ""
fi

if ! command -v node &> /dev/null; then
    echo "🔧 Установите Node.js:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    echo ""
fi

if [ ! -f ".env" ]; then
    echo "🔧 Создайте конфигурационный файл:"
    echo "   cp .env.example .env && nano .env"
    echo ""
fi

if [ ! -d "node_modules" ]; then
    echo "🔧 Установите зависимости:"
    echo "   npm install"
    echo ""
fi

if ! docker images | grep -q "tor-browser-app"; then
    echo "🔧 Соберите Docker образ:"
    echo "   docker build -t tor-browser-app -f docker/Dockerfile ."
    echo ""
fi

echo "================================================="
print_info "Диагностика завершена!"
echo "Если проблемы остались, обратитесь к документации или в поддержку."
