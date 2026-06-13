// hooks/useTokenPrices.ts
import { useState, useEffect } from 'react';
import { priceCache, TokenPrices } from '../utils/priceApi';

export const useTokenPrices = () => {
    const [prices, setPrices] = useState<TokenPrices>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPrices = async () => {
        try {
            setIsLoading(true);
            const newPrices = await priceCache.getPrices();
            setPrices(newPrices);
            setError(null);
        } catch (err) {
            console.error('Error fetching prices:', err);
            setError('Failed to fetch prices');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();

        // Refresh prices every 60 seconds
        const interval = setInterval(fetchPrices, 60000);

        return () => clearInterval(interval);
    }, []);

    const getPrice = (tokenName: string): number => {
        return prices[tokenName]?.usd || 0;
    };

    const getPriceChange = (tokenName: string): number => {
        return prices[tokenName]?.usd_24h_change || 0;
    };

    const refreshPrices = async () => {
        priceCache.clearCache();
        await fetchPrices();
    };

    return {
        prices,
        isLoading,
        error,
        getPrice,
        getPriceChange,
        refreshPrices,
    };
};