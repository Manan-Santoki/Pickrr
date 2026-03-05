import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/mobile-auth';
import { getConfigValue, setSetting } from '@/lib/settings';

const SETTING_KEYS = [
  'PROWLARR_URL',
  'PROWLARR_API_KEY',
  'QBIT_URL',
  'QBIT_USERNAME',
  'QBIT_PASSWORD',
  'TMDB_API_KEY',
  'JELLYFIN_URL',
  'JELLYFIN_API_KEY',
  'MOVIES_SAVE_PATH',
  'TV_SAVE_PATH',
] as const;

const settingsSchema = z.object({
  PROWLARR_URL: z.string(),
  PROWLARR_API_KEY: z.string(),
  QBIT_URL: z.string(),
  QBIT_USERNAME: z.string(),
  QBIT_PASSWORD: z.string(),
  TMDB_API_KEY: z.string(),
  JELLYFIN_URL: z.string(),
  JELLYFIN_API_KEY: z.string(),
  MOVIES_SAVE_PATH: z.string(),
  TV_SAVE_PATH: z.string(),
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = await Promise.all(
    SETTING_KEYS.map(async (key) => [key, (await getConfigValue(key)) ?? ''] as const)
  );

  return NextResponse.json(Object.fromEntries(entries));
}

export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await Promise.all(
      Object.entries(parsed.data).map(([key, value]) => setSetting(key, value))
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}
