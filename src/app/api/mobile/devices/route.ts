import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getMobileUserFromRequest } from '@/lib/mobile-auth';

const schema = z.object({
  expoPushToken: z.string().trim().min(8),
  platform: z.enum(['ios', 'android', 'web', 'unknown']).default('unknown'),
  appVersion: z.string().trim().optional(),
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

  const now = new Date();
  const device = await db.userDevice.upsert({
    where: {
      expoPushToken: parsed.data.expoPushToken,
    },
    create: {
      userId: user.id,
      expoPushToken: parsed.data.expoPushToken,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
      lastSeenAt: now,
    },
    update: {
      userId: user.id,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
      lastSeenAt: now,
    },
    select: {
      id: true,
      expoPushToken: true,
      platform: true,
      appVersion: true,
      lastSeenAt: true,
    },
  });

  return NextResponse.json({ ok: true, device });
}
