// hooks/useWallet.ts
import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { getAuthUser, getUserId, getWalletCredentials } from '../utils/auth';


interface TokenBalance {
    id: string;
    token_name: string; 
    token_balance: number;
    created_at: string;
    updated_at: string;
}

interface Activity {
    id: string;
    activity_type: 'sent' | 'received';
    token_name: string;
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    to_address?: string;
    from_address?: string;
    transaction_hash?: string;
    created_at: string;
}

interface WalletData {
    userId: string;
    uid: string;
    address: string;
    walletType: 'seed_phrase' | 'private_key';
    tokenBalances: TokenBalance[];
    activities: Activity[];
    isLoading: boolean;
    error: string | null;
}

export const useWallet = () => {
    const [walletData, setWalletData] = useState<WalletData>({
        userId: '',
        uid: '',
        address: '',
        walletType: 'seed_phrase',
        tokenBalances: [],
        activities: [],
        isLoading: true,
        error: null,
    });

    const fetchWalletData = async () => {
        try {
            const authUser = getAuthUser();
            if (!authUser) {
                throw new Error('No authenticated user');
            }

            const userId = getUserId();
            if (!userId) {
                throw new Error('No user ID found');
            }

            // Fetch token balances
            const { data: balances, error: balanceError } = await supabase
                .from('token_balances')
                .select('*')
                .eq('user_id', userId)
                .order('token_name', { ascending: true });

            if (balanceError) throw balanceError;

            // Fetch recent activities
            const { data: activities, error: activityError } = await supabase
                .from('activity')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (activityError) throw activityError;

            setWalletData({
                userId: authUser.userId,
                uid: authUser.uid,
                address: authUser.address,
                walletType: authUser.walletType,
                tokenBalances: balances || [],
                activities: activities || [],
                isLoading: false,
                error: null,
            });
        } catch (err) {
            console.error('Error fetching wallet data:', err);
            setWalletData(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to load wallet data',
            }));
        }
    };

    const refreshBalance = async () => {
        await fetchWalletData();
    };

    const updateTokenBalance = async (tokenName: string, newBalance: number) => {
        try {
            const userId = getUserId();
            if (!userId) throw new Error('No user ID found');

            const { data, error } = await supabase
                .from('token_balances')
                .update({ token_balance: newBalance })
                .eq('user_id', userId)
                .eq('token_name', tokenName)
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setWalletData(prev => ({
                ...prev,
                tokenBalances: prev.tokenBalances.map(tb =>
                    tb.token_name === tokenName ? { ...tb, token_balance: newBalance } : tb
                ),
            }));

            return data;
        } catch (err) {
            console.error('Error updating balance:', err);
            throw err;
        }
    };

    const addActivity = async (
        activityType: 'sent' | 'received',
        tokenName: string,
        amount: number,
        status: 'completed' | 'pending' | 'failed',
        additionalData?: {
            toAddress?: string;
            fromAddress?: string;
            transactionHash?: string;
        }
    ) => {
        try {
            const userId = getUserId();
            if (!userId) throw new Error('No user ID found');

            const { data, error } = await supabase
                .from('activity')
                .insert([
                    {
                        user_id: userId,
                        activity_type: activityType,
                        token_name: tokenName,
                        amount: amount,
                        status: status,
                        to_address: additionalData?.toAddress,
                        from_address: additionalData?.fromAddress,
                        transaction_hash: additionalData?.transactionHash,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setWalletData(prev => ({
                ...prev,
                activities: [data, ...prev.activities],
            }));

            return data;
        } catch (err) {
            console.error('Error adding activity:', err);
            throw err;
        }
    };

    const getTokenBalance = (tokenName: string): number => {
        const token = walletData.tokenBalances.find(tb => tb.token_name === tokenName);
        return token?.token_balance || 0;
    };

    useEffect(() => {
        fetchWalletData();
    }, []);

    return {
        ...walletData,
        refreshBalance,
        updateTokenBalance,
        addActivity,
        getTokenBalance,
    };
};