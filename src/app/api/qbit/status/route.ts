import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPickrrTorrents } from '@/services/qbittorrent';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

  try {
    const [downloads, torrents] = await Promise.all([
      db.download.findMany({
        where: { userId },
        select: { qbitHash: true, torrentTitle: true },
      }),
      getPickrrTorrents(),
    ]);

    const matched = torrents.filter((torrent) => {
      const byHash = downloads.some((download) => download.qbitHash === torrent.hash);
      if (byHash) return true;

      const torrentName = normalize(torrent.name);
      return downloads.some((download) => {
        const title = normalize(download.torrentTitle);
        return torrentName.includes(title) || title.includes(torrentName);
      });
    });

    return NextResponse.json(
      matched.map((torrent) => ({
        hash: torrent.hash,
        name: torrent.name,
        progress: torrent.progress,
        state: torrent.state,
        eta: torrent.eta,
        dlspeed: torrent.dlspeed,
        upspeed: torrent.upspeed,
        num_seeds: torrent.num_seeds,
        num_leechs: torrent.num_leechs,
        size: torrent.size,
        save_path: torrent.save_path,
        added_on: torrent.added_on,
        completion_on: torrent.completion_on,
      }))
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch qBittorrent status' },
      { status: 500 }
    );
  }
}
