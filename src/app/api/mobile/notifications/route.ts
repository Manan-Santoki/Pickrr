import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getMobileUserFromRequest } from '@/lib/mobile-auth';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.coerce.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const user = await getMobileUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    unreadOnly: req.nextUrl.searchParams.get('unreadOnly') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [notifications, unreadCount] = await Promise.all([
    db.userNotification.findMany({
      where: {
        userId: user.id,
        ...(parsed.data.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parsed.data.limit,
    }),
    db.userNotification.count({
      where: {
        userId: user.id,
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((item: (typeof notifications)[number]) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      entityId: item.entityId,
      readAt: item.readAt,
      createdAt: item.createdAt,
    })),
  });
}
