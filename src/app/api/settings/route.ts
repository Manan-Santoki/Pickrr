import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSettings, setSetting } from '@/lib/settings';
import { z } from 'zod';

const ALL_SETTING_KEYS = [
  'PROWLARR_URL',
  'PROWLARR_API_KEY',
  'QBIT_URL',
  'QBIT_USERNAME',
  'QBIT_PASSWORD',
  'RADARR_URL',
  'RADARR_API_KEY',
  'SONARR_URL',
  'SONARR_API_KEY',
  'OVERSEERR_URL',
  'OVERSEERR_API_KEY',
  'TMDB_API_KEY',
  'MOVIES_SAVE_PATH',
  'TV_SAVE_PATH',
  'AUTO_SELECT_HOURS',
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getSettings(ALL_SETTING_KEYS);
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin only
  if ((session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.record(z.string()).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await Promise.all(
      Object.entries(parsed.data).map(([key, value]) => setSetting(key, value))
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
