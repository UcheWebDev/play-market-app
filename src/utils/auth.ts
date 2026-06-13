// utils/auth.ts

export interface WalletAuth {
    userId: string;
    uid: string;
    address: string;
    walletType: 'seed_phrase' | 'private_key';
    createdAt: string;
}

export interface WalletCredentials {
    type: 'seed' | 'keys';
    seedPhrase: string | null;
    privateKey: string | null;
    publicKey: string;
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    const authData = localStorage.getItem('walletAuth');
    return authData !== null;
};

/**
 * Get authenticated user data
 */
export const getAuthUser = (): WalletAuth | null => {
    const authData = localStorage.getItem('walletAuth');
    if (!authData) return null;

    try {
        return JSON.parse(authData) as WalletAuth;
    } catch (error) {
        console.error('Error parsing auth data:', error);
        return null;
    }
};

/**
 * Get wallet credentials from localStorage
 * WARNING: In production, these should be encrypted!
 */
export const getWalletCredentials = (): WalletCredentials | null => {
    const credentials = localStorage.getItem('walletCredentials');
    if (!credentials) return null;

    try {
        return JSON.parse(credentials) as WalletCredentials;
    } catch (error) {
        console.error('Error parsing credentials:', error);
        return null;
    }
};

/**
 * Get user ID for database queries
 */
export const getUserId = (): string | null => {
    const authData = getAuthUser();
    return authData?.userId || null;
};

/**
 * Get user UID
 */
export const getUserUID = (): string | null => {
    const authData = getAuthUser();
    return authData?.uid || null;
};

/**
 * Logout user - clear all auth data
 */
export const logout = (): void => {
    localStorage.removeItem('walletAuth');
    localStorage.removeItem('walletCredentials');
};

/**
 * Update wallet auth data (useful for refreshing session)
 */
export const updateAuthData = (authData: Partial<WalletAuth>): void => {
    const currentAuth = getAuthUser();
    if (!currentAuth) return;

    const updatedAuth = { ...currentAuth, ...authData };
    localStorage.setItem('walletAuth', JSON.stringify(updatedAuth));
};

/**
 * Check if wallet exists in database by UID
 */
export const checkWalletExists = async (
    supabase: any,
    uid: string
): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('uid', uid)
            .single();

        return !error && data !== null;
    } catch (error) {
        console.error('Error checking wallet:', error);
        return false;
    }
};

/**
 * Restore session by verifying localStorage data against database
 */
export const restoreSession = async (supabase: any): Promise<boolean> => {
    const authData = getAuthUser();
    if (!authData) return false;
    // Verify the user still exists in database
    const exists = await checkWalletExists(supabase, authData.uid);
    if (!exists) {
        // Clean up invalid session
        // logout();
        return false;
    }

    return true;
};