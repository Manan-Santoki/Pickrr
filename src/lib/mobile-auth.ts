import type { NextRequest } from 'next/server';
import type { MobileAuthProvider, MobilePlatform } from '@/types/mobile';
import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getConfigValue } from '@/lib/settings';

type JwtPayload = {
  sub: string;
  role: string;
  username: string;
  sid: string;
  typ: 'access';
  iat: number;
  exp: number;
};

type SessionUser = {
  id: string;
  username: string;
  role: string;
};

export type RequestUser = {
  id: string;
  username: string;
  role: string;
  authType: 'mobile' | 'web';
  sessionId?: string;
};

export type DeviceMetadata = {
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  platform?: MobilePlatform;
  appVersion?: string;
  ipAddress?: string;
  userAgent?: string;
};

const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Buffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

function getJwtSecret(): string {
  const secret = process.env.MOBILE_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('MOBILE_JWT_SECRET (or NEXTAUTH_SECRET) must be set and at least 16 chars');
  }
  return secret;
}

function signJwt(payload: JwtPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' } as const;
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${signingInput}.${signature}`;
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function verifyJwt(token: string): JwtPayload | null {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  if (!timingSafeEqualString(expectedSignature, encodedSignature)) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8')) as {
      alg?: string;
      typ?: string;
    };

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as Partial<JwtPayload>;
    if (
      payload.typ !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.username !== 'string' ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number'
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }

    return payload as JwtPayload;
  } catch {
    return null;
  }
}

function getClientIp(req: NextRequest): string | undefined {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const [firstIp] = xForwardedFor.split(',');
    const ip = firstIp?.trim();
    if (ip) return ip;
  }

  const xRealIp = req.headers.get('x-real-ip')?.trim();
  if (xRealIp) {
    return xRealIp;
  }

  return undefined;
}

function normalizePlatform(platform: string | undefined): MobilePlatform {
  if (platform === 'ios' || platform === 'android' || platform === 'web') {
    return platform;
  }
  return 'unknown';
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (rateLimitBuckets.size > 10_000) {
    for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitBuckets.delete(bucketKey);
      }
    }
  }

  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function buildDeviceMetadata(
  req: NextRequest,
  input?: {
    deviceId?: string;
    deviceName?: string;
    deviceModel?: string;
    platform?: string;
    appVersion?: string;
  }
): DeviceMetadata {
  return {
    deviceId: input?.deviceId?.trim() || undefined,
    deviceName: input?.deviceName?.trim() || undefined,
    deviceModel: input?.deviceModel?.trim() || undefined,
    platform: normalizePlatform(input?.platform),
    appVersion: input?.appVersion?.trim() || undefined,
    ipAddress: getClientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
  };
}

function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function createRefreshToken(): string {
  return base64UrlEncode(randomBytes(48));
}

function createAccessToken(user: SessionUser, sessionId: string): { token: string; expiresIn: number } {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    username: user.username,
    sid: sessionId,
    typ: 'access',
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };

  return {
    token: signJwt(payload),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function authenticateMobileUser(
  provider: MobileAuthProvider,
  username: string,
  password: string
): Promise<SessionUser | null> {
  if (!username || !password) {
    return null;
  }

  if (provider === 'local') {
    const user = await db.user.findUnique({ where: { username } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  const jellyfinUrl = await getConfigValue('JELLYFIN_URL');
  if (!jellyfinUrl) {
    return null;
  }

  const response = await fetch(
    `${jellyfinUrl.replace(/\/$/, '')}/Users/AuthenticateByName`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'MediaBrowser Client="Pickrr", Device="Mobile", DeviceId="pickrr-mobile", Version="1.0.0"',
      },
      body: JSON.stringify({
        Username: username,
        Pw: password,
      }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const authData = (await response.json()) as { User?: { Id?: string; Name?: string } };
  const jellyfinUsername = authData.User?.Name ?? username;

  let user = await db.user.findUnique({ where: { username: jellyfinUsername } });
  if (!user) {
    const generatedPassword = `${Date.now()}-${Math.random()}-${authData.User?.Id ?? jellyfinUsername}`;
    const passwordHash = await bcrypt.hash(generatedPassword, 12);
    user = await db.user.create({
      data: {
        username: jellyfinUsername,
        password: passwordHash,
        role: 'user',
      },
    });
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export async function createMobileSessionTokens(user: SessionUser, metadata: DeviceMetadata): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  sessionId: string;
}> {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const session = await db.mobileSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      deviceId: metadata.deviceId,
      deviceName: metadata.deviceName,
      deviceModel: metadata.deviceModel,
      platform: metadata.platform,
      appVersion: metadata.appVersion,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      expiresAt,
    },
  });

  const access = createAccessToken(user, session.id);

  return {
    accessToken: access.token,
    refreshToken,
    expiresIn: access.expiresIn,
    refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    sessionId: session.id,
  };
}

export async function rotateMobileSessionTokens(
  refreshToken: string,
  metadata: DeviceMetadata
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: SessionUser;
  sessionId: string;
} | null> {
  const hashed = hashRefreshToken(refreshToken);
  const now = new Date();

  const session = await db.mobileSession.findFirst({
    where: {
      refreshTokenHash: hashed,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const nextRefreshToken = createRefreshToken();
  const nextHash = hashRefreshToken(nextRefreshToken);
  const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const updated = await db.mobileSession.update({
    where: {
      id: session.id,
    },
    data: {
      refreshTokenHash: nextHash,
      expiresAt: nextExpiresAt,
      deviceId: metadata.deviceId ?? session.deviceId,
      deviceName: metadata.deviceName ?? session.deviceName,
      deviceModel: metadata.deviceModel ?? session.deviceModel,
      platform: metadata.platform ?? session.platform,
      appVersion: metadata.appVersion ?? session.appVersion,
      ipAddress: metadata.ipAddress ?? session.ipAddress,
      userAgent: metadata.userAgent ?? session.userAgent,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  const access = createAccessToken(updated.user, updated.id);

  return {
    accessToken: access.token,
    refreshToken: nextRefreshToken,
    expiresIn: access.expiresIn,
    refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    user: updated.user,
    sessionId: updated.id,
  };
}

export async function revokeMobileSessionByRefreshToken(refreshToken: string): Promise<void> {
  const hashed = hashRefreshToken(refreshToken);
  await db.mobileSession.updateMany({
    where: {
      refreshTokenHash: hashed,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeMobileSessionById(sessionId: string): Promise<void> {
  await db.mobileSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeAllMobileSessionsForUser(userId: string): Promise<void> {
  await db.mobileSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getMobileUserFromRequest(req: NextRequest): Promise<RequestUser | null> {
  const authorization = req.headers.get('authorization') ?? '';
  const [, bearerToken] = authorization.match(/^Bearer\s+(.+)$/i) ?? [];

  if (!bearerToken) {
    return null;
  }

  const payload = verifyJwt(bearerToken);
  if (!payload) {
    return null;
  }

  const session = await db.mobileSession.findFirst({
    where: {
      id: payload.sid,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    authType: 'mobile',
    sessionId: session.id,
  };
}

export async function getRequestUser(req: NextRequest): Promise<RequestUser | null> {
  const mobile = await getMobileUserFromRequest(req);
  if (mobile) {
    return mobile;
  }

  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const user = session.user as { id?: string | null; role?: string | null; name?: string | null };
  if (!user.id) {
    return null;
  }

  return {
    id: user.id,
    username: user.name ?? '',
    role: user.role ?? 'user',
    authType: 'web',
  };
}
