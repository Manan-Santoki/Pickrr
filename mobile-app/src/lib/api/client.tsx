import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Env from 'env';
import type { MobileRefreshResponse } from '@/types/api';
import { getAuthSession, setAuthSession, signOut } from '@/features/auth/use-auth-store';

const baseURL = Env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');

export const client = axios.create({
  baseURL,
  timeout: 20_000,
});

const refreshClient = axios.create({
  baseURL,
  timeout: 20_000,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const session = getAuthSession();
    if (!session?.token.refreshToken) {
      signOut();
      return null;
    }

    try {
      const response = await refreshClient.post<MobileRefreshResponse>('/api/mobile/auth/refresh', {
        refreshToken: session.token.refreshToken,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version,
      });

      const nextSession = {
        user: response.data.user,
        token: response.data.token,
      };
      setAuthSession(nextSession);
      return response.data.token.accessToken;
    } catch {
      signOut();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

client.interceptors.request.use((config) => {
  const accessToken = getAuthSession()?.token.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status as number | undefined;

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url ?? '');
    const isAuthCall =
      requestUrl.includes('/api/mobile/auth/login')
      || requestUrl.includes('/api/mobile/auth/refresh')
      || requestUrl.includes('/api/mobile/auth/logout');

    if (isAuthCall) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const nextAccessToken = await refreshAccessToken();
    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

    return client(originalRequest);
  }
);
