/**
 * 🌍 Enhanced Web3 Service
 * Multi-chain integration with DeFi support for Web3 Tor Browser
 */

const Web3 = require('web3');
const { ethers } = require('ethers');
const { default: axios } = require('axios');

// Chain configuration
const NETWORK_CONFIGS = {
    ethereum: {
        mainnet: {
            rpcUrl: 'https://mainnet.infura.io/v3/',
            chainId: 1,
            explorer: 'https://etherscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            standardTokens: {
                usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            }
        },
        goerli: {
            rpcUrl: 'https://goerli.infura.io/v3/',
            chainId: 5,
            explorer: 'https://goerli.etherscan.io',
            nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 }
        }
    },
    polygon: {
        mainnet: {
            rpcUrl: 'https://polygon-rpc.com',
            chainId: 137,
            explorer: 'https://polygonscan.com',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            standardTokens: {
                usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                dai: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
            }
        },
        mumbai: {
            rpcUrl: 'https://rpc-mumbai.maticvigil.com',
            chainId: 80001,
            explorer: 'https://mumbai.polygonscan.com',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
        }
    },
    binance: {
        mainnet: {
            rpcUrl: 'https://bsc-dataseed.binance.org',
            chainId: 56,
            explorer: 'https://bscscan.com',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            standardTokens: {
                usdt: '0x55d398326f99059fF775485246999027B3197955',
                usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                busd: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
            }
        },
        testnet: {
            rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
            chainId: 97,
            explorer: 'https://testnet.bscscan.com',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
        }
    },
    arbitrum: {
        mainnet: {
            rpcUrl: 'https://arb1.arbitrum.io/rpc',
            chainId: 42161,
            explorer: 'https://arbiscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            standardTokens: {
                usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                usdc: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
                dai: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
            }
        },
        goerli: {
            rpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
            chainId: 421613,
            explorer: 'https://goerli.arbiscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
        }
    },
    avalanche: {
        mainnet: {
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            chainId: 43114,
            explorer: 'https://snowtrace.io',
            nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
            standardTokens: {
                usdt: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
                usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
                dai: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'
            }
        },
        fuji: {
            rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
            chainId: 43113,
            explorer: 'https://testnet.snowtrace.io',
            nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
        }
    },
    fantom: {
        mainnet: {
            rpcUrl: 'https://rpc.ftm.tools',
            chainId: 250,
            explorer: 'https://ftmscan.com',
            nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 },
            standardTokens: {
                usdt: '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
                usdc: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
                dai: '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E'
            }
        },
        testnet: {
            rpcUrl: 'https://rpc.testnet.fantom.network',
            chainId: 4002,
            explorer: 'https://testnet.ftmscan.com',
            nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 }
        }
    },
    optimism: {
        mainnet: {
            rpcUrl: 'https://mainnet.optimism.io',
            chainId: 10,
            explorer: 'https://optimistic.etherscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            standardTokens: {
                usdt: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
                usdc: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
                dai: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
            }
        },
        goerli: {
            rpcUrl: 'https://goerli.optimism.io',
            chainId: 420,
            explorer: 'https://goerli-optimistic.etherscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
        }
    }
};

// DeFi protocols configuration
const DEFI_PROTOCOLS = {
    uniswap: {
        v3: {
            ethereum: {
                factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
            },
            polygon: {
                factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
            },
            arbitrum: {
                factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
            },
            optimism: {
                factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
                router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
            }
        }
    },
    aave: {
        v3: {
            ethereum: {
                lendingPool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
                dataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3'
            },
            polygon: {
                lendingPool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
                dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
            },
            avalanche: {
                lendingPool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
                dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
            },
            arbitrum: {
                lendingPool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
                dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'
            }
        }
    },
    pancakeswap: {
        v2: {
            binance: {
                factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                router: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
            }
        }
    }
};

// Common ABIs
const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint amount) returns (bool)",
    "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint amount)",
    "event Approval(address indexed owner, address indexed spender, uint value)"
];

const UNISWAP_V3_ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"
];

class EnhancedWeb3Service {
    constructor(config = {}) {
        this.providers = {};
        this.wallets = {};
        this.contracts = {};
        this.infuraApiKey = config.infuraApiKey || process.env.INFURA_API_KEY;
        this.alchemyApiKey = config.alchemyApiKey || process.env.ALCHEMY_API_KEY;
        this.useProxy = config.useProxy || false;
        this.proxyUrl = config.proxyUrl || (this.useProxy ? process.env.TOR_PROXY_URL : null);
        
        // Price cache to avoid excessive API calls
        this.priceCache = new Map();
        this.cacheExpiry = 30000; // 30 seconds
        
        // Initialize providers
        this.initializeProviders();
        
        console.log('🌐 Enhanced Web3 Service initialized with multi-chain support');
    }

