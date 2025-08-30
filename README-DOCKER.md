# 🐳 Docker Deployment Guide

Complete Docker deployment configuration for Web3 Tor Browser with comprehensive monitoring, security, and scalability features.

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🏗️ Architecture](#️-architecture)  
- [📦 Services](#-services)
- [🔧 Configuration](#-configuration)
- [💻 Development](#-development)
- [🚀 Production](#-production)
- [📊 Monitoring](#-monitoring)
- [🔒 Security](#-security)
- [🛠️ Troubleshooting](#️-troubleshooting)

## 🚀 Quick Start

### Prerequisites

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Git** (for cloning the repository)
- **curl** (for health checks)
- **8GB RAM minimum** (16GB recommended for production)
- **20GB disk space minimum**

### One-Command Deployment

```bash
# Production deployment
./deploy.sh

# Development deployment  
./deploy.sh dev

# Check status
./deploy.sh status
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 Load Balancer                   │
│                    (Nginx)                      │
├─────────────────────────────────────────────────┤
│              Web3 Tor Browser App               │
│            (Multiple Replicas)                  │
├─────────────────────────────────────────────────┤
│  Database     │  Cache      │  Tor Network      │
│  (MongoDB)    │  (Redis)    │  (Tor Proxy)      │
├─────────────────────────────────────────────────┤
│              Monitoring Stack                   │
│  Prometheus │ Grafana │ AlertManager │ Jaeger   │
├─────────────────────────────────────────────────┤
│              Logging Stack                      │
│  Elasticsearch │ Logstash │ Kibana             │
└─────────────────────────────────────────────────┘
```

## 📦 Services

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| **web3-tor-browser** | 3000 | Main application |
| **nginx** | 80, 443 | Load balancer & reverse proxy |
| **tor-proxy** | 9050, 9051 | Tor SOCKS5 proxy |
| **mongodb** | 27017 | Database |
| **redis** | 6379 | Cache & session store |

### Monitoring Services

| Service | Port | Description |
|---------|------|-------------|
| **prometheus** | 9090 | Metrics collection |
| **grafana** | 3001 | Dashboards & visualization |
| **alertmanager** | 9093 | Alert management |
| **jaeger** | 16686 | Distributed tracing |
| **node-exporter** | 9100 | System metrics |
| **cadvisor** | 8080 | Container metrics |

### Logging Services

| Service | Port | Description |
|---------|------|-------------|
| **elasticsearch** | 9200 | Log storage |
| **logstash** | 5044, 5000 | Log processing |
| **kibana** | 5601 | Log visualization |

### Management Services

| Service | Port | Description |
|---------|------|-------------|
| **portainer** | 9000 | Container management |

## 🔧 Configuration

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure essential variables:**
   ```bash
   # Edit .env file
   nano .env
   
   # Required variables:
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ENCRYPTION_KEY=your-32-character-key-here
   JWT_SECRET=your-jwt-secret-here
   MONGO_ROOT_PASSWORD=your-mongodb-password
   ```

3. **Generate secure keys:**
   ```bash
   # Generate 32-character encryption key
   openssl rand -base64 32
   
   # Generate JWT secret
   openssl rand -base64 64
   ```

### SSL Certificates

For production, replace self-signed certificates:

```bash
# Place your certificates in docker/ssl/
cp your-cert.pem docker/ssl/server.crt
cp your-key.pem docker/ssl/server.key
```

## 💻 Development

### Start Development Environment

```bash
./deploy.sh dev
```

### Development Features

- **Hot reload** for code changes
- **Debug ports** exposed (Node.js: 9229)
- **Admin interfaces** available:
  - MongoDB Express: http://localhost:8081
  - Redis Commander: http://localhost:8082
  - Documentation: http://localhost:8080

### Development Tools

```bash
# Run tests
docker-compose -f docker-compose.dev.yml --profile testing up test-runner

# View logs with filtering
./deploy.sh logs web3-tor-browser-dev

# Start with email testing
docker-compose -f docker-compose.dev.yml --profile email-testing up mailcatcher

# Frontend development with hot reload
docker-compose -f docker-compose.dev.yml --profile frontend-dev up webpack-dev
```

## 🚀 Production

### Production Deployment

```bash
./deploy.sh deploy
```

### Production Features

- **High availability** with multiple replicas
- **Load balancing** with Nginx
- **Health checks** for all services
- **Resource limits** and reservations
- **Automatic restarts** on failure
- **Security hardening**

### Scaling

```bash
# Scale web application
docker-compose -f docker-compose.production.yml up -d --scale web3-tor-browser=5

# Check scaling
./deploy.sh status
```

### Production Checklist

- [ ] Update `.env` with production values
- [ ] Replace SSL certificates
- [ ] Configure domain name and DNS
- [ ] Set up external monitoring
- [ ] Configure backup strategy
- [ ] Review firewall rules
- [ ] Test disaster recovery

## 📊 Monitoring

### Access Dashboards

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601
- **Jaeger**: http://localhost:16686

### Key Metrics

- **Application performance** (response time, throughput)
- **System resources** (CPU, memory, disk)
- **Network traffic** and Tor circuit health
- **Database performance** and connections
- **Error rates** and security events

### Alerting

Configure alerts in `docker/config/alertmanager.yml`:

```yaml
route:
  group_by: ['alertname']
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://your-webhook-url'
```

## 🔒 Security

### Security Features

- **Network isolation** with custom Docker networks
- **Resource limits** to prevent DoS
- **Non-root containers** where possible
- **Secrets management** via environment variables
- **Health checks** for all services
- **Log monitoring** and analysis

### Security Best Practices

1. **Use strong passwords** for all services
2. **Enable TLS** for all external communications
3. **Regularly update** container images
4. **Monitor logs** for suspicious activity
5. **Implement** proper backup and recovery
6. **Use secrets management** for sensitive data

### Hardening Checklist

- [ ] Change default passwords
- [ ] Enable firewall rules
- [ ] Set up intrusion detection
- [ ] Configure log retention
- [ ] Implement backup encryption
- [ ] Regular security updates

## 🛠️ Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check service status
./deploy.sh status

# View logs for specific service
./deploy.sh logs mongodb

# Restart services
./deploy.sh restart
```

#### Port Conflicts

```bash
# Check port usage
sudo netstat -tulpn | grep :3000

# Stop conflicting services
sudo systemctl stop nginx  # if system nginx is running
```

#### Database Connection Issues

```bash
# Check MongoDB health
docker exec mongodb mongosh --eval "db.runCommand('ping')"

# Check Redis connectivity
docker exec redis-cache redis-cli ping
```

#### Memory Issues

```bash
# Check resource usage
docker stats

# View system resources
free -h
df -h
```

### Log Analysis

```bash
# View all logs
./deploy.sh logs

# Filter logs by level
./deploy.sh logs web3-tor-browser | grep ERROR

# Export logs for analysis
docker-compose -f docker-compose.production.yml logs --no-color > logs/export.log
```

### Performance Tuning

#### Database Optimization

```bash
# MongoDB indexing
docker exec mongodb mongosh web3tordb --eval "db.sessions.createIndex({userId: 1, createdAt: 1})"

# Redis memory optimization
docker exec redis-cache redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

#### Application Tuning

```bash
# Increase worker processes
export NODE_CLUSTER_WORKERS=4
./deploy.sh restart

# Optimize heap size
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Backup and Recovery

#### Create Backup

```bash
./deploy.sh backup

# Manual database backup
docker exec mongodb mongodump --out /backup/$(date +%Y%m%d)
docker exec redis-cache redis-cli --rdb /backup/redis-$(date +%Y%m%d).rdb
```

#### Restore from Backup

```bash
# Restore MongoDB
docker exec mongodb mongorestore /backup/20240101/

# Restore Redis
docker exec redis-cache redis-cli DEBUG RESTART
```

### Health Checks

```bash
# Application health
curl -f http://localhost:3000/health

# Database health
curl -f http://localhost:9200/_cluster/health

# Service discovery
docker network inspect web3-tor-network
```

### Update Strategy

```bash
# Pull latest images
./deploy.sh update

# Rolling update (zero downtime)
docker-compose -f docker-compose.production.yml up -d --no-deps web3-tor-browser

# Verify update
./deploy.sh status
```

## 📞 Support

For additional support:

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check inline code documentation
- **Community**: Join our Discord/Telegram community
- **Enterprise**: Contact ReliableSecurity for enterprise support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by ReliableSecurity**
