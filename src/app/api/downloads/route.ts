import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPickrrTorrents } from '@/services/qbittorrent';
import type { QbitTorrent } from '@/types/qbittorrent';

type DownloadStatus = 'downloading' | 'done' | 'failed' | 'paused';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function mapQbitStatus(torrent: QbitTorrent): DownloadStatus {
  if (torrent.state === 'error' || torrent.state === 'missingFiles') {
    return 'failed';
  }

  if (torrent.state.startsWith('paused')) {
    return 'paused';
  }

  if (
    torrent.progress >= 1 ||
    torrent.state === 'uploading' ||
    torrent.state === 'stalledUP'
  ) {
    return 'done';
  }

  return 'downloading';
}

function findMatch(
  torrent: QbitTorrent,
  downloads: Array<{ id: string; qbitHash: string | null; torrentTitle: string }>
): { id: string; qbitHash: string | null; torrentTitle: string } | undefined {
  const byHash = downloads.find((download) => download.qbitHash === torrent.hash);
  if (byHash) {
    return byHash;
  }

  const torrentName = normalize(torrent.name);
  return downloads.find((download) => {
    const downloadName = normalize(download.torrentTitle);
    return (
      torrentName.includes(downloadName) ||
      downloadName.includes(torrentName)
    );
  });
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id?: string | null };
  const userId = typeof user.id === 'string' && user.id.length > 0 ? user.id : null;
  if (!userId) {
    return NextResponse.json([]);
  }

  const [downloads, torrents] = await Promise.all([
    db.download.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    getPickrrTorrents().catch(() => []),
  ]);

  const updates: Promise<unknown>[] = [];
  const matchByDownloadId = new Map<string, QbitTorrent>();

  for (const torrent of torrents) {
    const match = findMatch(torrent, downloads);
    if (!match) {
      continue;
    }

    matchByDownloadId.set(match.id, torrent);

    const nextStatus = mapQbitStatus(torrent);
    const current = downloads.find((download) => download.id === match.id);

    if (!current) {
      continue;
    }

    const shouldUpdateStatus = current.status !== nextStatus;
    const shouldUpdateHash = !current.qbitHash && torrent.hash;

    if (shouldUpdateStatus || shouldUpdateHash) {
      updates.push(
        db.download.update({
          where: { id: current.id },
          data: {
            status: nextStatus,
            qbitHash: current.qbitHash ?? torrent.hash,
          },
        })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return NextResponse.json(
    downloads.map((download) => {
      const torrent = matchByDownloadId.get(download.id);
      return {
        id: download.id,
        tmdbId: download.tmdbId,
        mediaType: download.mediaType,
        title: download.title,
        year: download.year,
        posterPath: download.posterPath,
        torrentTitle: download.torrentTitle,
        indexer: download.indexer,
        size: download.size.toString(),
        seeders: download.seeders,
        downloadUrl: download.downloadUrl,
        magnetUrl: download.magnetUrl,
        qbitHash: download.qbitHash,
        savePath: download.savePath,
        status: torrent ? mapQbitStatus(torrent) : download.status,
        createdAt: download.createdAt,
        updatedAt: download.updatedAt,
        progress: torrent?.progress ?? (download.status === 'done' ? 1 : 0),
        dlspeed: torrent?.dlspeed ?? 0,
        upspeed: torrent?.upspeed ?? 0,
        eta: torrent?.eta ?? 0,
        state: torrent?.state ?? null,
        num_seeds: torrent?.num_seeds ?? 0,
        num_leechs: torrent?.num_leechs ?? 0,
        hash: torrent?.hash ?? download.qbitHash ?? null,
      };
    })
  );
}
