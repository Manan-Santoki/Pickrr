import { NextRequest, NextResponse } from 'next/server';
import { enqueueWebhookJob } from '@/lib/queue';
import type { OverseerrWebhookPayload } from '@/types/overseerr';

const SUPPORTED_EVENTS = ['MEDIA_APPROVED', 'MEDIA_AUTO_APPROVED'];

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: OverseerrWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle approval events
  if (!SUPPORTED_EVENTS.includes(body.notification_type)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Enqueue for async processing (always return 200 to prevent Overseerr retrying)
  try {
    await enqueueWebhookJob({
      overseerrId: body.request.id,
      tmdbId: body.media.tmdbId,
      mediaType: body.media.media_type,
      title: body.subject ?? 'Unknown',
      requestedBy: body.request.requestedBy_username ?? 'unknown',
    });
  } catch (err) {
    console.error('[Webhook] Failed to enqueue job:', err);
  }

  return NextResponse.json({ ok: true });
}
