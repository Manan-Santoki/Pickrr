import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getTMDBDetails } from '@/services/tmdb';

const querySchema = z.object({
  type: z.enum(['movie', 'tv']),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    type: req.nextUrl.searchParams.get('type'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tmdbId = Number(params.id);
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: 'Invalid TMDB id' }, { status: 400 });
  }

  try {
    const details = await getTMDBDetails(tmdbId, parsed.data.type);
    return NextResponse.json(details);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch TMDB details' },
      { status: 500 }
    );
  }
}
