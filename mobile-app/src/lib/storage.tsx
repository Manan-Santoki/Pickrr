import { createMMKV } from 'react-native-mmkv';
import Env from 'env';

const encryptionKey =
  Env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY?.trim() || 'pickrr-mobile-local-encryption-key';

export const storage = createMMKV({
  id: 'pickrr-storage',
  encryptionKey,
});

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  return value ? JSON.parse(value) || null : null;
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.remove(key);
}
