import { getItem, removeItem, setItem } from '@/lib/storage';

const AUTH_SESSION_KEY = 'pickrr.auth.session.v1';

export type MobileTokenType = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

export type AuthUser = {
  id: string;
  username: string;
  role: string;
};

export type AuthSession = {
  token: MobileTokenType;
  user: AuthUser;
};

export const getStoredAuthSession = () => getItem<AuthSession>(AUTH_SESSION_KEY);
export const removeStoredAuthSession = () => removeItem(AUTH_SESSION_KEY);
export const setStoredAuthSession = (value: AuthSession) =>
  setItem<AuthSession>(AUTH_SESSION_KEY, value);
