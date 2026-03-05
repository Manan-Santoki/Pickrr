import type { MobileNotificationType } from '@/types/mobile';
import { db } from '@/lib/db';

type CreateNotificationInput = {
  userId: string;
  type: MobileNotificationType;
  title: string;
  body: string;
  entityId?: string | null;
  deviceId?: string | null;
};

type DownloadStatus = 'downloading' | 'done' | 'failed' | 'paused';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(value: string): boolean {
  return /^ExponentPushToken\[[\w-]+\]$/.test(value) || /^ExpoPushToken\[[\w-]+\]$/.test(value);
}

async function sendExpoPush(
  tokens: string[],
  payload: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const validTokens = tokens.filter(isExpoPushToken);
  if (validTokens.length === 0) {
    return;
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    priority: 'high',
  }));

  const response = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown error');
    throw new Error(`Expo push failed (${response.status}): ${body}`);
  }
}

export async function createUserNotification(input: CreateNotificationInput): Promise<void> {
  await db.userNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityId: input.entityId ?? null,
      deviceId: input.deviceId ?? null,
    },
  });

  const devices = await db.userDevice.findMany({
    where: {
      userId: input.userId,
    },
    select: {
      expoPushToken: true,
    },
  });

  await sendExpoPush(
    devices.map((device: (typeof devices)[number]) => device.expoPushToken),
    {
      title: input.title,
      body: input.body,
      data: {
        type: input.type,
        entityId: input.entityId ?? null,
      },
    }
  ).catch(() => {
    // Non-blocking for API flows; notification record is still persisted.
  });
}

export function getDownloadNotificationPayload(
  status: DownloadStatus,
  title: string
): { type: MobileNotificationType; title: string; body: string } | null {
  if (status === 'done') {
    return {
      type: 'download_completed',
      title: 'Download completed',
      body: `${title} is ready in your library.`,
    };
  }

  if (status === 'failed') {
    return {
      type: 'download_failed',
      title: 'Download failed',
      body: `${title} failed. Check qBittorrent status.`,
    };
  }

  if (status === 'paused') {
    return {
      type: 'download_paused',
      title: 'Download paused',
      body: `${title} has been paused.`,
    };
  }

  if (status === 'downloading') {
    return {
      type: 'download_resumed',
      title: 'Download resumed',
      body: `${title} is downloading again.`,
    };
  }

  return null;
}
