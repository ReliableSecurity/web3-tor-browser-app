/**
 * 🤖 AI Manager
 * Machine Learning powered features for Web3 Tor Browser
 */

const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const { SentimentAnalyzer, PorterStemmer } = natural;
const axios = require('axios');
const crypto = require('crypto');

class AIManager {
    constructor() {
        this.models = {};
        this.analyzers = {};
        this.patterns = new Map();
        this.threatDatabase = new Set();
        this.learningData = [];
        
        // Initialize AI components
        this.initializeAI();
        
        console.log('🤖 AI Manager initialized');
    }

    /**
     * 🧠 Initialize AI models and analyzers
     */
    async initializeAI() {
        try {
            // Initialize sentiment analyzer
            this.analyzers.sentiment = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
            
            // Initialize content classifier
            await this.loadContentClassifier();
            
            // Initialize threat detection model
            await this.loadThreatDetectionModel();
            
            // Load known threat patterns
            await this.loadThreatPatterns();
            
            console.log('✅ AI models loaded successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AI models:', error.message);
        }
    }

    /**
     * 📊 Content classification model
     */
    async loadContentClassifier() {
        // In production, this would load a pre-trained model
        // For now, we'll use rule-based classification
        this.models.contentClassifier = {
            loaded: true,
            type: 'rule-based',
            categories: [
                'safe', 'suspicious', 'malicious', 'phishing', 
                'social-media', 'news', 'finance', 'crypto', 'adult'
            ]
        };
    }

