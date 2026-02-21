import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchProwlarr } from '@/services/prowlarr';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['movie', 'tv']),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = searchSchema.safeParse({
    query: searchParams.get('query'),
    type: searchParams.get('type'),
    limit: searchParams.get('limit'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const results = await searchProwlarr(
      parsed.data.query,
      parsed.data.type,
      parsed.data.limit
    );
    return NextResponse.json({ results, total: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
