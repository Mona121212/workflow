
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Type Definitions
// ============================================
interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  // State
  user: User | null;
  tenant: Tenant | null;
  role: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (data: {
    user: User;
    tenant: Tenant;
    role: string;
    accessToken: string;
    refreshToken: string;
  }) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

// ============================================
// Zustand Store
// ============================================
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      tenant: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Set authentication data
      setAuth: (data) =>
        set({
          user: data.user,
          tenant: data.tenant,
          role: data.role,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        }),

      // Update access token
      updateAccessToken: (accessToken) =>
        set({ accessToken }),

      // Logout
      logout: () =>
        set({
          user: null,
          tenant: null,
          role: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      // Set loading state
      setLoading: (isLoading) =>
        set({ isLoading }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        role: state.role,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
