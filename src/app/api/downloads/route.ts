import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllPickrrTorrents } from '@/services/qbittorrent';
import { notifyRadarrDownloadComplete } from '@/services/radarr';
import { notifySonarrDownloadComplete } from '@/services/sonarr';
import { markOverseerrAvailable } from '@/services/overseerr';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let qbitTorrents: Awaited<ReturnType<typeof getAllPickrrTorrents>> = [];
  let dbTorrents: Array<{
    id: string;
    requestId: string;
    seasonNumber: number;
    title: string;
    qbitHash: string | null;
    request: {
      id: string;
      title: string;
      mediaType: string;
      tmdbId: number;
      overseerrId: number;
      status: string;
      posterPath: string | null;
    };
  }> = [];

  try {
    [qbitTorrents, dbTorrents] = await Promise.all([
      getAllPickrrTorrents(),
      db.torrent.findMany({
        include: { request: true },
        orderBy: { selectedAt: 'desc' },
      }),
    ]);
  } catch {
    return NextResponse.json([]);
  }

  // Mark completed requests as done + trigger Radarr/Sonarr import
  for (const qbit of qbitTorrents) {
    const isComplete = qbit.progress >= 1 || qbit.state === 'uploading' || qbit.state === 'stalledUP';
    if (!isComplete) continue;

    const dbTorrent = dbTorrents.find(
      (t) => t.qbitHash === qbit.hash || t.title === qbit.name
    );

    if (dbTorrent && dbTorrent.request.status === 'downloading') {
      await db.request.update({
        where: { id: dbTorrent.requestId },
        data: { status: 'done' },
      });

      const req = dbTorrent.request;
      if (req.mediaType === 'movie') {
        notifyRadarrDownloadComplete(req.tmdbId).catch(console.error);
      } else {
        notifySonarrDownloadComplete().catch(console.error);
      }
      markOverseerrAvailable(req.overseerrId).catch(console.error);
    }
  }

  // Build response
  const dbByHash = new Map(dbTorrents.filter((t) => t.qbitHash).map((t) => [t.qbitHash!, t]));
  const dbByTitle = new Map(dbTorrents.map((t) => [t.title, t]));

  return NextResponse.json(
    qbitTorrents.map((t) => {
      const matched = dbByHash.get(t.hash) ?? dbByTitle.get(t.name);
      return {
        hash: t.hash,
        name: t.name,
        progress: t.progress,
        dlspeed: t.dlspeed,
        upspeed: t.upspeed,
        eta: t.eta,
        size: t.size.toString(),
        state: t.state,
        num_seeds: t.num_seeds,
        num_leechs: t.num_leechs,
        seasonNumber: matched?.seasonNumber ?? 0,
        requestId: matched?.requestId ?? null,
        requestTitle: matched?.request?.title ?? null,
        mediaType: matched?.request?.mediaType ?? null,
        posterPath: matched?.request?.posterPath ?? null,
      };
    })
  );
}
