import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { addTorrentByUrl, addTorrentByMagnet } from '@/services/qbittorrent';
import { approveOverseerrRequest } from '@/services/overseerr';
import { getConfigValue } from '@/lib/settings';
import { z } from 'zod';

const downloadSchema = z.object({
  requestId: z.string().optional(),
  mediaType: z.enum(['movie', 'tv']).optional(),
  seasonNumber: z.number().int().min(0).default(0), // 0 = movie/full pack, 1+ = season
  title: z.string(),
  indexer: z.string(),
  size: z.number(),
  seeders: z.number(),
  leechers: z.number(),
  downloadUrl: z.string().nullable(),
  magnetUrl: z.string().nullable(),
  infoUrl: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = downloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    requestId,
    mediaType: bodyMediaType,
    seasonNumber,
    downloadUrl,
    magnetUrl,
    ...torrentData
  } = parsed.data;

  if (!downloadUrl && !magnetUrl) {
    return NextResponse.json({ error: 'No downloadUrl or magnetUrl provided' }, { status: 400 });
  }

  const isLinked = !!requestId;
  let savePath: string;
  let request: { id: string; mediaType: string; tmdbId: number; overseerrId: number } | null = null;

  if (isLinked) {
    request = await db.request.findUnique({ where: { id: requestId } });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    const [moviesPath, tvPath] = await Promise.all([
      getConfigValue('MOVIES_SAVE_PATH'),
      getConfigValue('TV_SAVE_PATH'),
    ]);
    savePath =
      request.mediaType === 'movie'
        ? (moviesPath ?? '/downloads/movies')
        : (tvPath ?? '/downloads/tv');
  } else {
    const mt = bodyMediaType ?? 'movie';
    const [moviesPath, tvPath] = await Promise.all([
      getConfigValue('MOVIES_SAVE_PATH'),
      getConfigValue('TV_SAVE_PATH'),
    ]);
    savePath = mt === 'movie' ? (moviesPath ?? '/downloads/movies') : (tvPath ?? '/downloads/tv');
  }

  const resolvedMediaType: 'movie' | 'tv' =
    (request?.mediaType as 'movie' | 'tv' | undefined) ?? bodyMediaType ?? 'movie';

  try {
    // Send to qBittorrent with correct category/tags per media type
    if (downloadUrl) {
      await addTorrentByUrl(downloadUrl, savePath, resolvedMediaType);
    } else if (magnetUrl) {
      await addTorrentByMagnet(magnetUrl, savePath, resolvedMediaType);
    }

    if (isLinked && requestId && request) {
      // Upsert torrent record (support re-grab for same season)
      await db.torrent.upsert({
        where: { requestId_seasonNumber: { requestId, seasonNumber } },
        create: {
          requestId,
          seasonNumber,
          title: torrentData.title,
          indexer: torrentData.indexer,
          size: BigInt(torrentData.size),
          seeders: torrentData.seeders,
          leechers: torrentData.leechers,
          downloadUrl: downloadUrl ?? '',
          magnetUrl: magnetUrl ?? null,
          infoUrl: torrentData.infoUrl ?? null,
          selectedBy: (session.user as { name?: string })?.name ?? 'admin',
        },
        update: {
          title: torrentData.title,
          indexer: torrentData.indexer,
          size: BigInt(torrentData.size),
          seeders: torrentData.seeders,
          leechers: torrentData.leechers,
          downloadUrl: downloadUrl ?? '',
          magnetUrl: magnetUrl ?? null,
          infoUrl: torrentData.infoUrl ?? null,
          selectedBy: (session.user as { name?: string })?.name ?? 'admin',
        },
      });

      // Update request status to downloading
      await db.request.update({
        where: { id: requestId },
        data: { status: 'downloading' },
      });

      // Approve the Overseerr request (fire-and-forget)
      approveOverseerrRequest(request.overseerrId).catch((err) => {
        console.error('[Download] Failed to approve Overseerr request:', err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
