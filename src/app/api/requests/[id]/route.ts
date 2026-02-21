import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const request = await db.request.findUnique({
    where: { id: params.id },
    include: { selectedTorrent: true },
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...request,
    selectedTorrent: request.selectedTorrent
      ? { ...request.selectedTorrent, size: request.selectedTorrent.size.toString() }
      : null,
  });
}
