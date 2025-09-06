import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      // Actions
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        });
      },

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      login: (user, token) => {
        set({ 
          user, 
          token, 
          isAuthenticated: true, 
          isLoading: false 
        });
        localStorage.setItem('token', token);
      },

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        localStorage.removeItem('token');
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ 
            user: { ...currentUser, ...userData } 
          });
        }
      },

      // Utility functions
      getToken: () => {
        return get().token || localStorage.getItem('token');
      },

      isTokenValid: () => {
        const token = get().getToken();
        if (!token) return false;
        
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.exp * 1000 > Date.now();
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

// Initialize token from localStorage on app start
const token = localStorage.getItem('token');
if (token) {
  useAuthStore.getState().setToken(token);
}