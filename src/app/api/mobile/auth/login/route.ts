import type { MobileLoginResponse } from '@/types/mobile';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  authenticateMobileUser,
  buildDeviceMetadata,
  checkRateLimit,
  createMobileSessionTokens,
} from '@/lib/mobile-auth';

const schema = z.object({
  provider: z.enum(['local', 'jellyfin']).default('local'),
  username: z.string().trim().min(1),
  password: z.string().min(1),
  deviceId: z.string().trim().optional(),
  deviceName: z.string().trim().optional(),
  deviceModel: z.string().trim().optional(),
  platform: z.enum(['ios', 'android', 'web', 'unknown']).optional(),
  appVersion: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit(`mobile-login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await authenticateMobileUser(
    parsed.data.provider,
    parsed.data.username,
    parsed.data.password
  );

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createMobileSessionTokens(
    user,
    buildDeviceMetadata(req, {
      deviceId: parsed.data.deviceId,
      deviceName: parsed.data.deviceName,
      deviceModel: parsed.data.deviceModel,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
    })
  );

  const response: MobileLoginResponse = {
    token: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      refreshExpiresIn: token.refreshExpiresIn,
    },
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };

  return NextResponse.json(response);
}
