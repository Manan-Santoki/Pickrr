import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getMobileUserFromRequest,
  revokeAllMobileSessionsForUser,
  revokeMobileSessionById,
  revokeMobileSessionByRefreshToken,
} from '@/lib/mobile-auth';

const schema = z.object({
  refreshToken: z.string().min(16).optional(),
  allDevices: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mobileUser = await getMobileUserFromRequest(req);

  if (parsed.data.allDevices) {
    if (!mobileUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await revokeAllMobileSessionsForUser(mobileUser.id);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.refreshToken) {
    await revokeMobileSessionByRefreshToken(parsed.data.refreshToken);
    return NextResponse.json({ ok: true });
  }

  if (mobileUser?.sessionId) {
    await revokeMobileSessionById(mobileUser.sessionId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'refreshToken or bearer token is required' }, { status: 400 });
}
