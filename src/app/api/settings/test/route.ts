import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/mobile-auth';
import { testProwlarrConnection } from '@/services/prowlarr';
import { testQbitConnection } from '@/services/qbittorrent';
import { getConfigValue } from '@/lib/settings';

const schema = z.object({
  service: z.enum(['prowlarr', 'qbittorrent', 'tmdb', 'jellyfin']),
});

async function testTmdbConnection(): Promise<boolean> {
  const key = await getConfigValue('TMDB_API_KEY');
  if (!key) return false;

  const params = new URLSearchParams({
    api_key: key,
    query: 'inception',
  });

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    cache: 'no-store',
  });

  return res.ok;
}

async function testJellyfinConnection(): Promise<boolean> {
  const jellyfinUrl = await getConfigValue('JELLYFIN_URL');
  const jellyfinApiKey = await getConfigValue('JELLYFIN_API_KEY');
  if (!jellyfinUrl) return false;

  const baseUrl = jellyfinUrl.replace(/\/$/, '');
  const endpoint = jellyfinApiKey ? '/System/Info' : '/System/Info/Public';
  const res = await fetch(`${baseUrl}${endpoint}`, {
    cache: 'no-store',
    headers: jellyfinApiKey
      ? {
          'X-Emby-Token': jellyfinApiKey,
        }
      : undefined,
  });

  return res.ok;
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
  }

  const testers: Record<'prowlarr' | 'qbittorrent' | 'tmdb' | 'jellyfin', () => Promise<boolean>> = {
    prowlarr: testProwlarrConnection,
    qbittorrent: testQbitConnection,
    tmdb: testTmdbConnection,
    jellyfin: testJellyfinConnection,
  };

  try {
    const ok = await testers[parsed.data.service]();
    return NextResponse.json({ ok, service: parsed.data.service });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      service: parsed.data.service,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}
