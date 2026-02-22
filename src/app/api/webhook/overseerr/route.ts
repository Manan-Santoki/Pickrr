import { NextRequest, NextResponse } from 'next/server';
import { enqueueWebhookJob } from '@/lib/queue';
import { db } from '@/lib/db';
import { getTMDBMetadata } from '@/services/tmdb';
import type { OverseerrWebhookPayload } from '@/types/overseerr';

const SUPPORTED_EVENTS = ['MEDIA_APPROVED', 'MEDIA_AUTO_APPROVED', 'MEDIA_PENDING'];

async function getWebhookSecret(): Promise<string | null> {
  // Check DB setting first, then env var
  const { getSetting } = await import('@/lib/settings');
  const dbSecret = await getSetting('WEBHOOK_SECRET');
  return dbSecret ?? process.env.WEBHOOK_SECRET ?? null;
}

export async function POST(req: NextRequest) {
  // Validate webhook secret (if configured)
  const webhookSecret = await getWebhookSecret();
  if (webhookSecret) {
    const incoming =
      req.headers.get('x-webhook-secret') ??
      req.headers.get('authorization')?.replace('Bearer ', '') ??
      new URL(req.url).searchParams.get('secret');

    if (incoming !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: OverseerrWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Skip unsupported events (always return 200 to prevent Overseerr retrying)
  if (!SUPPORTED_EVENTS.includes(body.notification_type)) {
    return NextResponse.json({ ok: true, skipped: true, event: body.notification_type });
  }

  // Validate required fields
  if (!body.request?.id || !body.media?.tmdbId || !body.media?.media_type) {
    console.error('[Webhook] Missing required fields:', JSON.stringify(body));
    return NextResponse.json({ ok: true, skipped: true, reason: 'missing_fields' });
  }

  // Try direct DB write first (faster than queue, handles Redis-down scenario)
  try {
    const meta = await getTMDBMetadata(body.media.tmdbId, body.media.media_type);

    await db.request.upsert({
      where: { overseerrId: body.request.id },
      create: {
        overseerrId: body.request.id,
        tmdbId: body.media.tmdbId,
        mediaType: body.media.media_type,
        title: meta?.title ?? body.subject ?? 'Unknown',
        year: meta?.year ?? null,
        posterPath: meta?.posterUrl ?? null,
        overview: meta?.overview ?? null,
        status: 'awaiting_selection',
        requestedBy: body.request.requestedBy_username ?? 'unknown',
      },
      update: {
        // Only update if still pending (don't overwrite if already being downloaded)
        status: 'awaiting_selection',
      },
    });

    console.log(`[Webhook] Processed: ${body.subject} (overseerrId: ${body.request.id})`);
  } catch (err) {
    // Fall back to async queue if direct DB write fails
    console.error('[Webhook] Direct write failed, falling back to queue:', err);
    try {
      await enqueueWebhookJob({
        overseerrId: body.request.id,
        tmdbId: body.media.tmdbId,
        mediaType: body.media.media_type,
        title: body.subject ?? 'Unknown',
        requestedBy: body.request.requestedBy_username ?? 'unknown',
      });
    } catch (queueErr) {
      console.error('[Webhook] Queue also failed:', queueErr);
    }
  }

  return NextResponse.json({ ok: true });
}
