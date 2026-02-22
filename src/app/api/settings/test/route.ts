import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { testProwlarrConnection } from '@/services/prowlarr';
import { testQbitConnection } from '@/services/qbittorrent';
import { testRadarrConnection } from '@/services/radarr';
import { testSonarrConnection } from '@/services/sonarr';
import { testOverseerrConnection } from '@/services/overseerr';
import { getConfigValue } from '@/lib/settings';
import { z } from 'zod';

const schema = z.object({
  service: z.enum(['prowlarr', 'qbittorrent', 'radarr', 'sonarr', 'overseerr', 'jellyfin']),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
  }

  const { service } = parsed.data;

  try {
    if (service === 'jellyfin') {
      const jellyfinUrl = await getConfigValue('JELLYFIN_URL');
      const jellyfinApiKey = await getConfigValue('JELLYFIN_API_KEY');
      if (!jellyfinUrl) {
        return NextResponse.json({ ok: false, service, error: 'JELLYFIN_URL not configured' });
      }
      if (!jellyfinApiKey) {
        return NextResponse.json({ ok: false, service, error: 'JELLYFIN_API_KEY not configured' });
      }
      const res = await fetch(`${jellyfinUrl.replace(/\/$/, '')}/System/Info`, {
        headers: { 'X-Emby-Token': jellyfinApiKey },
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json({ ok: res.ok, service });
    }

    const testers: Record<string, () => Promise<boolean>> = {
      prowlarr: testProwlarrConnection,
      qbittorrent: testQbitConnection,
      radarr: testRadarrConnection,
      sonarr: testSonarrConnection,
      overseerr: testOverseerrConnection,
    };

    const ok = await testers[service]();
    return NextResponse.json({ ok, service });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.json({ ok: false, service, error: message });
  }
}
