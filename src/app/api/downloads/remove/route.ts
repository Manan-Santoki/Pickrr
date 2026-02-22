import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteTorrent, pauseTorrent, resumeTorrent } from '@/services/qbittorrent';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  hash: z.string().min(1),
  action: z.enum(['pause', 'resume', 'delete']),
  deleteFiles: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { hash, action, deleteFiles } = parsed.data;

  try {
    if (action === 'pause') {
      await pauseTorrent(hash);
    } else if (action === 'resume') {
      await resumeTorrent(hash);
    } else {
      await deleteTorrent(hash, deleteFiles);

      // If linked to a Pickrr torrent record, clear qbitHash so it can be re-grabbed
      await db.torrent.updateMany({
        where: { qbitHash: hash },
        data: { qbitHash: null },
      });

      // If the parent request was "downloading", revert to "selected" so user can re-pick
      const linked = await db.torrent.findFirst({ where: { qbitHash: null, downloadUrl: { not: '' } } });
      if (linked) {
        await db.request.updateMany({
          where: { id: linked.requestId, status: 'downloading' },
          data: { status: 'selected' },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
