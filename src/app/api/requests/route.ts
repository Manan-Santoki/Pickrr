import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requests = await db.request.findMany({
    where: { status: { in: ['pending', 'searching', 'awaiting_selection'] } },
    include: { selectedTorrent: true },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize BigInt
  return NextResponse.json(
    requests.map((r) => ({
      ...r,
      selectedTorrent: r.selectedTorrent
        ? { ...r.selectedTorrent, size: r.selectedTorrent.size.toString() }
        : null,
    }))
  );
}
