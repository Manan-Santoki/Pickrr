import { db } from '@/lib/db';

export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const settings = await db.setting.findMany({
    where: { key: { in: keys } },
  });

  return settings.reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * Get a config value: DB setting first, then env var fallback.
 * Returns undefined if neither is set.
 */
export async function getConfigValue(key: string): Promise<string | undefined> {
  const dbValue = await getSetting(key);
  if (dbValue && dbValue.trim() !== '') return dbValue;
  return process.env[key] ?? undefined;
}
