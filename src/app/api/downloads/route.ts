import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveTorrents } from '@/services/qbittorrent';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [qbitTorrents, dbTorrents] = await Promise.all([
    getActiveTorrents(),
    db.torrent.findMany({
      include: { request: true },
      orderBy: { selectedAt: 'desc' },
    }),
  ]);

  // Mark completed requests as done
  for (const qbit of qbitTorrents) {
    if (qbit.progress === 1) {
      const dbTorrent = dbTorrents.find(
        (t) => t.qbitHash === qbit.hash || t.title === qbit.name
      );
      if (dbTorrent && dbTorrent.request.status === 'downloading') {
        await db.request.update({
          where: { id: dbTorrent.requestId },
          data: { status: 'done' },
        });
      }
    }
  }

  return NextResponse.json(
    qbitTorrents.map((t) => ({
      hash: t.hash,
      name: t.name,
      progress: t.progress,
      dlspeed: t.dlspeed,
      eta: t.eta,
      size: t.size.toString(),
      state: t.state,
      num_seeds: t.num_seeds,
    }))
  );
}
