import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: (token, refreshToken, user) => {
        set({ token, refreshToken, user, isAuthenticated: true })
      },

      logout: () => {
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false })
      },

      updateToken: (token) => set({ token }),

      getUser: () => {
        if (get().user) return get().user
        try {
          const sessionUser = sessionStorage.getItem('user')
          if (sessionUser) return JSON.parse(sessionUser)
        } catch (e) {}
        return null
      },

      // Role helpers
      isManager: () => ['admin', 'manager'].includes(get().getUser()?.role),
      isEstimator: () => ['admin', 'manager', 'estimator'].includes(get().getUser()?.role),
      isDetailing: () => ['admin', 'manager', 'detailing'].includes(get().getUser()?.role),
      canEdit: () => get().getUser()?.role !== 'readonly',
    }),
    {
      name: 'sfe-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
