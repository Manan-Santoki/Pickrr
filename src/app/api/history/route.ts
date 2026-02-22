import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requests = await db.request.findMany({
    where: { status: { in: ['done', 'failed'] } },
    include: { torrents: { orderBy: { seasonNumber: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(
    requests.map((r) => ({
      ...r,
      seasons: r.seasons ? JSON.parse(r.seasons) : null,
      torrents: r.torrents.map((t) => ({ ...t, size: t.size.toString() })),
    }))
  );
}
