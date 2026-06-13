// utils/priceApi.ts

// CoinGecko API - Free tier: 10-30 calls/minute
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Map token names to CoinGecko IDs
const TOKEN_ID_MAP: Record<string, string> = {
    'Ethereum': 'ethereum',
    'Solana': 'solana',
    'Tether': 'tether',
    'Bitcoin': 'bitcoin',
};

export interface TokenPrice {
    usd: number;
    usd_24h_change: number;
    usd_market_cap?: number;
}

export interface TokenPrices {
    [tokenName: string]: TokenPrice;
}

/**
 * Fetch current prices for all tokens
 */
export const fetchTokenPrices = async (): Promise<TokenPrices> => {
    try {
        const ids = Object.values(TOKEN_ID_MAP).join(',');

        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }

        const data = await response.json();

        // Convert CoinGecko response to our format
        const prices: TokenPrices = {};

        for (const [tokenName, coinGeckoId] of Object.entries(TOKEN_ID_MAP)) {
            const priceData = data[coinGeckoId];
            if (priceData) {
                prices[tokenName] = {
                    usd: priceData.usd,
                    usd_24h_change: priceData.usd_24h_change || 0,
                    usd_market_cap: priceData.usd_market_cap,
                };
            }
        }

        return prices;
    } catch (error) {
        console.error('Error fetching token prices:', error);
        // Return fallback prices if API fails
        return {
            'Ethereum': { usd: 3000, usd_24h_change: 0 },
            'Solana': { usd: 150, usd_24h_change: 0 },
            'Tether': { usd: 1, usd_24h_change: 0 },
            'Bitcoin': { usd: 95000, usd_24h_change: 0 },
        };
    }
};

/**
 * Fetch price for a single token
 */
export const fetchSingleTokenPrice = async (tokenName: string): Promise<TokenPrice | null> => {
    try {
        const coinGeckoId = TOKEN_ID_MAP[tokenName];
        if (!coinGeckoId) {
            console.error(`No CoinGecko ID found for ${tokenName}`);
            return null;
        }

        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch price');
        }

        const data = await response.json();
        const priceData = data[coinGeckoId];

        if (!priceData) return null;

        return {
            usd: priceData.usd,
            usd_24h_change: priceData.usd_24h_change || 0,
            usd_market_cap: priceData.usd_market_cap,
        };
    } catch (error) {
        console.error(`Error fetching price for ${tokenName}:`, error);
        return null;
    }
};

/**
 * Fetch historical price data for charts (last 30 days)
 */
export const fetchPriceHistory = async (tokenName: string): Promise<{ time: number; price: number }[]> => {
    try {
        const coinGeckoId = TOKEN_ID_MAP[tokenName];
        if (!coinGeckoId) {
            console.error(`No CoinGecko ID found for ${tokenName}`);
            return [];
        }

        const response = await fetch(
            `${COINGECKO_API}/coins/${coinGeckoId}/market_chart?vs_currency=usd&days=30&interval=daily`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch price history');
        }

        const data = await response.json();

        // Convert CoinGecko format to our format
        return data.prices.map((item: [number, number], index: number) => ({
            time: index,
            price: item[1],
        }));
    } catch (error) {
        console.error(`Error fetching price history for ${tokenName}:`, error);
        return [];
    }
};

/**
 * Cache prices to avoid hitting rate limits
 */
class PriceCache {
    private cache: Map<string, { data: TokenPrices; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 60000; // 1 minute

    async getPrices(): Promise<TokenPrices> {
        const cached = this.cache.get('prices');
        const now = Date.now();

        if (cached && now - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        const prices = await fetchTokenPrices();
        this.cache.set('prices', { data: prices, timestamp: now });
        return prices;
    }

    clearCache() {
        this.cache.clear();
    }
}

export const priceCache = new PriceCache();

/**
 * Format price with appropriate decimals
 */
export const formatPrice = (price: number): string => {
    if (price < 0.01) {
        return price.toFixed(6);
    } else if (price < 1) {
        return price.toFixed(4);
    } else if (price < 100) {
        return price.toFixed(2);
    } else {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
};

/**
 * Format 24h change with color
 */
export const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
};

/**
 * Format 24h change percentage
 */
export const formatPriceChange = (change: number): string => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
};