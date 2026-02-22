import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status'); // comma-separated or "all"

  const where =
    statusFilter && statusFilter !== 'all'
      ? { status: { in: statusFilter.split(',') } }
      : undefined; // return everything

  const requests = await db.request.findMany({
    where,
    include: { torrents: { orderBy: { seasonNumber: 'asc' } } },
    orderBy: { requestedAt: 'desc' },
  });

  return NextResponse.json(
    requests.map((r) => ({
      ...r,
      seasons: r.seasons ? JSON.parse(r.seasons) : null,
      torrents: r.torrents.map((t) => ({ ...t, size: t.size.toString() })),
    }))
  );
}
