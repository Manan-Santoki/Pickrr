import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteTorrent, getTorrentByHash, pauseTorrent, resumeTorrent } from '@/services/qbittorrent';

const schema = z.object({
  hash: z.string().min(1),
  action: z.enum(['pause', 'resume', 'delete']),
  deleteFiles: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { id?: string | null };
  const userId = typeof user.id === 'string' && user.id.length > 0 ? user.id : null;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { hash, action, deleteFiles } = parsed.data;

  try {
    const torrent = await getTorrentByHash(hash).catch(() => null);
    const owned = await db.download.findFirst({
      where: {
        userId,
        OR: [{ qbitHash: hash }, ...(torrent ? [{ torrentTitle: torrent.name }] : [])],
      },
      select: { id: true },
    });

    if (!owned) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    if (action === 'pause') {
      await pauseTorrent(hash);
      await db.download.updateMany({
        where: {
          userId,
          OR: [{ qbitHash: hash }, ...(torrent ? [{ torrentTitle: torrent.name }] : [])],
        },
        data: { status: 'paused' },
      });
    }

    if (action === 'resume') {
      await resumeTorrent(hash);
      await db.download.updateMany({
        where: {
          userId,
          OR: [{ qbitHash: hash }, ...(torrent ? [{ torrentTitle: torrent.name }] : [])],
        },
        data: { status: 'downloading' },
      });
    }

    if (action === 'delete') {
      await deleteTorrent(hash, deleteFiles);
      await db.download.updateMany({
        where: {
          userId,
          OR: [{ qbitHash: hash }, ...(torrent ? [{ torrentTitle: torrent.name }] : [])],
        },
        data: {
          status: 'failed',
          qbitHash: hash,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
