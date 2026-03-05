import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/mobile-auth';
import { createUserNotification } from '@/lib/mobile-notifications';
import { deleteTorrent, getTorrentByHash, pauseTorrent, resumeTorrent } from '@/services/qbittorrent';

const schema = z.object({
  hash: z.string().min(1),
  action: z.enum(['pause', 'resume', 'delete']),
  deleteFiles: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const requestUser = await getRequestUser(req);
  if (!requestUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = requestUser.id;

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

      await createUserNotification({
        userId,
        type: 'download_paused',
        title: 'Download paused',
        body: `${torrent?.name ?? hash} has been paused.`,
        entityId: owned.id,
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

      await createUserNotification({
        userId,
        type: 'download_resumed',
        title: 'Download resumed',
        body: `${torrent?.name ?? hash} resumed successfully.`,
        entityId: owned.id,
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

      await createUserNotification({
        userId,
        type: 'download_deleted',
        title: 'Download removed',
        body: `${torrent?.name ?? hash} was removed from qBittorrent.`,
        entityId: owned.id,
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