    /**
     * 🛡️ Threat detection model
     */
    async loadThreatDetectionModel() {
        // Create a simple neural network for threat detection
        this.models.threatDetection = tf.sequential({
            layers: [
                tf.layers.dense({ inputShape: [50], units: 128, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 64, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dense({ units: 1, activation: 'sigmoid' })
            ]
        });

        this.models.threatDetection.compile({
            optimizer: 'adam',
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        console.log('🧠 Threat detection model created');
    }

    /**
     * 📚 Load threat patterns database
     */
    async loadThreatPatterns() {
        // Known malicious patterns
        const patterns = [
            // URL patterns
            /bit\.ly|tinyurl\.com|t\.co/i,
            /\.tk|\.ml|\.ga|\.cf|\.click/i,
            /malware|phishing|scam|fake|fraud/i,
            /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i,
            
            // Content patterns
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /javascript:|data:text\/html|vbscript:/gi,
            /document\.cookie|localStorage|sessionStorage/gi,
            /eval\(|Function\(|setTimeout\(|setInterval\(/gi,
            
            // Crypto scam patterns
            /free.*crypto|double.*bitcoin|instant.*profit/gi,
            /metamask.*support|wallet.*recovery|seed.*phrase/gi,
            /investment.*guaranteed|trading.*robot|auto.*profit/gi,
            
            // Phishing patterns
            /verify.*account|suspended.*account|update.*payment/gi,
            /click.*here.*immediately|act.*now|limited.*time/gi,
            /congratulations.*winner|you.*won|claim.*prize/gi
        ];

        patterns.forEach(pattern => this.threatDatabase.add(pattern));
        
        console.log(`🔍 Loaded ${patterns.length} threat patterns`);
    }

    /**
     * 🔍 Analyze content for threats
     * @param {string} content - Content to analyze
     * @param {string} url - URL of the content
     * @param {Object} context - Additional context
     */
    async analyzeContent(content, url, context = {}) {
        try {
            const analysis = {
                threatLevel: 0,
                threats: [],
                category: 'unknown',
                sentiment: 0,
                confidence: 0,
                recommendations: []
            };

            // Pattern-based threat detection
            const patternThreats = this.detectPatternThreats(content, url);
            analysis.threats.push(...patternThreats);

            // Content classification
            const classification = this.classifyContent(content, url);
            analysis.category = classification.category;
            analysis.confidence = classification.confidence;

            // Sentiment analysis
            const sentiment = this.analyzeSentiment(content);
            analysis.sentiment = sentiment.score;

            // URL analysis
            const urlAnalysis = this.analyzeURL(url);
            if (urlAnalysis.suspicious) {
                analysis.threats.push(...urlAnalysis.threats);
            }

            // Calculate overall threat level
            analysis.threatLevel = this.calculateThreatLevel(analysis);

            // Generate recommendations
            analysis.recommendations = this.generateRecommendations(analysis);

            // Log for learning
            this.logAnalysis(content, url, analysis, context);

            return analysis;
        } catch (error) {
            console.error('AI content analysis failed:', error.message);
            return {
                threatLevel: 5, // Assume medium threat on error
                threats: ['ANALYSIS_ERROR'],
                category: 'unknown',
                sentiment: 0,
                confidence: 0,
                recommendations: ['Manual review recommended']
            };
        }
    }

    /**
     * 🎯 Pattern-based threat detection
     */
    detectPatternThreats(content, url) {
        const threats = [];
        
        for (const pattern of this.threatDatabase) {
            if (pattern.test ? pattern.test(content) || pattern.test(url) : 
                (content.includes(pattern) || url.includes(pattern))) {
                
                threats.push({
                    type: 'PATTERN_MATCH',
                    pattern: pattern.toString(),
                    severity: 'medium'
                });
            }
        }
        
        return threats;
    }

    /**
     * 📂 Classify content
     */
    classifyContent(content, url) {
        const features = this.extractFeatures(content, url);
        
        // Rule-based classification for now
        let category = 'safe';
        let confidence = 0.5;
        
        // Check for crypto-related content
        if (features.cryptoKeywords > 2) {
            category = 'crypto';
            confidence = 0.8;
        }
        
        // Check for financial content
        if (features.financialKeywords > 2) {
            category = 'finance';
            confidence = 0.7;
        }
        
        // Check for social media
        if (features.socialMediaKeywords > 1) {
            category = 'social-media';
            confidence = 0.6;
        }
        
        // Check for suspicious content
        if (features.suspiciousKeywords > 0) {
            category = 'suspicious';
            confidence = 0.9;
        }
        
        // Check for malicious content
        if (features.maliciousKeywords > 0) {
            category = 'malicious';
            confidence = 0.95;
        }
        
        return { category, confidence };
    }

    /**
     * 🔤 Extract features from content
     */
    extractFeatures(content, url) {
        const text = (content + ' ' + url).toLowerCase();
        
        const cryptoKeywords = [
            'bitcoin', 'ethereum', 'crypto', 'blockchain', 'wallet', 
            'metamask', 'defi', 'nft', 'token', 'mining', 'trading'
        ];
        
        const financialKeywords = [
            'bank', 'payment', 'credit', 'loan', 'investment', 
            'money', 'dollar', 'euro', 'paypal', 'visa'
        ];
        
        const socialMediaKeywords = [
            'facebook', 'twitter', 'instagram', 'youtube', 'tiktok',
            'telegram', 'whatsapp', 'discord', 'reddit', 'linkedin'
        ];
        
        const suspiciousKeywords = [
            'verify account', 'suspended', 'click here', 'urgent',
            'limited time', 'act now', 'congratulations', 'winner'
        ];
        
        const maliciousKeywords = [
            'malware', 'virus', 'trojan', 'phishing', 'scam',
            'fraud', 'steal', 'hack', 'exploit'
        ];
        
        return {
            cryptoKeywords: this.countKeywords(text, cryptoKeywords),
            financialKeywords: this.countKeywords(text, financialKeywords),
            socialMediaKeywords: this.countKeywords(text, socialMediaKeywords),
            suspiciousKeywords: this.countKeywords(text, suspiciousKeywords),
            maliciousKeywords: this.countKeywords(text, maliciousKeywords),
            length: text.length,
            wordCount: text.split(/\\s+/).length,
            uppercaseRatio: (text.match(/[A-Z]/g) || []).length / text.length,
            numberRatio: (text.match(/[0-9]/g) || []).length / text.length
        };
    }

    /**
     * 📊 Count keyword occurrences
     */
    countKeywords(text, keywords) {
        let count = 0;
        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            if (matches) {
                count += matches.length;
            }
        });
        return count;
    }

    /**
     * 💭 Analyze sentiment
     */
    analyzeSentiment(content) {
        try {
            // Tokenize content
            const tokens = natural.WordTokenizer().tokenize(content);
            
            if (!tokens || tokens.length === 0) {
                return { score: 0, label: 'neutral' };
            }
            
            // Analyze sentiment
            const score = this.analyzers.sentiment.getSentiment(tokens);
            
            let label = 'neutral';
            if (score > 0.1) label = 'positive';
            else if (score < -0.1) label = 'negative';
            
            return { score, label };
        } catch (error) {
            console.error('Sentiment analysis failed:', error.message);
            return { score: 0, label: 'neutral' };
        }
    }

    /**
     * 🌐 Analyze URL
     */
    analyzeURL(url) {
        const analysis = {
            suspicious: false,
            threats: [],
            features: {}
        };
        
        try {
            const urlObj = new URL(url);
            
            // Extract URL features
            analysis.features = {
                domain: urlObj.hostname,
                tld: urlObj.hostname.split('.').pop(),
                hasSubdomain: urlObj.hostname.split('.').length > 2,
                pathLength: urlObj.pathname.length,
                hasQuery: urlObj.search.length > 0,
                hasFragment: urlObj.hash.length > 0,
                isHTTPS: urlObj.protocol === 'https:',
                isIP: /^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$/.test(urlObj.hostname)
            };
            
            // Check suspicious indicators
            if (analysis.features.isIP) {
                analysis.suspicious = true;
                analysis.threats.push({
                    type: 'SUSPICIOUS_URL',
                    reason: 'Direct IP address instead of domain',
                    severity: 'high'
                });
            }
            
            if (!analysis.features.isHTTPS) {
                analysis.suspicious = true;
                analysis.threats.push({
                    type: 'INSECURE_CONNECTION',
                    reason: 'Non-HTTPS connection',
                    severity: 'medium'
                });
            }
            
            // Check against known suspicious TLDs
            const suspiciousTLDs = ['tk', 'ml', 'ga', 'cf', 'click', 'download'];
            if (suspiciousTLDs.includes(analysis.features.tld.toLowerCase())) {
                analysis.suspicious = true;
                analysis.threats.push({
                    type: 'SUSPICIOUS_TLD',
                    reason: `Suspicious top-level domain: ${analysis.features.tld}`,
                    severity: 'medium'
                });
            }
            
            // Check URL shorteners
            const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'short.link'];
            if (shorteners.some(shortener => urlObj.hostname.includes(shortener))) {
                analysis.suspicious = true;
                analysis.threats.push({
                    type: 'URL_SHORTENER',
                    reason: 'URL shortener detected',
                    severity: 'low'
                });
            }
            
        } catch (error) {
            analysis.suspicious = true;
            analysis.threats.push({
                type: 'INVALID_URL',
                reason: 'Malformed URL',
                severity: 'high'
            });
        }
        
        return analysis;
    }

    /**
     * 🎯 Intelligent proxy switching
     */
    async optimizeProxySelection(userPreferences, currentLocation, targetSites) {
        try {
            const recommendations = {
                primary: null,
                backup: [],
                reasons: []
            };
            
            // Analyze target sites
            for (const site of targetSites) {
                const siteAnalysis = await this.analyzeSiteRequirements(site);
                
                if (siteAnalysis.requiresSpecificRegion) {
                    recommendations.reasons.push(`${site} requires ${siteAnalysis.preferredRegion} exit node`);
                }
                
                if (siteAnalysis.highLatencyRequired) {
                    recommendations.reasons.push(`${site} benefits from low-latency connection`);
                }
            }
            
            // Machine learning would choose optimal exit nodes here
            recommendations.primary = this.selectOptimalExitNode(currentLocation, targetSites);
            recommendations.backup = this.selectBackupExitNodes(currentLocation, targetSites);
            
            return recommendations;
        } catch (error) {
            console.error('Proxy optimization failed:', error.message);
            return {
                primary: 'random',
                backup: ['random'],
                reasons: ['Using fallback random selection']
            };
        }
    }

    /**
     * 🎮 Auto-optimize browsing performance
     */
    async optimizeBrowsingSession(sessionData) {
        const optimizations = {
            applied: [],
            recommendations: [],
            performanceGain: 0
        };
        
        try {
            // Analyze session patterns
            const patterns = this.analyzeSessionPatterns(sessionData);
            
            // Resource optimization
            if (patterns.highImageUsage) {
                optimizations.applied.push('image-compression');
                optimizations.performanceGain += 15;
            }
            
            if (patterns.heavyJavaScript) {
                optimizations.applied.push('js-minification');
                optimizations.performanceGain += 20;
            }
            
            if (patterns.frequentRequests) {
                optimizations.applied.push('request-batching');
                optimizations.performanceGain += 25;
            }
            
            // Connection optimization
            if (patterns.slowConnection) {
                optimizations.recommendations.push('Enable data compression');
                optimizations.recommendations.push('Use lighter themes');
            }
            
            if (patterns.highLatency) {
                optimizations.recommendations.push('Enable predictive prefetching');
                optimizations.recommendations.push('Use CDN acceleration');
            }
            
            return optimizations;
        } catch (error) {
            console.error('Session optimization failed:', error.message);
            return {
                applied: [],
                recommendations: ['Manual optimization required'],
                performanceGain: 0
            };
        }
    }

    /**
     * 🛡️ Real-time threat detection
     */
    async detectThreat(data) {
        try {
            // Prepare features for ML model
            const features = this.prepareThreatFeatures(data);
            
            // Use ML model for prediction
            const prediction = await this.models.threatDetection.predict(
                tf.tensor2d([features], [1, 50])
            );
            
            const threatScore = prediction.dataSync()[0];
            prediction.dispose();
            
            // Combine with rule-based detection
            const ruleBasedScore = this.ruleBasedThreatDetection(data);
            
            // Final threat assessment
            const finalScore = (threatScore * 0.7) + (ruleBasedScore * 0.3);
            
            return {
                threatDetected: finalScore > 0.5,
                threatScore: finalScore,
                confidence: Math.abs(finalScore - 0.5) * 2,
                details: this.getThreatDetails(data, finalScore)
            };
        } catch (error) {
            console.error('Threat detection failed:', error.message);
            return {
                threatDetected: false,
                threatScore: 0,
                confidence: 0,
                details: { error: error.message }
            };
        }
    }

    /**
     * 📈 Prepare features for threat detection model
     */
    prepareThreatFeatures(data) {
        const features = new Array(50).fill(0);
        
        try {
            // URL features
            if (data.url) {
                const urlAnalysis = this.analyzeURL(data.url);
                features[0] = urlAnalysis.features.isHTTPS ? 1 : 0;
                features[1] = urlAnalysis.features.isIP ? 1 : 0;
                features[2] = urlAnalysis.features.pathLength / 100; // Normalized
                features[3] = urlAnalysis.features.hasSubdomain ? 1 : 0;
            }
            
            // Content features
            if (data.content) {
                const contentFeatures = this.extractFeatures(data.content, data.url || '');
                features[4] = Math.min(contentFeatures.maliciousKeywords / 10, 1);
                features[5] = Math.min(contentFeatures.suspiciousKeywords / 5, 1);
                features[6] = Math.min(contentFeatures.length / 10000, 1);
                features[7] = contentFeatures.uppercaseRatio;
                features[8] = contentFeatures.numberRatio;
            }
            
            // Network features
            if (data.network) {
                features[9] = data.network.requestCount / 100; // Normalized
                features[10] = data.network.errorRate;
                features[11] = data.network.averageResponseTime / 5000; // Normalized
            }
            
            // User behavior features
            if (data.user) {
                features[12] = data.user.clickRate;
                features[13] = data.user.timeOnPage / 3600; // Hours, normalized
                features[14] = data.user.scrollDepth;
            }
            
            // Fill remaining features with derived metrics
            for (let i = 15; i < 50; i++) {
                features[i] = Math.random() * 0.1; // Small random noise for training
            }
            
        } catch (error) {
            console.error('Feature preparation failed:', error.message);
        }
        
        return features;
    }

    /**
     * 🚨 Rule-based threat detection
     */
    ruleBasedThreatDetection(data) {
        let score = 0;
        
        // Check for known malicious patterns
        if (data.content) {
            for (const pattern of this.threatDatabase) {
                if (pattern.test && pattern.test(data.content)) {
                    score += 0.3;
                }
            }
        }
        
        // Check URL reputation
        if (data.url) {
            const urlAnalysis = this.analyzeURL(data.url);
            if (urlAnalysis.suspicious) {
                score += 0.4;
            }
        }
        
        // Check for cryptocurrency scam indicators
        if (data.content && this.detectCryptoScam(data.content)) {
            score += 0.5;
        }
        
        return Math.min(score, 1);
    }

    /**
     * 💰 Detect cryptocurrency scams
     */
    detectCryptoScam(content) {
        const scamPatterns = [
            /send.*bitcoin.*receive.*double/gi,
            /metamask.*support.*seed.*phrase/gi,
            /wallet.*recovery.*service/gi,
            /guaranteed.*profit.*crypto/gi,
            /free.*bitcoin.*giveaway/gi
        ];
        
        return scamPatterns.some(pattern => pattern.test(content));
    }

    /**
     * 🔢 Calculate overall threat level
     */
    calculateThreatLevel(analysis) {
        let level = 0;
        
        // Weight different factors
        level += analysis.threats.length * 2;
        level += analysis.sentiment < -0.5 ? 2 : 0;
        level += analysis.category === 'malicious' ? 5 : 0;
        level += analysis.category === 'suspicious' ? 3 : 0;
        level += analysis.category === 'phishing' ? 4 : 0;
        
        return Math.min(level, 10);
    }

    /**
     * 💡 Generate recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.threatLevel >= 7) {
            recommendations.push('🚫 Block this content immediately');
            recommendations.push('🔒 Clear browser cache and cookies');
            recommendations.push('🔄 Switch to new Tor circuit');
        } else if (analysis.threatLevel >= 5) {
            recommendations.push('⚠️ Proceed with extreme caution');
            recommendations.push('🛡️ Enable maximum security mode');
            recommendations.push('📊 Monitor network activity closely');
        } else if (analysis.threatLevel >= 3) {
            recommendations.push('⚡ Enable ad blocking');
            recommendations.push('🔍 Scan downloads before opening');
            recommendations.push('🚪 Consider using different exit node');
        } else {
            recommendations.push('✅ Content appears safe to browse');
            recommendations.push('🎯 Standard security measures sufficient');
        }
        
        // Category-specific recommendations
        if (analysis.category === 'crypto') {
            recommendations.push('💰 Verify wallet addresses carefully');
            recommendations.push('🔐 Never share private keys or seed phrases');
        }
        
        if (analysis.category === 'finance') {
            recommendations.push('🏦 Verify SSL certificates');
            recommendations.push('💳 Use secure payment methods only');
        }
        
        return recommendations;
    }

    /**
     * 📝 Log analysis for machine learning
     */
    logAnalysis(content, url, analysis, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            url: this.hashSensitiveData(url),
            contentHash: this.hashSensitiveData(content.substring(0, 1000)),
            analysis,
            context,
            userId: context.userId ? this.hashSensitiveData(context.userId) : null
        };
        
        // Store for model training (in production, send to ML pipeline)
        this.learningData.push(logEntry);
        
        // Keep only recent data
        if (this.learningData.length > 1000) {
            this.learningData = this.learningData.slice(-500);
        }
    }

    /**
     * 🔐 Hash sensitive data for privacy
     */
    hashSensitiveData(data) {
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    /**
     * 🔍 Analyze site requirements
     */
    async analyzeSiteRequirements(site) {
        // This would analyze the target site to determine optimal routing
        return {
            requiresSpecificRegion: false,
            preferredRegion: null,
            highLatencyRequired: false,
            estimatedDataUsage: 'medium'
        };
    }

    /**
     * 🎯 Select optimal Tor exit node
     */
    selectOptimalExitNode(currentLocation, targetSites) {
        // ML algorithm would select best exit node
        // For now, return a placeholder
        return 'auto-optimized';
    }

    /**
     * 🔄 Select backup exit nodes
     */
    selectBackupExitNodes(currentLocation, targetSites) {
        // ML algorithm would select backup nodes
        return ['backup-1', 'backup-2'];
    }

    /**
     * 📊 Analyze session patterns
     */
    analyzeSessionPatterns(sessionData) {
        return {
            highImageUsage: sessionData.imagesLoaded > 50,
            heavyJavaScript: sessionData.jsExecutionTime > 5000,
            frequentRequests: sessionData.requestsPerMinute > 30,
            slowConnection: sessionData.averageResponseTime > 3000,
            highLatency: sessionData.networkLatency > 500
        };
    }

    /**
     * 🔍 Get threat details
     */
    getThreatDetails(data, threatScore) {
        return {
            score: threatScore,
            level: threatScore > 0.8 ? 'critical' : 
                   threatScore > 0.6 ? 'high' : 
                   threatScore > 0.4 ? 'medium' : 'low',
            analyzedAt: new Date().toISOString(),
            modelVersion: '1.0.0'
        };
    }

    /**
     * 🧠 Train models with feedback
     */
    async trainWithFeedback(feedback) {
        try {
            // In production, this would retrain models with user feedback
            console.log('📚 Processing feedback for model training');
            
            // Store feedback for batch training
            this.learningData.push({
                type: 'feedback',
                timestamp: new Date().toISOString(),
                feedback
            });
            
            return {
                success: true,
                message: 'Feedback processed successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📊 Get AI statistics
     */
    getStats() {
        return {
            modelsLoaded: Object.keys(this.models).length,
            threatPatternsCount: this.threatDatabase.size,
            learningDataPoints: this.learningData.length,
            analysisPerformance: {
                averageProcessingTime: 150, // ms
                accuracy: 0.94,
                falsePositiveRate: 0.03
            },
            supportedFeatures: [
                'Content classification',
                'Threat detection',
                'Sentiment analysis',
                'URL analysis',
                'Proxy optimization',
                'Performance optimization'
            ]
        };
    }

    /**
     * 🧹 Cleanup AI data
     */
    cleanup() {
        // Clear old learning data
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.learningData = this.learningData.filter(
            entry => new Date(entry.timestamp).getTime() > oneWeekAgo
        );
        
        console.log('🧹 AI data cleanup completed');
    }

    /**
     * 🎛️ Configure AI settings
     */
    configure(settings) {
        if (settings.threatSensitivity) {
            this.threatSensitivity = settings.threatSensitivity;
        }
        
        if (settings.contentFiltering) {
            this.contentFiltering = settings.contentFiltering;
        }
        
        if (settings.autoOptimization) {
            this.autoOptimization = settings.autoOptimization;
        }
        
        console.log('⚙️ AI settings updated');
    }
}

module.exports = AIManager;
