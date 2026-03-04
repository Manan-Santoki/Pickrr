import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPickrrTorrents, getTorrentByHash } from '@/services/qbittorrent';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function mapStatus(state: string, progress: number): 'downloading' | 'done' | 'failed' | 'paused' {
  if (state === 'error' || state === 'missingFiles') return 'failed';
  if (state.startsWith('paused')) return 'paused';
  if (progress >= 1 || state === 'uploading' || state === 'stalledUP') return 'done';
  return 'downloading';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id?: string | null };
  const userId = typeof user.id === 'string' && user.id.length > 0 ? user.id : null;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const download = await db.download.findUnique({
    where: { id: params.id },
  });

  if (!download || download.userId !== userId) {
    return NextResponse.json({ error: 'Download not found' }, { status: 404 });
  }

  let torrent = null;
  if (download.qbitHash) {
    torrent = await getTorrentByHash(download.qbitHash).catch(() => null);
  }

  if (!torrent) {
    const torrents = await getPickrrTorrents().catch(() => []);
    const target = normalize(download.torrentTitle);
    torrent =
      torrents.find((item) => item.hash === download.qbitHash) ??
      torrents.find((item) => {
        const name = normalize(item.name);
        return name.includes(target) || target.includes(name);
      }) ??
      null;
  }

  const status = torrent ? mapStatus(torrent.state, torrent.progress) : download.status;

  if (status !== download.status || (!download.qbitHash && torrent?.hash)) {
    await db.download.update({
      where: { id: download.id },
      data: {
        status,
        qbitHash: download.qbitHash ?? torrent?.hash ?? null,
      },
    });
  }

  return NextResponse.json({
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
    qbitHash: download.qbitHash ?? torrent?.hash ?? null,
    savePath: download.savePath,
    status,
    createdAt: download.createdAt,
    updatedAt: download.updatedAt,
    progress: torrent?.progress ?? (status === 'done' ? 1 : 0),
    dlspeed: torrent?.dlspeed ?? 0,
    upspeed: torrent?.upspeed ?? 0,
    eta: torrent?.eta ?? 0,
    state: torrent?.state ?? null,
    num_seeds: torrent?.num_seeds ?? 0,
    num_leechs: torrent?.num_leechs ?? 0,
  });
}