    /**
     * 🔧 Initialize Web3 providers for all supported chains
     */
    initializeProviders() {
        for (const [chain, networks] of Object.entries(NETWORK_CONFIGS)) {
            this.providers[chain] = {};
            
            for (const [network, config] of Object.entries(networks)) {
                let rpcUrl = config.rpcUrl;
                
                // Add API keys for services that require them
                if (rpcUrl.includes('infura.io') && this.infuraApiKey) {
                    rpcUrl += this.infuraApiKey;
                } else if (rpcUrl.includes('alchemyapi.io') && this.alchemyApiKey) {
                    rpcUrl = rpcUrl.replace('alchemyapi.io', `alchemyapi.io/${this.alchemyApiKey}`);
                }
                
                // Create providers
                try {
                    const web3Provider = new Web3(rpcUrl);
                    const ethersProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
                    
                    this.providers[chain][network] = {
                        web3: web3Provider,
                        ethers: ethersProvider,
                        config: config
                    };
                    
                    console.log(`✅ Initialized ${chain}/${network} provider`);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${chain}/${network} provider:`, error.message);
                }
            }
        }
    }

    /**
     * 🔑 Connect wallet with private key
     */
    connectWallet(chain, network, privateKey) {
        if (!this.providers[chain] || !this.providers[chain][network]) {
            throw new Error(`Provider not found for ${chain}/${network}`);
        }
        
        try {
            const provider = this.providers[chain][network].ethers;
            const wallet = new ethers.Wallet(privateKey, provider);
            
            if (!this.wallets[chain]) {
                this.wallets[chain] = {};
            }
            
            this.wallets[chain][network] = wallet;
            
            return {
                address: wallet.address,
                chain,
                network
            };
        } catch (error) {
            throw new Error(`Failed to connect wallet: ${error.message}`);
        }
    }

    /**
     * 💰 Get native balance
     */
    async getNativeBalance(chain, network, address) {
        try {
            const provider = this.providers[chain][network].web3;
            const balance = await provider.eth.getBalance(address);
            const decimals = NETWORK_CONFIGS[chain][network].nativeCurrency.decimals;
            
            return {
                raw: balance,
                formatted: this.formatUnits(balance, decimals),
                currency: NETWORK_CONFIGS[chain][network].nativeCurrency.symbol
            };
        } catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    /**
     * 🪙 Get token balance
     */
    async getTokenBalance(chain, network, tokenAddress, walletAddress) {
        try {
            const provider = this.providers[chain][network].ethers;
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            
            const [balance, symbol, name, decimals] = await Promise.all([
                tokenContract.balanceOf(walletAddress),
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals()
            ]);
            
            return {
                raw: balance.toString(),
                formatted: ethers.utils.formatUnits(balance, decimals),
                token: {
                    address: tokenAddress,
                    symbol,
                    name,
                    decimals
                }
            };
        } catch (error) {
            throw new Error(`Failed to get token balance: ${error.message}`);
        }
    }

    /**
     * 📡 Send transaction
     */
    async sendTransaction(chain, network, txParams) {
        if (!this.wallets[chain] || !this.wallets[chain][network]) {
            throw new Error(`No wallet connected for ${chain}/${network}`);
        }
        
        try {
            const wallet = this.wallets[chain][network];
            const provider = this.providers[chain][network].ethers;
            
            // Get gas price
            const gasPrice = await provider.getGasPrice();
            
            // Create transaction
            const tx = {
                to: txParams.to,
                value: ethers.utils.parseUnits(
                    txParams.value.toString(),
                    txParams.decimals || 18
                ),
                gasLimit: txParams.gasLimit || 21000,
                gasPrice,
                nonce: await provider.getTransactionCount(wallet.address, 'latest'),
                chainId: NETWORK_CONFIGS[chain][network].chainId
            };
            
            if (txParams.data) {
                tx.data = txParams.data;
            }
            
            // Send transaction
            const sentTx = await wallet.sendTransaction(tx);
            
            return {
                hash: sentTx.hash,
                confirmed: false,
                receipt: null,
                explorer: `${NETWORK_CONFIGS[chain][network].explorer}/tx/${sentTx.hash}`
            };
        } catch (error) {
            throw new Error(`Failed to send transaction: ${error.message}`);
        }
    }

    /**
     * 🔄 Execute swap on DEX
     */
    async executeSwap(params) {
        const {
            chain,
            network,
            protocol = 'uniswap',
            version = 'v3',
            fromToken,
            toToken,
            amount,
            slippage = 0.5,
            deadline = Math.floor(Date.now() / 1000) + 20 * 60 // 20 minutes
        } = params;
        
        if (!this.wallets[chain] || !this.wallets[chain][network]) {
            throw new Error(`No wallet connected for ${chain}/${network}`);
        }
        
        if (!DEFI_PROTOCOLS[protocol] || !DEFI_PROTOCOLS[protocol][version] || 
            !DEFI_PROTOCOLS[protocol][version][chain]) {
            throw new Error(`Protocol ${protocol} ${version} not supported on ${chain}`);
        }
        
        try {
            if (protocol === 'uniswap' && version === 'v3') {
                return this.executeUniswapV3Swap(
                    chain, network, fromToken, toToken, amount, slippage, deadline
                );
            } else if (protocol === 'pancakeswap' && version === 'v2') {
                return this.executePancakeSwap(
                    chain, network, fromToken, toToken, amount, slippage, deadline
                );
            }
            
            throw new Error(`Protocol ${protocol} ${version} implementation not available`);
        } catch (error) {
            throw new Error(`Swap failed: ${error.message}`);
        }
    }

    /**
     * 🏦 Get DeFi portfolio
     */
    async getDeFiPortfolio(chain, network, address) {
        try {
            // This would integrate with DeFi aggregation services
            const portfolio = {
                totalValueUSD: 0,
                protocols: []
            };

            // Get AAVE positions
            if (DEFI_PROTOCOLS.aave.v3[chain]) {
                const aavePositions = await this.getAavePositions(chain, network, address);
                if (aavePositions.length > 0) {
                    portfolio.protocols.push({
                        name: 'AAVE',
                        positions: aavePositions
                    });
                }
            }

            return {
                success: true,
                portfolio
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📈 Get token price information
     */
    async getTokenPrice(chain, tokenAddress, vsCurrency = 'usd') {
        const cacheKey = `${chain}_${tokenAddress}_${vsCurrency}`;
        const now = Date.now();
        
        // Check cache first
        if (this.priceCache.has(cacheKey)) {
            const cached = this.priceCache.get(cacheKey);
            if (now - cached.timestamp < this.cacheExpiry) {
                return {
                    success: true,
                    price: cached.data
                };
            }
        }
        
        try {
            // Using CoinGecko API as an example
            const coinGeckoId = this.getCoinGeckoChainId(chain);
            
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/simple/token_price/${coinGeckoId}?contract_addresses=${tokenAddress}&vs_currencies=${vsCurrency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
            );
            
            if (!response.data[tokenAddress.toLowerCase()]) {
                throw new Error('Token price data not available');
            }
            
            const priceData = response.data[tokenAddress.toLowerCase()];
            const result = {
                [vsCurrency]: priceData[vsCurrency],
                marketCap: priceData[`${vsCurrency}_market_cap`],
                volume24h: priceData[`${vsCurrency}_24h_vol`],
                change24h: priceData[`${vsCurrency}_24h_change`]
            };
            
            // Cache the result
            this.priceCache.set(cacheKey, {
                data: result,
                timestamp: now
            });
            
            return {
                success: true,
                price: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📊 Get gas price estimate
     */
    async getGasPrice(chain, network) {
        try {
            const provider = this.providers[chain][network].ethers;
            
            if (chain === 'ethereum') {
                // Use EIP-1559 fee model
                const feeData = await provider.getFeeData();
                
                return {
                    success: true,
                    gasPrice: {
                        baseFeePerGas: ethers.utils.formatUnits(feeData.lastBaseFeePerGas, 'gwei'),
                        maxPriorityFeePerGas: {
                            slow: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas.div(2), 'gwei'),
                            average: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'),
                            fast: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas.mul(2), 'gwei')
                        }
                    }
                };
            } else {
                // Legacy gas price
                const gasPrice = await provider.getGasPrice();
                
                return {
                    success: true,
                    gasPrice: {
                        slow: ethers.utils.formatUnits(gasPrice.mul(8).div(10), 'gwei'),
                        average: ethers.utils.formatUnits(gasPrice, 'gwei'),
                        fast: ethers.utils.formatUnits(gasPrice.mul(12).div(10), 'gwei')
                    }
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 🏢 Get network status
     */
    async getNetworkStatus(chain, network) {
        try {
            const provider = this.providers[chain][network].web3;
            const [blockNumber, chainId, gasPrice] = await Promise.all([
                provider.eth.getBlockNumber(),
                provider.eth.getChainId(),
                provider.eth.getGasPrice()
            ]);
            
            const block = await provider.eth.getBlock(blockNumber);
            
            return {
                success: true,
                status: {
                    chainId,
                    blockNumber,
                    blockTime: new Date(block.timestamp * 1000).toISOString(),
                    gasPrice: provider.utils.fromWei(gasPrice, 'gwei'),
                    network: network
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 💎 Get popular tokens for a network
     */
    getPopularTokens(chain, network) {
        const networkConfig = NETWORK_CONFIGS[chain] && NETWORK_CONFIGS[chain][network];
        if (!networkConfig || !networkConfig.standardTokens) {
            return [];
        }

        return Object.entries(networkConfig.standardTokens).map(([symbol, address]) => ({
            symbol: symbol.toUpperCase(),
            address,
            name: this.getTokenName(symbol),
            chain,
            network
        }));
    }

    /**
     * 🔍 Get all supported chains and networks
     */
    getSupportedNetworks() {
        const networks = [];
        
        for (const [chain, chainNetworks] of Object.entries(NETWORK_CONFIGS)) {
            for (const [network, config] of Object.entries(chainNetworks)) {
                networks.push({
                    chain,
                    network,
                    chainId: config.chainId,
                    name: `${chain.charAt(0).toUpperCase() + chain.slice(1)} ${network.charAt(0).toUpperCase() + network.slice(1)}`,
                    explorer: config.explorer,
                    nativeCurrency: config.nativeCurrency
                });
            }
        }
        
        return networks;
    }

    /**
     * 🎯 Get DeFi opportunities
     */
    async getDeFiOpportunities(chain, network) {
        try {
            const opportunities = [];
            
            // Check available protocols for this chain/network
            for (const [protocolName, protocol] of Object.entries(DEFI_PROTOCOLS)) {
                for (const [version, versionData] of Object.entries(protocol)) {
                    if (versionData[chain]) {
                        opportunities.push({
                            protocol: protocolName,
                            version,
                            type: this.getProtocolType(protocolName),
                            contracts: versionData[chain]
                        });
                    }
                }
            }
            
            return {
                success: true,
                opportunities
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper methods

    /**
     * Format units with correct decimal places
     */
    formatUnits(value, decimals) {
        if (typeof value === 'string') {
            value = BigInt(value);
        }
        
        const divisor = BigInt(10) ** BigInt(decimals);
        const quotient = value / divisor;
        const remainder = value % divisor;
        
        let result = quotient.toString();
        if (remainder > 0) {
            const paddedRemainder = remainder.toString().padStart(decimals, '0');
            const trimmedRemainder = paddedRemainder.replace(/0+$/, '');
            if (trimmedRemainder.length > 0) {
                result += '.' + trimmedRemainder;
            }
        }
        
        return result;
    }

    /**
     * Get CoinGecko chain ID for API calls
     */
    getCoinGeckoChainId(chain) {
        const chainMap = {
            'ethereum': 'ethereum',
            'polygon': 'polygon-pos',
            'binance': 'binance-smart-chain',
            'avalanche': 'avalanche',
            'fantom': 'fantom',
            'arbitrum': 'arbitrum-one',
            'optimism': 'optimistic-ethereum'
        };
        
        return chainMap[chain] || chain;
    }

    /**
     * Get token name from symbol
     */
    getTokenName(symbol) {
        const names = {
            'usdt': 'Tether USD',
            'usdc': 'USD Coin',
            'dai': 'Dai Stablecoin',
            'busd': 'Binance USD'
        };
        
        return names[symbol.toLowerCase()] || symbol.toUpperCase();
    }

    /**
     * Get protocol type
     */
    getProtocolType(protocolName) {
        const types = {
            'uniswap': 'DEX',
            'aave': 'Lending',
            'compound': 'Lending',
            'pancakeswap': 'DEX'
        };
        
        return types[protocolName] || 'Unknown';
    }

    /**
     * Execute Uniswap V3 swap (simplified)
     */
    async executeUniswapV3Swap(chain, network, fromToken, toToken, amount, slippage, deadline) {
        // This would implement the actual Uniswap V3 swap logic
        // For now, return a placeholder
        throw new Error('Uniswap V3 swap implementation requires the complete Uniswap SDK');
    }

    /**
     * Get AAVE positions (simplified)
     */
    async getAavePositions(chain, network, address) {
        // This would implement AAVE position querying
        // For now, return empty array
        return [];
    }

    /**
     * 🧹 Clear cache
     */
    clearCache() {
        this.priceCache.clear();
        console.log('🧹 Web3 cache cleared');
    }

    /**
     * 📊 Get service statistics
     */
    getStats() {
        const totalProviders = Object.values(this.providers).reduce(
            (count, chainProviders) => count + Object.keys(chainProviders).length, 
            0
        );
        
        const totalWallets = Object.values(this.wallets).reduce(
            (count, chainWallets) => count + Object.keys(chainWallets).length, 
            0
        );
        
        return {
            supportedChains: Object.keys(NETWORK_CONFIGS).length,
            totalProviders,
            connectedWallets: totalWallets,
            cachedPrices: this.priceCache.size,
            supportedProtocols: Object.keys(DEFI_PROTOCOLS).length
        };
    }
}

module.exports = EnhancedWeb3Service;
