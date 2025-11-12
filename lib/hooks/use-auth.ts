

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import type { RegisterInput, LoginInput } from '@/lib/utils/validation';

// ============================================
// Authentication Hook
// ============================================
export function useAuth() {
  const router = useRouter();
  const { setAuth, logout: storeLogout, setLoading, ...authState } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Register
  const register = async (data: RegisterInput) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Save authentication info to store
      setAuth({
        user: result.user,
        tenant: result.tenant,
        role: 'OWNER',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // Redirect to dashboard
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (data: LoginInput) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Save authentication info to store
      setAuth({
        user: result.user,
        tenant: result.tenant,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // Redirect to dashboard
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // Clear store
      storeLogout();

      // Redirect to login page
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh access token
  const refreshAccessToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: authState.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const result = await response.json();
      
      // Update access token in store
      useAuthStore.getState().updateAccessToken(result.accessToken);
      
      return result.accessToken;
    } catch (err) {
      console.error('Token refresh failed:', err);
      // If refresh fails, log out the user
      await logout();
      return null;
    }
  };

  return {
    ...authState,
    register,
    login,
    logout,
    refreshAccessToken,
    error,
  };
}

// ============================================
// Protected Route Hook
// ============================================
export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  if (!isLoading && !isAuthenticated) {
    router.push('/login');
  }

  return { isAuthenticated, isLoading };
}
