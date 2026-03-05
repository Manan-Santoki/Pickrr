import type { AuthSession, MobileTokenType } from '@/lib/auth/utils';
import { create } from 'zustand';
import {
  getStoredAuthSession,
  removeStoredAuthSession,
  setStoredAuthSession,
} from '@/lib/auth/utils';
import { createSelectors } from '@/lib/utils';

type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  hydrate: () => void;
  setSession: (session: AuthSession) => void;
  updateToken: (token: MobileTokenType) => void;
  signOut: () => void;
};

const _useAuthStore = create<AuthState>((set, get) => ({
  status: 'hydrating',
  session: null,
  hydrate: () => {
    try {
      const stored = getStoredAuthSession();
      if (stored && stored.token?.accessToken && stored.token?.refreshToken) {
        set({
          session: stored,
          status: 'authenticated',
        });
        return;
      }

      set({
        session: null,
        status: 'unauthenticated',
      });
    } catch {
      set({
        session: null,
        status: 'unauthenticated',
      });
    }
  },
  setSession: (session) => {
    setStoredAuthSession(session);
    set({
      session,
      status: 'authenticated',
    });
  },
  updateToken: (token) => {
    const current = get().session;
    if (!current) {
      return;
    }

    const nextSession: AuthSession = {
      ...current,
      token,
    };

    setStoredAuthSession(nextSession);
    set({ session: nextSession, status: 'authenticated' });
  },
  signOut: () => {
    removeStoredAuthSession();
    set({
      session: null,
      status: 'unauthenticated',
    });
  },
}));

export const useAuthStore = createSelectors(_useAuthStore);

export const hydrateAuth = () => _useAuthStore.getState().hydrate();
export const signOut = () => _useAuthStore.getState().signOut();
export const getAuthSession = () => _useAuthStore.getState().session;
export const setAuthSession = (session: AuthSession) =>
  _useAuthStore.getState().setSession(session);
export const updateAuthToken = (token: MobileTokenType) =>
  _useAuthStore.getState().updateToken(token);
