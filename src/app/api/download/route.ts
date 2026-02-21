import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { addTorrentByUrl, addTorrentByMagnet } from '@/services/qbittorrent';
import { notifyRadarrDownloadComplete } from '@/services/radarr';
import { notifySonarrDownloadComplete } from '@/services/sonarr';
import { z } from 'zod';

const downloadSchema = z.object({
  requestId: z.string().optional(),
  mediaType: z.enum(['movie', 'tv']).optional(),
  title: z.string(),
  indexer: z.string(),
  size: z.number(),
  seeders: z.number(),
  leechers: z.number(),
  downloadUrl: z.string().url().nullable(),
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

  const { requestId, mediaType: bodyMediaType, downloadUrl, magnetUrl, ...torrentData } = parsed.data;

  // Determine if this is a linked request or a standalone search grab
  const isLinked = !!requestId;

  let savePath: string;
  let request: { mediaType: string; tmdbId: number } | null = null;

  if (isLinked) {
    request = await db.request.findUnique({ where: { id: requestId } });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    savePath =
      request.mediaType === 'movie'
        ? process.env.MOVIES_SAVE_PATH!
        : process.env.TV_SAVE_PATH!;
  } else {
    // Standalone search grab — mediaType must be provided in body
    const mt = bodyMediaType ?? 'movie';
    savePath = mt === 'movie' ? process.env.MOVIES_SAVE_PATH! : process.env.TV_SAVE_PATH!;
  }

  try {
    // Send to qBittorrent
    if (downloadUrl) {
      await addTorrentByUrl(downloadUrl, savePath);
    } else if (magnetUrl) {
      await addTorrentByMagnet(magnetUrl, savePath);
    } else {
      return NextResponse.json({ error: 'No downloadUrl or magnetUrl' }, { status: 400 });
    }

    if (isLinked && requestId) {
      // Save selection to DB
      await db.torrent.create({
        data: {
          requestId,
          title: torrentData.title,
          indexer: torrentData.indexer,
          size: BigInt(torrentData.size),
          seeders: torrentData.seeders,
          leechers: torrentData.leechers,
          downloadUrl: downloadUrl ?? '',
          magnetUrl: magnetUrl ?? null,
          infoUrl: torrentData.infoUrl ?? null,
          selectedBy: (session.user as any)?.name ?? 'admin',
        },
      });

      // Update request status
      await db.request.update({
        where: { id: requestId },
        data: { status: 'downloading' },
      });

      // Notify arr services
      if (request?.mediaType === 'movie') {
        await notifyRadarrDownloadComplete(request.tmdbId);
      } else {
        await notifySonarrDownloadComplete();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
