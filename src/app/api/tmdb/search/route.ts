import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchTMDB } from '@/services/tmdb';
import { z } from 'zod';

const schema = z.object({
  query: z.string().min(1),
  type: z.enum(['movie', 'tv', 'multi']).default('multi'),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = schema.safeParse({
    query: searchParams.get('query'),
    type: searchParams.get('type') ?? undefined,
  });

  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const results = await searchTMDB(parsed.data.query, parsed.data.type);
    return NextResponse.json({ results });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'TMDB search failed' },
      { status: 500 }
    );
  }
}
