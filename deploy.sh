#!/bin/bash

# 🚀 Web3 Tor Browser - Production Deployment Script
# ReliableSecurity - Automated Deployment & Management

set -euo pipefail

# ========================================
# 🔧 Configuration & Variables
# ========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="web3-tor-browser"
DOCKER_REGISTRY="reliablesecurity"
VERSION="${VERSION:-$(date +%Y%m%d-%H%M%S)}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emojis for better readability
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
GEAR="⚙️"
DOCKER="🐳"
MONITOR="📊"

# ========================================
# 🛠️ Helper Functions
# ========================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ${1}${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ${CROSS} ERROR: ${1}${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ${WARNING} WARNING: ${1}${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ${INFO} ${1}${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ${CHECK} ${1}${NC}"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

check_requirements() {
    log "${GEAR} Checking system requirements..."
    
    local requirements=("docker" "docker-compose" "curl" "git")
    local missing=()
    
    for req in "${requirements[@]}"; do
        if ! command -v "$req" &> /dev/null; then
            missing+=("$req")
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        error "Missing required tools: ${missing[*]}"
        info "Please install the missing tools and try again."
        exit 1
    fi
    
    success "All requirements satisfied"
}

check_docker() {
    log "${DOCKER} Checking Docker status..."
    
    if ! docker info &> /dev/null; then
        error "Docker is not running or accessible"
        info "Please start Docker and ensure your user has the necessary permissions."
        exit 1
    fi
    
    success "Docker is running"
}

