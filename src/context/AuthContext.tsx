import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useLoading } from "@/context/LoadingContext";

const BACKEND_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Types
export interface PublicMetrics {
  total_campaigns: number;
  total_campaign_amount: number;
  total_engagements: number;
  account_address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id?: string;
  campaign_id: string;
  campaign_home_team: string;
  campaign_away_team: string;
  campaign_target_metric: string;
  campaign_events_ends_at: string;
  campaign_creator: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserDetails {
  email: string;
  name: string;
  profile_picture?: string;
  aptos_address?: string;
  twitter_handle?: string;
  created_at?: string;
  public_metrics?: PublicMetrics;
  campaigns?: Campaign[];
}

interface AuthContextType {
  user: UserDetails | null;
  isAuthenticated: boolean;
  serverToken: string | null;
  error: string | null;
  isLoading: boolean;
  handleGoogleLogin: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUserData: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper function to fetch user details from backend
const getUserDetails = async (email: string): Promise<UserDetails> => {
  const response = await fetch(`${BACKEND_URL}/auth/user?email=${email}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user details");
  }
  return response.json();
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [serverToken, setServerToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setLoading } = useLoading();

  // Refresh user data from backend
  const refreshUserData = useCallback(async () => {
    if (!user?.email || !serverToken) return;

    try {
      setIsLoading(true);
      const userData = await getUserDetails(user.email);

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      console.error("Error refreshing user data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh user data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, serverToken]);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("serverToken");

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setServerToken(storedToken);

        // Refresh user data after restoring from localStorage
        (async () => {
          try {
            setIsLoading(true);
            const userData = await getUserDetails(parsedUser.email);
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
          } catch (err) {
            console.error("Failed to refresh user data on mount:", err);
          } finally {
            setIsLoading(false);
          }
        })();
      } catch (e) {
        console.error("Failed to parse stored user data:", e);
        localStorage.removeItem("user");
        localStorage.removeItem("serverToken");
      }
    }
  }, []);

  // Handle OAuth callback from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const logoutSuccess = params.get("logout");

    // Handle logout callback
    if (logoutSuccess === "success") {
      setUser(null);
      setServerToken(null);
      setError(null);
      localStorage.removeItem("user");
      localStorage.removeItem("serverToken");
      localStorage.removeItem("id_token");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Handle login callback
    if (token) {
      setServerToken(token);
      localStorage.setItem("serverToken", token);

      const idToken = params.get("id_token");
      if (idToken) {
        localStorage.setItem("id_token", idToken);
      }

      try {
        // Decode JWT token to get initial user info
        const decoded = JSON.parse(atob(token.split(".")[1]));
        const profileData: UserDetails = {
          email: decoded.email,
          name: decoded.name,
          profile_picture: decoded.picture,
          aptos_address: decoded.aptosAddress,
          twitter_handle: decoded.twitterHandle,
          created_at: decoded.createdAt,
        };

        setUser(profileData);
        localStorage.setItem("user", JSON.stringify(profileData));

        // Fetch full user details from backend
        (async () => {
          try {
            setIsLoading(true);
            const userData = await getUserDetails(profileData.email);
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
          } catch (err) {
            console.error("Failed to fetch user details after login:", err);
            setError(
              err instanceof Error
                ? err.message
                : "Failed to fetch user details"
            );
          } finally {
            setIsLoading(false);
          }
        })();
      } catch (e) {
        console.error("Failed to decode server token:", e);
        setError("Failed to decode authentication token");
      }

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check token expiry
  useEffect(() => {
    if (serverToken) {
      try {
        const decoded = JSON.parse(atob(serverToken.split(".")[1]));
        const currentTime = Date.now() / 1000;

        if (decoded.exp && decoded.exp < currentTime) {
          console.log("Token expired, logging out");
          logout();
        }
      } catch (e) {
        console.error("Failed to check token expiry:", e);
        logout();
      }
    }
  }, [serverToken]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setLoading(true, "Signing out...");
    const token = serverToken || localStorage.getItem("serverToken");

    try {
      const response = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Logout failed: ${response.status}`);
      }
    } catch (err) {
      console.error("Logout error:", err);
      setError(err instanceof Error ? err.message : "Failed to logout");
    } finally {
      // Clear state regardless of API success
      setUser(null);
      setServerToken(null);
      localStorage.removeItem("user");
      localStorage.removeItem("serverToken");
      localStorage.removeItem("id_token");
      setIsLoading(false);
      setLoading(false);
    }
  }, [serverToken, setLoading]);

  // Redirect to Google OAuth
  const handleGoogleLogin = useCallback(() => {
    setIsLoading(true);
    setLoading(true, "Signing in...");
    setError(null);
    window.location.href = `${BACKEND_URL}/auth/google`;
  }, [setLoading]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!serverToken,
    serverToken,
    error,
    isLoading,
    handleGoogleLogin,
    logout,
    clearError,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Wrapper with Google OAuth Provider
export const AuthProviderWithGoogle: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
};