const { ethers } = require('ethers');
const Web3 = require('web3');

class Web3Service {
    constructor() {
        this.providers = new Map();
        this.wallets = new Map();
        this.contracts = new Map();
        
        this.initializeProviders();
        console.log('🔗 Web3 сервис инициализирован');
    }

    initializeProviders() {
        // Основные сети
        const networks = {
            ethereum: {
                name: 'Ethereum Mainnet',
                rpc: process.env.ETHEREUM_RPC || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
                chainId: 1,
                currency: 'ETH'
            },
            polygon: {
                name: 'Polygon',
                rpc: process.env.POLYGON_RPC || 'https://polygon-rpc.com/',
                chainId: 137,
                currency: 'MATIC'
            },
            bsc: {
                name: 'Binance Smart Chain',
                rpc: process.env.BSC_RPC || 'https://bsc-dataseed.binance.org/',
                chainId: 56,
                currency: 'BNB'
            },
            arbitrum: {
                name: 'Arbitrum One',
                rpc: process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
                chainId: 42161,
                currency: 'ETH'
            }
        };

        // Инициализация провайдеров
        for (const [key, network] of Object.entries(networks)) {
            try {
                const provider = new ethers.JsonRpcProvider(network.rpc);
                this.providers.set(key, {
                    provider,
                    network,
                    web3: new Web3(network.rpc)
                });
                console.log(`✅ Провайдер ${network.name} инициализирован`);
            } catch (error) {
                console.error(`❌ Ошибка инициализации провайдера ${network.name}:`, error);
            }
        }
    }

