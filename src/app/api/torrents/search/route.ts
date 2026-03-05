import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/mobile-auth';
import { searchProwlarr } from '@/services/prowlarr';

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['movie', 'tv']),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = searchSchema.safeParse({
    query: req.nextUrl.searchParams.get('query'),
    type: req.nextUrl.searchParams.get('type'),
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const results = await searchProwlarr(parsed.data.query, parsed.data.type, parsed.data.limit);
    return NextResponse.json({ results, total: results.length });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Prowlarr search failed' },
      { status: 500 }
    );
  }
}
