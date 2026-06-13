import React, { createContext, useContext, useState, useEffect } from 'react';

interface TwitterProfile {
  name: string | null;
  bio: string | null;
  location: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  accountCreatedAt: string | null;
}

interface TwitterAuthData {
  isConnected: boolean;
  username: string | null;
  userId: string | null;
  profile: TwitterProfile | null;
}

interface TwitterContextType {
  twitterAuth: TwitterAuthData;
  connectTwitter: (walletAddress: string) => Promise<void>;
  disconnectTwitter: () => void;
  checkTwitterConnection: (walletAddress: string) => Promise<void>;
  isLoading: boolean;
}

const TwitterContext = createContext<TwitterContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || 'https://your-api-url.com';

export const TwitterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [twitterAuth, setTwitterAuth] = useState<TwitterAuthData>({
    isConnected: false,
    username: null,
    userId: null,
    profile: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const connectTwitter = async (walletAddress: string) => {
    try {
      setIsLoading(true);

      // Request Twitter auth link from backend
      const response = await fetch(`${API_BASE_URL}/twitter-auth?action=request_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Twitter auth link');
      }

      const data = await response.json();

      // Store wallet address for callback verification
      sessionStorage.setItem('twitter_auth_wallet', walletAddress);

      // Open Twitter auth in popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        data.url,
        'TwitterAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for window closure and check auth status
      const pollTimer = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          // Check if authentication was successful
          await checkTwitterConnection(walletAddress);
          setIsLoading(false);
        }
      }, 500);
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const checkTwitterConnection = async (walletAddress: string) => {
    try {
      // Check if user has Twitter auth in database and is connected
      const response = await fetch(
        `${API_BASE_URL}/twitter/check?walletAddress=${walletAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.isConnected) {
          setTwitterAuth({
            isConnected: true,
            username: data.username || null,
            userId: data.userId || null,
            profile: data.profile || null,
          });
        }
      }
    } catch (error) {
      console.error('Error checking Twitter connection:', error);
    }
  };

  const disconnectTwitter = () => {
    setTwitterAuth({
      isConnected: false,
      username: null,
      userId: null,
      profile: null,
    });
  };

  return (
    <TwitterContext.Provider
      value={{
        twitterAuth,
        connectTwitter,
        disconnectTwitter,
        checkTwitterConnection,
        isLoading,
      }}
    >
      {children}
    </TwitterContext.Provider>
  );
};

export const useTwitter = () => {
  const context = useContext(TwitterContext);
  if (context === undefined) {
    throw new Error('useTwitter must be used within a TwitterProvider');
  }
  return context;
};