    // Подключение кошелька
    async connectWallet(address, network = 'ethereum') {
        try {
            const providerData = this.providers.get(network);
            if (!providerData) {
                throw new Error(`Сеть ${network} не поддерживается`);
            }

            const { provider, network: networkInfo } = providerData;

            // Проверка валидности адреса
            if (!ethers.isAddress(address)) {
                throw new Error('Некорректный адрес кошелька');
            }

            // Получение баланса
            const balance = await provider.getBalance(address);
            const balanceEth = ethers.formatEther(balance);

            // Получение количества транзакций
            const transactionCount = await provider.getTransactionCount(address);

            const walletInfo = {
                address,
                network: networkInfo.name,
                balance: balanceEth,
                currency: networkInfo.currency,
                transactionCount,
                connectedAt: new Date()
            };

            this.wallets.set(address, walletInfo);

            return {
                success: true,
                wallet: walletInfo
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение баланса токена
    async getTokenBalance(walletAddress, tokenAddress, network = 'ethereum') {
        try {
            const providerData = this.providers.get(network);
            if (!providerData) {
                throw new Error(`Сеть ${network} не поддерживается`);
            }

            const { provider } = providerData;

            // ABI для ERC-20 токенов
            const erc20Abi = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)",
                "function symbol() view returns (string)",
                "function name() view returns (string)"
            ];

            const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

            const [balance, decimals, symbol, name] = await Promise.all([
                contract.balanceOf(walletAddress),
                contract.decimals(),
                contract.symbol(),
                contract.name()
            ]);

            const formattedBalance = ethers.formatUnits(balance, decimals);

            return {
                success: true,
                token: {
                    address: tokenAddress,
                    name,
                    symbol,
                    balance: formattedBalance,
                    decimals: Number(decimals)
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение информации о транзакции
    async getTransaction(txHash, network = 'ethereum') {
        try {
            const providerData = this.providers.get(network);
            if (!providerData) {
                throw new Error(`Сеть ${network} не поддерживается`);
            }

            const { provider } = providerData;

            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);

            if (!tx) {
                throw new Error('Транзакция не найдена');
            }

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: ethers.formatEther(tx.value || '0'),
                    gasPrice: ethers.formatUnits(tx.gasPrice || '0', 'gwei'),
                    gasLimit: tx.gasLimit?.toString(),
                    gasUsed: receipt?.gasUsed?.toString(),
                    status: receipt?.status === 1 ? 'success' : 'failed',
                    blockNumber: tx.blockNumber,
                    confirmations: await tx.confirmations()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Создание транзакции (только подготовка)
    async prepareTransaction(from, to, amount, network = 'ethereum') {
        try {
            const providerData = this.providers.get(network);
            if (!providerData) {
                throw new Error(`Сеть ${network} не поддерживается`);
            }

            const { provider, network: networkInfo } = providerData;

            // Проверка адресов
            if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
                throw new Error('Некорректный адрес');
            }

            // Получение текущей цены газа
            const feeData = await provider.getFeeData();
            const nonce = await provider.getTransactionCount(from);

            const transaction = {
                to,
                value: ethers.parseEther(amount.toString()),
                gasLimit: '21000',
                gasPrice: feeData.gasPrice,
                nonce,
                chainId: networkInfo.chainId
            };

            // Подсчет комиссии
            const estimatedFee = ethers.formatEther(
                BigInt(transaction.gasLimit) * (feeData.gasPrice || BigInt(0))
            );

            return {
                success: true,
                transaction: {
                    ...transaction,
                    value: ethers.formatEther(transaction.value),
                    gasPrice: ethers.formatUnits(feeData.gasPrice || '0', 'gwei'),
                    estimatedFee,
                    network: networkInfo.name
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение истории транзакций (упрощенная версия)
    async getTransactionHistory(address, network = 'ethereum', limit = 10) {
        try {
            const providerData = this.providers.get(network);
            if (!providerData) {
                throw new Error(`Сеть ${network} не поддерживается`);
            }

            const { provider } = providerData;

            // Получение последних блоков для поиска транзакций
            const currentBlock = await provider.getBlockNumber();
            const transactions = [];

            // Простой поиск по последним блокам
            for (let i = 0; i < 100 && transactions.length < limit; i++) {
                const blockNumber = currentBlock - i;
                const block = await provider.getBlock(blockNumber, true);
                
                if (block && block.transactions) {
                    for (const tx of block.transactions) {
                        if (typeof tx === 'object' && 
                            (tx.from?.toLowerCase() === address.toLowerCase() || 
                             tx.to?.toLowerCase() === address.toLowerCase())) {
                            
                            transactions.push({
                                hash: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                value: ethers.formatEther(tx.value || '0'),
                                blockNumber: tx.blockNumber,
                                timestamp: block.timestamp
                            });

                            if (transactions.length >= limit) break;
                        }
                    }
                }
            }

            return {
                success: true,
                transactions
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Получение популярных токенов
    getPopularTokens(network = 'ethereum') {
        const tokens = {
            ethereum: [
                { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'Tether USD' },
                { symbol: 'USDC', address: '0xA0b86a33E6417b2e7c4b24ced3fD5aeC60b61A6C', name: 'USD Coin' },
                { symbol: 'BNB', address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', name: 'Binance Coin' },
                { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', name: 'Uniswap' }
            ],
            polygon: [
                { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', name: 'Tether USD' },
                { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', name: 'USD Coin' }
            ]
        };

        return tokens[network] || [];
    }

    // Получение информации о сети
    async getNetworkInfo(network = 'ethereum') {
        try {
            const providerData = this.providers.get(network);
            if (!providerData) {
                throw new Error(`Сеть ${network} не поддерживается`);
            }

            const { provider, network: networkInfo } = providerData;

            const [blockNumber, gasPrice] = await Promise.all([
                provider.getBlockNumber(),
                provider.getFeeData()
            ]);

            return {
                success: true,
                network: {
                    ...networkInfo,
                    currentBlock: blockNumber,
                    gasPrice: ethers.formatUnits(gasPrice.gasPrice || '0', 'gwei')
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Валидация адреса
    validateAddress(address) {
        try {
            return {
                valid: ethers.isAddress(address),
                checksummed: ethers.getAddress(address)
            };
        } catch {
            return {
                valid: false,
                checksummed: null
            };
        }
    }

    // Конвертация единиц
    convertUnits(amount, from = 'ether', to = 'wei') {
        try {
            if (from === 'ether' && to === 'wei') {
                return ethers.parseEther(amount.toString()).toString();
            } else if (from === 'wei' && to === 'ether') {
                return ethers.formatEther(amount.toString());
            } else if (from === 'gwei' && to === 'wei') {
                return ethers.parseUnits(amount.toString(), 'gwei').toString();
            } else if (from === 'wei' && to === 'gwei') {
                return ethers.formatUnits(amount.toString(), 'gwei');
            }
            
            return amount.toString();
        } catch (error) {
            throw new Error(`Ошибка конвертации: ${error.message}`);
        }
    }

    // Получение поддерживаемых сетей
    getSupportedNetworks() {
        const networks = [];
        for (const [key, data] of this.providers.entries()) {
            networks.push({
                key,
                name: data.network.name,
                chainId: data.network.chainId,
                currency: data.network.currency
            });
        }
        return networks;
    }

    // Очистка кешированных данных
    clearCache() {
        this.wallets.clear();
        this.contracts.clear();
        console.log('🧹 Web3 кеш очищен');
    }
}

module.exports = Web3Service;
