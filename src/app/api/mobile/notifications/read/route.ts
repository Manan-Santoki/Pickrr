import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getMobileUserFromRequest } from '@/lib/mobile-auth';

const schema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  markAll: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const user = await getMobileUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.markAll && (!parsed.data.ids || parsed.data.ids.length === 0)) {
    return NextResponse.json({ error: 'ids or markAll is required' }, { status: 400 });
  }

  const where = parsed.data.markAll
    ? {
        userId: user.id,
        readAt: null,
      }
    : {
        userId: user.id,
        id: {
          in: parsed.data.ids,
        },
        readAt: null,
      };

  const result = await db.userNotification.updateMany({
    where,
    data: {
      readAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, updatedCount: result.count });
}
