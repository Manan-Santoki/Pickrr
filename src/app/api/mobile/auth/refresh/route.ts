import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildDeviceMetadata,
  checkRateLimit,
  rotateMobileSessionTokens,
} from '@/lib/mobile-auth';

const schema = z.object({
  refreshToken: z.string().min(16),
  deviceId: z.string().trim().optional(),
  deviceName: z.string().trim().optional(),
  deviceModel: z.string().trim().optional(),
  platform: z.enum(['ios', 'android', 'web', 'unknown']).optional(),
  appVersion: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  if (!checkRateLimit(`mobile-refresh:${ip}`, 25, 60_000)) {
    return NextResponse.json({ error: 'Too many refresh attempts' }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rotated = await rotateMobileSessionTokens(
    parsed.data.refreshToken,
    buildDeviceMetadata(req, {
      deviceId: parsed.data.deviceId,
      deviceName: parsed.data.deviceName,
      deviceModel: parsed.data.deviceModel,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
    })
  );

  if (!rotated) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  return NextResponse.json({
    token: {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      expiresIn: rotated.expiresIn,
      refreshExpiresIn: rotated.refreshExpiresIn,
    },
    user: rotated.user,
  });
}
