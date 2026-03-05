import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { annotateWithJellyfinAvailability } from '@/services/jellyfin';
import { searchTMDB } from '@/services/tmdb';
import { z } from 'zod';

const schema = z.object({
  query: z.string().min(1),
  type: z.enum(['movie', 'tv', 'multi']).default('multi'),
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    query: searchParams.get('query'),
    type: searchParams.get('type') ?? undefined,
  });

  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const results = await searchTMDB(parsed.data.query, parsed.data.type);
    const annotated = await annotateWithJellyfinAvailability(results);
    return NextResponse.json({ results: annotated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'TMDB search failed' },
      { status: 500 }
    );
  }
}
