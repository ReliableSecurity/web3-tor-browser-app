/**
 * 🛡️ Advanced Security Manager
 * Enterprise-grade security features for Web3 Tor Browser
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const bcrypt = require('bcrypt');

class SecurityManager {
    constructor() {
        this.rateLimiters = new Map();
        this.failedAttempts = new Map();
        this.ipWhitelist = new Set();
        this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
        this.algorithm = 'aes-256-gcm';
        
        // Initialize security settings
        this.initializeSecurity();
    }

    /**
     * 🔧 Initialize security configurations
     */
    initializeSecurity() {
        // Load IP whitelist from environment
        const whitelist = process.env.IP_WHITELIST;
        if (whitelist) {
            whitelist.split(',').forEach(ip => {
                if (validator.isIP(ip.trim())) {
                    this.ipWhitelist.add(ip.trim());
                }
            });
        }

        console.log('🛡️ Security Manager initialized');
        console.log(`📊 IP Whitelist: ${this.ipWhitelist.size} entries`);
    }

    /**
     * 🚦 Create rate limiter for different endpoints
     */
    createRateLimiter(name, options = {}) {
        const defaultOptions = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                error: 'Too many requests',
                retryAfter: Math.ceil(options.windowMs / 1000) || 900
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                    ip: req.ip,
                    endpoint: req.path,
                    userAgent: req.get('User-Agent')
                });
                
                res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: Math.ceil((options.windowMs || 900000) / 1000)
                });
            }
        };

        const limiterOptions = { ...defaultOptions, ...options };
        const limiter = rateLimit(limiterOptions);
        
        this.rateLimiters.set(name, limiter);
        return limiter;
    }

    /**
     * 🔐 Two-Factor Authentication setup
     */
    generateTwoFactorSecret(userId) {
        const secret = speakeasy.generateSecret({
            name: `Web3TorBrowser:${userId}`,
            issuer: 'ReliableSecurity',
            length: 32
        });

        return {
            secret: secret.base32,
            qrCode: secret.otpauth_url,
            backupCodes: this.generateBackupCodes()
        };
    }

    /**
     * 🔍 Verify 2FA token
     */
    verifyTwoFactor(secret, token, window = 2) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: window
        });
    }

    /**
     * 🎫 Generate backup codes for 2FA
     */
    generateBackupCodes(count = 10) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }

    /**
     * 🔒 Advanced encryption for sensitive data
     */
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * 🔓 Decrypt sensitive data
     */
    decrypt(encryptedData) {
        try {
            const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error('Decryption failed');
        }
    }

    /**
     * 🛡️ Helmet security headers configuration
     */
    getHelmetConfig() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:", "blob:"],
                    connectSrc: ["'self'", "https:", "wss:"],
                    frameSrc: ["'self'", "https://telegram.org"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: []
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            xssFilter: true,
            referrerPolicy: { policy: 'same-origin' }
        });
    }

    /**
     * 🌐 IP whitelist middleware
     */
    ipWhitelistMiddleware() {
        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress;
            
            // Skip whitelist check for localhost in development
            if (process.env.NODE_ENV === 'development' && 
                (clientIP === '127.0.0.1' || clientIP === '::1')) {
                return next();
            }

            if (this.ipWhitelist.size > 0 && !this.ipWhitelist.has(clientIP)) {
                this.logSecurityEvent('IP_BLOCKED', {
                    ip: clientIP,
                    endpoint: req.path,
                    userAgent: req.get('User-Agent')
                });

                return res.status(403).json({
                    success: false,
                    error: 'Access denied: IP not whitelisted'
                });
            }

            next();
        };
    }

    /**
     * 🔐 CSRF protection middleware
     */
    csrfProtection() {
        return (req, res, next) => {
            if (req.method === 'GET') return next();

            const token = req.headers['x-csrf-token'] || req.body._csrf;
            const sessionToken = req.session?.csrfToken;

            if (!token || !sessionToken || token !== sessionToken) {
                this.logSecurityEvent('CSRF_ATTACK_BLOCKED', {
                    ip: req.ip,
                    endpoint: req.path,
                    providedToken: token ? 'present' : 'missing'
                });

                return res.status(403).json({
                    success: false,
                    error: 'CSRF token validation failed'
                });
            }

            next();
        };
    }

    /**
     * 🚫 Brute force protection
     */
    bruteForceProtection() {
        return (req, res, next) => {
            const key = `${req.ip}_${req.path}`;
            const attempts = this.failedAttempts.get(key) || 0;

            if (attempts >= 5) {
                const resetTime = Date.now() + (30 * 60 * 1000); // 30 minutes
                
                this.logSecurityEvent('BRUTE_FORCE_BLOCKED', {
                    ip: req.ip,
                    endpoint: req.path,
                    attempts: attempts,
                    resetTime: new Date(resetTime).toISOString()
                });

                return res.status(429).json({
                    success: false,
                    error: 'Too many failed attempts. Try again in 30 minutes.',
                    resetTime: resetTime
                });
            }

            req.securityContext = {
                failedAttempts: attempts,
                recordFailure: () => {
                    this.failedAttempts.set(key, attempts + 1);
                    setTimeout(() => {
                        this.failedAttempts.delete(key);
                    }, 30 * 60 * 1000);
                },
                clearFailures: () => {
                    this.failedAttempts.delete(key);
                }
            };

            next();
        };
    }

    /**
     * 🔍 Input validation and sanitization
     */
    validateInput(input, rules) {
        const errors = [];

        for (const [field, rule] of Object.entries(rules)) {
            const value = input[field];

            if (rule.required && (!value || value.trim() === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value) {
                if (rule.type === 'email' && !validator.isEmail(value)) {
                    errors.push(`${field} must be a valid email`);
                }
                if (rule.type === 'url' && !validator.isURL(value)) {
                    errors.push(`${field} must be a valid URL`);
                }
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${field} must be at least ${rule.minLength} characters`);
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${field} cannot exceed ${rule.maxLength} characters`);
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(`${field} format is invalid`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🏷️ Generate secure session token
     */
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * 🔐 Hash password with salt
     */
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * ✅ Verify password
     */
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * 📝 Log security events
     */
    logSecurityEvent(event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: event,
            data: data,
            severity: this.getEventSeverity(event)
        };

        // In production, send to security monitoring service
        if (process.env.NODE_ENV === 'production') {
            console.warn('🚨 SECURITY EVENT:', JSON.stringify(logEntry));
            
            // TODO: Send to external security service
            // await this.sendToSecurityService(logEntry);
        } else {
            console.log('🛡️ Security Event:', logEntry);
        }
    }

    /**
     * ⚠️ Get event severity level
     */
    getEventSeverity(event) {
        const severityMap = {
            'RATE_LIMIT_EXCEEDED': 'medium',
            'IP_BLOCKED': 'high',
            'CSRF_ATTACK_BLOCKED': 'high',
            'BRUTE_FORCE_BLOCKED': 'critical',
            'UNAUTHORIZED_ACCESS': 'high',
            'SUSPICIOUS_ACTIVITY': 'medium',
            'SESSION_HIJACK_ATTEMPT': 'critical'
        };

        return severityMap[event] || 'low';
    }

    /**
     * 🔄 Cleanup expired security data
     */
    cleanup() {
        const now = Date.now();
        
        // Cleanup expired failed attempts
        for (const [key, data] of this.failedAttempts.entries()) {
            if (data.expiry && data.expiry < now) {
                this.failedAttempts.delete(key);
            }
        }

        console.log('🧹 Security cleanup completed');
    }

    /**
     * 📊 Get security metrics
     */
    getSecurityMetrics() {
        return {
            activeRateLimiters: this.rateLimiters.size,
            blockedIPs: this.failedAttempts.size,
            whitelistedIPs: this.ipWhitelist.size,
            securityLevel: 'enterprise'
        };
    }

    /**
     * 🔒 Advanced session security
     */
    generateSecureSession(userId) {
        const sessionId = this.generateSecureToken(32);
        const csrfToken = this.generateSecureToken(16);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        return {
            sessionId,
            csrfToken,
            userId,
            expiresAt,
            createdAt: new Date(),
            ipAddress: null, // Set by middleware
            userAgent: null, // Set by middleware
            isSecure: true
        };
    }

    /**
     * 🌐 Web3 security validation
     */
    validateWeb3Transaction(transaction) {
        const errors = [];

        // Validate address format
        if (!this.isValidEthereumAddress(transaction.to)) {
            errors.push('Invalid recipient address');
        }

        // Validate amount
        if (!transaction.value || isNaN(transaction.value) || transaction.value <= 0) {
            errors.push('Invalid transaction amount');
        }

        // Validate gas limits
        if (transaction.gasLimit && transaction.gasLimit > 1000000) {
            errors.push('Gas limit too high - possible attack');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 🏦 Validate Ethereum address
     */
    isValidEthereumAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * 🎯 Anomaly detection for suspicious behavior
     */
    detectAnomalies(userActivity) {
        const anomalies = [];

        // Check for rapid successive requests
        if (userActivity.requestsPerMinute > 60) {
            anomalies.push('HIGH_REQUEST_FREQUENCY');
        }

        // Check for unusual geographic patterns
        if (userActivity.countryChanges > 3) {
            anomalies.push('MULTIPLE_COUNTRIES');
        }

        // Check for tor exit node switching
        if (userActivity.torNodeSwitches > 10) {
            anomalies.push('EXCESSIVE_TOR_SWITCHING');
        }

        // Check for Web3 transaction patterns
        if (userActivity.web3Transactions > 20) {
            anomalies.push('HIGH_WEB3_ACTIVITY');
        }

        if (anomalies.length > 0) {
            this.logSecurityEvent('ANOMALY_DETECTED', {
                userId: userActivity.userId,
                anomalies: anomalies,
                activity: userActivity
            });
        }

        return anomalies;
    }

    /**
     * 🛡️ Content security scanning
     */
    scanContent(content, type = 'html') {
        const threats = [];

        // Check for malicious scripts
        const scriptPatterns = [
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /javascript:/gi,
            /data:text\/html/gi,
            /vbscript:/gi
        ];

        scriptPatterns.forEach(pattern => {
            if (pattern.test(content)) {
                threats.push('MALICIOUS_SCRIPT_DETECTED');
            }
        });

        // Check for suspicious URLs
        const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
        const urls = content.match(urlPattern) || [];
        
        urls.forEach(url => {
            if (this.isSuspiciousUrl(url)) {
                threats.push('SUSPICIOUS_URL_DETECTED');
            }
        });

        return {
            isSafe: threats.length === 0,
            threats: threats,
            scannedAt: new Date().toISOString()
        };
    }

    /**
     * 🔍 Check if URL is suspicious
     */
    isSuspiciousUrl(url) {
        const suspiciousPatterns = [
            /bit\.ly|tinyurl\.com|t\.co/i, // URL shorteners
            /\.tk|\.ml|\.ga|\.cf/i, // Suspicious TLDs
            /malware|phishing|scam/i, // Obvious threats
            /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i // Raw IP addresses
        ];

        return suspiciousPatterns.some(pattern => pattern.test(url));
    }

    /**
     * 🔄 Security middleware factory
     */
    createSecurityMiddleware() {
        return {
            helmet: this.getHelmetConfig(),
            rateLimiter: this.createRateLimiter('general', {
                windowMs: 15 * 60 * 1000,
                max: 1000
            }),
            apiRateLimiter: this.createRateLimiter('api', {
                windowMs: 15 * 60 * 1000,
                max: 500
            }),
            authRateLimiter: this.createRateLimiter('auth', {
                windowMs: 15 * 60 * 1000,
                max: 10
            }),
            ipWhitelist: this.ipWhitelistMiddleware(),
            bruteForce: this.bruteForceProtection(),
            csrf: this.csrfProtection()
        };
    }

    /**
     * 📊 Security dashboard data
     */
    getDashboardData() {
        return {
            metrics: this.getSecurityMetrics(),
            recentEvents: this.getRecentSecurityEvents(),
            threatLevel: this.calculateThreatLevel(),
            recommendations: this.getSecurityRecommendations()
        };
    }

    /**
     * 📈 Calculate current threat level
     */
    calculateThreatLevel() {
        const metrics = this.getSecurityMetrics();
        
        if (metrics.blockedIPs > 50) return 'HIGH';
        if (metrics.blockedIPs > 20) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * 💡 Get security recommendations
     */
    getSecurityRecommendations() {
        const recommendations = [];
        
        if (this.ipWhitelist.size === 0) {
            recommendations.push('Consider enabling IP whitelisting for production');
        }
        
        if (process.env.NODE_ENV !== 'production') {
            recommendations.push('Ensure all security features are enabled in production');
        }

        return recommendations;
    }

    /**
     * 📋 Get recent security events
     */
    getRecentSecurityEvents() {
        // In production, this would query a security log database
        return [];
    }
}

module.exports = SecurityManager;
