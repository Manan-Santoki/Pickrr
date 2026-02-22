import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTVSeasons } from '@/services/tmdb';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const seasons = await getTVSeasons(tmdbId);
    return NextResponse.json({ seasons });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch seasons' },
      { status: 500 }
    );
  }
}
