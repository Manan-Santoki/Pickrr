import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const querySchema = z.object({
  list: z.enum(['favorites', 'watchlist', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(300).default(120),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as { id?: string | null };
  const userId = typeof user.id === 'string' && user.id.length > 0 ? user.id : null;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    list: req.nextUrl.searchParams.get('list') ?? undefined,
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const where =
    parsed.data.list === 'favorites'
      ? { userId, isFavorite: true }
      : parsed.data.list === 'watchlist'
      ? { userId, inWatchlist: true }
      : { userId };

  const rows = await db.mediaPreference.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: parsed.data.limit,
  });

  return NextResponse.json({
    list: parsed.data.list,
    results: rows.map((row) => ({
      id: row.id,
      tmdbId: row.tmdbId,
      mediaType: row.mediaType,
      title: row.title,
      year: row.year,
      posterPath: row.posterPath,
      isFavorite: row.isFavorite,
      inWatchlist: row.inWatchlist,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
}
