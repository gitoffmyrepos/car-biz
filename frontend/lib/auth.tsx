'use client';

/**
 * Weekly Vehicle Leasing Platform - Auth Context
 * Salvage-to-Lux Fleet Management
 *
 * React context for authentication state management.
 * Supports both OIDC (Keycloak) and development mode authentication.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiBaseUrl } from '@/lib/api';

const API_BASE_URL = apiBaseUrl();

// Types
export interface User {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  roles: string[];
  email_verified: boolean;
  is_admin: boolean;
  is_ops: boolean;
  is_customer: boolean;
  mfa_enabled: boolean;
  mfa_verified: boolean;
  admin_mfa_satisfied: boolean;
}

export interface OIDCConfig {
  issuer_url: string;
  client_id: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  is_dev_mode: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDevMode: boolean;
  oidcConfig: OIDCConfig | null;
  login: () => void;
  devLogin: (role: string, email: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyMfa: (totpCode: string) => Promise<void>;
  requiresMfa: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage helpers
const TOKEN_KEY = 'fx_weekly_lease_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oidcConfig, setOidcConfig] = useState<OIDCConfig | null>(null);

  // Fetch OIDC configuration on mount
  useEffect(() => {
    async function fetchOIDCConfig() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/config`);
        if (response.ok) {
          const config = await response.json();
          setOidcConfig(config);
        }
      } catch (error) {
        console.error('Failed to fetch OIDC config:', error);
      }
    }
    fetchOIDCConfig();
  }, []);

  // Fetch user info from token
  const fetchUserInfo = useCallback(async (accessToken: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return null;
    }
  }, []);

  // Initialize auth state from stored token
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      const storedToken = getStoredToken();

      if (storedToken) {
        const userInfo = await fetchUserInfo(storedToken);
        if (userInfo) {
          setToken(storedToken);
          setUser(userInfo);
        } else {
          // Token is invalid, remove it
          removeStoredToken();
        }
      }

      setIsLoading(false);
    }
    initAuth();
  }, [fetchUserInfo]);

  // Handle OIDC callback (token from URL)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);

      // Process the token
      (async () => {
        const userInfo = await fetchUserInfo(accessToken);
        if (userInfo) {
          setStoredToken(accessToken);
          setToken(accessToken);
          setUser(userInfo);
        }
      })();
    }
  }, [fetchUserInfo]);

  // Login - redirect to OIDC provider
  const login = useCallback(() => {
    if (!oidcConfig) {
      console.error('OIDC config not loaded');
      return;
    }

    if (oidcConfig.is_dev_mode) {
      // In dev mode, redirect to our dev login page
      window.location.href = '/login';
      return;
    }

    // Build OIDC authorization URL
    const params = new URLSearchParams({
      client_id: oidcConfig.client_id,
      redirect_uri: `${window.location.origin}/login/callback`,
      response_type: 'token',
      scope: 'openid profile email',
      state: crypto.randomUUID(),
    });

    window.location.href = `${oidcConfig.authorization_endpoint}?${params.toString()}`;
  }, [oidcConfig]);

  // Dev login - for development without Keycloak
  const devLogin = useCallback(async (role: string, email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/dev-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, email }),
      });

      if (response.ok) {
        const data = await response.json();
        setStoredToken(data.access_token);
        setToken(data.access_token);
        setUser(data.user);
      } else {
        throw new Error('Dev login failed');
      }
    } catch (error) {
      console.error('Dev login error:', error);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);

    if (oidcConfig && !oidcConfig.is_dev_mode) {
      // Redirect to OIDC end session endpoint
      const params = new URLSearchParams({
        post_logout_redirect_uri: window.location.origin,
      });
      window.location.href = `${oidcConfig.end_session_endpoint}?${params.toString()}`;
    }
  }, [oidcConfig]);

  // Refresh user info
  const refreshUser = useCallback(async () => {
    if (token) {
      const userInfo = await fetchUserInfo(token);
      if (userInfo) {
        setUser(userInfo);
      }
    }
  }, [token, fetchUserInfo]);

  // Verify MFA (dev mode)
  const verifyMfa = useCallback(async (totpCode: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/dev-mfa-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ totp_code: totpCode }),
      });

      if (response.ok) {
        const data = await response.json();
        setStoredToken(data.access_token);
        setToken(data.access_token);
        setUser(data.user);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'MFA verification failed');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }, [token]);

  // Check if MFA is required but not verified
  const requiresMfa = !!user && user.is_admin && user.mfa_enabled && !user.mfa_verified;

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isDevMode: oidcConfig?.is_dev_mode ?? true,
    oidcConfig,
    login,
    devLogin,
    logout,
    refreshUser,
    verifyMfa,
    requiresMfa,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { requiredRole?: 'admin' | 'ops' | 'customer' }
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, user, login } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        login();
      }
    }, [isLoading, isAuthenticated, login]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect to login
    }

    if (options?.requiredRole) {
      const hasRole =
        (options.requiredRole === 'admin' && user?.is_admin) ||
        (options.requiredRole === 'ops' && (user?.is_ops || user?.is_admin)) ||
        (options.requiredRole === 'customer' && user?.is_customer);

      if (!hasRole) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-charcoal mb-2">Access Denied</h1>
              <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
            </div>
          </div>
        );
      }
    }

    return <WrappedComponent {...props} />;
  };
}