create_directories() {
    log "${GEAR} Creating necessary directories..."
    
    local dirs=(
        "logs"
        "data"
        "docker/config"
        "docker/ssl"
        "backups"
        "scripts"
        "docs"
        "coverage"
        "reports"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    success "Directories created"
}

backup_existing() {
    if [ "$ENVIRONMENT" = "production" ] && [ -f "docker-compose.production.yml" ]; then
        log "${INFO} Creating backup of existing deployment..."
        local backup_dir="backups/$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup current state
        if docker-compose -f docker-compose.production.yml ps -q | xargs docker inspect &> /dev/null; then
            docker-compose -f docker-compose.production.yml config > "$backup_dir/docker-compose-backup.yml"
            success "Configuration backed up to $backup_dir"
        fi
    fi
}

generate_ssl_certs() {
    log "${GEAR} Checking SSL certificates..."
    
    local ssl_dir="docker/ssl"
    
    if [ ! -f "$ssl_dir/server.crt" ] || [ ! -f "$ssl_dir/server.key" ]; then
        warn "SSL certificates not found, generating self-signed certificates..."
        
        # Generate self-signed certificate for development/testing
        openssl req -x509 -newkey rsa:4096 -keyout "$ssl_dir/server.key" -out "$ssl_dir/server.crt" \
            -days 365 -nodes -subj "/C=US/ST=State/L=City/O=ReliableSecurity/CN=localhost"
        
        success "Self-signed SSL certificates generated"
        warn "For production, replace with proper SSL certificates"
    else
        success "SSL certificates found"
    fi
}

check_environment_file() {
    log "${GEAR} Checking environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            warn "No .env file found, copying from .env.example"
            cp .env.example .env
            warn "Please edit .env file with your actual configuration values"
        else
            error "No .env or .env.example file found"
            exit 1
        fi
    fi
    
    success "Environment file ready"
}

validate_config() {
    log "${GEAR} Validating Docker Compose configuration..."
    
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    if [ ! -f "$compose_file" ]; then
        error "Docker Compose file not found: $compose_file"
        exit 1
    fi
    
    if ! docker-compose -f "$compose_file" config &> /dev/null; then
        error "Invalid Docker Compose configuration"
        exit 1
    fi
    
    success "Docker Compose configuration is valid"
}

pull_images() {
    log "${DOCKER} Pulling latest Docker images..."
    
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    docker-compose -f "$compose_file" pull &
    spinner $!
    
    success "Docker images pulled"
}

build_images() {
    log "${DOCKER} Building Docker images..."
    
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    docker-compose -f "$compose_file" build --no-cache --parallel &
    spinner $!
    
    success "Docker images built"
}

deploy_services() {
    log "${ROCKET} Deploying services..."
    
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    # Start infrastructure services first
    info "Starting infrastructure services..."
    docker-compose -f "$compose_file" up -d \
        mongodb redis tor-proxy prometheus grafana
    
    sleep 10
    
    # Start main application
    info "Starting main application..."
    docker-compose -f "$compose_file" up -d web3-tor-browser
    
    # Start remaining services
    info "Starting remaining services..."
    docker-compose -f "$compose_file" up -d
    
    success "All services deployed"
}

wait_for_services() {
    log "${MONITOR} Waiting for services to be ready..."
    
    local services=(
        "http://localhost:3000/health:Web3 Tor Browser"
        "http://localhost:9090:Prometheus"
        "http://localhost:3001:Grafana"
        "http://localhost:6379:Redis"
        "http://localhost:27017:MongoDB"
    )
    
    for service in "${services[@]}"; do
        local url="${service%:*}"
        local name="${service#*:}"
        
        info "Checking $name..."
        local attempts=0
        local max_attempts=30
        
        while [ $attempts -lt $max_attempts ]; do
            if curl -f -s "$url" &> /dev/null; then
                success "$name is ready"
                break
            fi
            
            attempts=$((attempts + 1))
            sleep 5
            
            if [ $attempts -eq $max_attempts ]; then
                warn "$name is not responding after $((max_attempts * 5)) seconds"
            fi
        done
    done
}

show_status() {
    log "${MONITOR} Service Status:"
    
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    docker-compose -f "$compose_file" ps
    
    echo
    log "${INFO} Access URLs:"
    echo -e "${CYAN}  • Web3 Tor Browser: ${YELLOW}http://localhost:3000${NC}"
    echo -e "${CYAN}  • Grafana Dashboard: ${YELLOW}http://localhost:3001${NC}"
    echo -e "${CYAN}  • Prometheus: ${YELLOW}http://localhost:9090${NC}"
    echo -e "${CYAN}  • Portainer: ${YELLOW}http://localhost:9000${NC}"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        echo -e "${CYAN}  • MongoDB Express: ${YELLOW}http://localhost:8081${NC}"
        echo -e "${CYAN}  • Redis Commander: ${YELLOW}http://localhost:8082${NC}"
        echo -e "${CYAN}  • Documentation: ${YELLOW}http://localhost:8080${NC}"
    fi
}

cleanup_old_images() {
    log "${GEAR} Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f &> /dev/null || true
    
    # Remove old images (keep last 3 versions)
    docker images "$DOCKER_REGISTRY/$PROJECT_NAME" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
        tail -n +4 | \
        awk '{print $1}' | \
        xargs -r docker rmi &> /dev/null || true
    
    success "Cleanup completed"
}

setup_monitoring() {
    log "${MONITOR} Setting up monitoring and alerting..."
    
    # Create Grafana datasource configuration
    mkdir -p docker/config/grafana/datasources
    cat > docker/config/grafana/datasources/prometheus.yml << EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    isDefault: true
EOF
    
    # Create basic Prometheus configuration
    cat > docker/config/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'web3-tor-browser'
    static_configs:
      - targets: ['web3-tor-browser:3000']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
EOF
    
    success "Monitoring configuration created"
}

# ========================================
# 🎯 Main Deployment Functions
# ========================================

deploy_production() {
    log "${ROCKET} Starting production deployment..."
    
    check_requirements
    check_docker
    create_directories
    backup_existing
    generate_ssl_certs
    check_environment_file
    validate_config
    setup_monitoring
    pull_images
    build_images
    deploy_services
    wait_for_services
    show_status
    cleanup_old_images
    
    success "Production deployment completed successfully!"
    
    echo
    log "${INFO} Next Steps:"
    echo -e "${CYAN}  1. Update .env file with production values${NC}"
    echo -e "${CYAN}  2. Replace self-signed SSL certificates with proper ones${NC}"
    echo -e "${CYAN}  3. Configure domain name and DNS${NC}"
    echo -e "${CYAN}  4. Set up external monitoring and backups${NC}"
    echo -e "${CYAN}  5. Review security settings and firewall rules${NC}"
}

deploy_development() {
    log "${ROCKET} Starting development deployment..."
    
    check_requirements
    check_docker
    create_directories
    check_environment_file
    validate_config
    pull_images
    build_images
    
    local compose_file="docker-compose.dev.yml"
    docker-compose -f "$compose_file" up -d
    
    wait_for_services
    show_status
    
    success "Development deployment completed successfully!"
    
    echo
    log "${INFO} Development Features:"
    echo -e "${CYAN}  • Hot reload enabled${NC}"
    echo -e "${CYAN}  • Debug ports exposed${NC}"
    echo -e "${CYAN}  • Admin interfaces available${NC}"
    echo -e "${CYAN}  • Verbose logging enabled${NC}"
}

stop_services() {
    log "${GEAR} Stopping all services..."
    
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    if [ -f "$compose_file" ]; then
        docker-compose -f "$compose_file" down
        success "Services stopped"
    else
        warn "No compose file found for environment: $ENVIRONMENT"
    fi
}

restart_services() {
    log "${GEAR} Restarting services..."
    
    stop_services
    sleep 5
    
    if [ "$ENVIRONMENT" = "production" ]; then
        deploy_production
    else
        deploy_development
    fi
}

show_logs() {
    local service="${1:-}"
    local compose_file="docker-compose.${ENVIRONMENT}.yml"
    
    if [ -n "$service" ]; then
        docker-compose -f "$compose_file" logs -f "$service"
    else
        docker-compose -f "$compose_file" logs -f
    fi
}

show_help() {
    echo -e "${CYAN}${ROCKET} Web3 Tor Browser Deployment Script${NC}"
    echo
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  $0 [COMMAND] [OPTIONS]"
    echo
    echo -e "${YELLOW}Commands:${NC}"
    echo -e "  ${GREEN}deploy${NC}     Deploy the application (default: production)"
    echo -e "  ${GREEN}dev${NC}        Deploy in development mode"
    echo -e "  ${GREEN}stop${NC}       Stop all services"
    echo -e "  ${GREEN}restart${NC}    Restart all services"
    echo -e "  ${GREEN}status${NC}     Show service status"
    echo -e "  ${GREEN}logs${NC}       Show logs (optional: specify service name)"
    echo -e "  ${GREEN}update${NC}     Pull latest images and restart"
    echo -e "  ${GREEN}backup${NC}     Create backup of current state"
    echo -e "  ${GREEN}help${NC}       Show this help message"
    echo
    echo -e "${YELLOW}Environment Variables:${NC}"
    echo -e "  ${GREEN}ENVIRONMENT${NC}  Deployment environment (production|development) [default: production]"
    echo -e "  ${GREEN}VERSION${NC}      Application version tag [default: timestamp]"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 deploy                 # Deploy in production mode"
    echo -e "  $0 dev                    # Deploy in development mode"
    echo -e "  ENVIRONMENT=development $0 restart"
    echo -e "  $0 logs web3-tor-browser  # Show logs for specific service"
}

# ========================================
# 🎮 Main Script Logic
# ========================================

main() {
    local command="${1:-deploy}"
    shift || true
    
    case "$command" in
        "deploy"|"prod"|"production")
            ENVIRONMENT="production"
            deploy_production
            ;;
        "dev"|"development")
            ENVIRONMENT="development"
            deploy_development
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$@"
            ;;
        "update")
            pull_images
            restart_services
            ;;
        "backup")
            backup_existing
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $command"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Trap signals for graceful shutdown
trap 'error "Script interrupted"; exit 1' INT TERM

# Check if script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
