import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOverseerrRequests, type OverseerrRequest } from '@/services/overseerr';
import { getTMDBMetadata } from '@/services/tmdb';

/**
 * Map Overseerr media status to a Pickrr status string.
 * request.status: 1=pending, 2=approved, 3=declined
 * media.status:   1=unknown, 2=pending, 3=processing, 4=partially_available, 5=available
 */
function deriveStatus(req: OverseerrRequest): string {
  if (req.status === 3) return 'declined';
  const ms = req.media?.status ?? 1;
  if (ms >= 4) return 'available';   // partially or fully available
  if (ms === 3) return 'processing'; // arr is downloading it automatically
  return 'awaiting_selection';       // needs Pickrr torrent selection
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const errors: string[] = [];
    const allOverseerrRequests: OverseerrRequest[] = [];

    // ── Phase 1: Collect all requests from Overseerr ─────────────────────
    for (let page = 1; page <= 10; page++) {
      let data: Awaited<ReturnType<typeof getOverseerrRequests>>;
      try {
        data = await getOverseerrRequests(page, 20);
      } catch (err) {
        errors.push(`Page ${page}: ${err instanceof Error ? err.message : 'fetch failed'}`);
        break;
      }

      const { results, pageInfo } = data;
      if (!results || results.length === 0) break;
      allOverseerrRequests.push(...results);
      if (page >= pageInfo.pages) break;
    }

    const statusMap = new Map<number, OverseerrRequest>(
      allOverseerrRequests.map((r) => [r.id, r])
    );

    // ── Phase 2: Update existing Pickrr records whose Overseerr status changed ──
    const existingRequests = await db.request.findMany({
      select: { id: true, overseerrId: true, status: true },
    });

    let updated = 0;
    let pruned = 0;

    for (const r of existingRequests) {
      const overseerrReq = statusMap.get(r.overseerrId);

      if (!overseerrReq) {
        // Deleted from Overseerr — remove from Pickrr too
        await db.torrent.deleteMany({ where: { requestId: r.id } });
        await db.request.delete({ where: { id: r.id } });
        pruned++;
        continue;
      }

      const newStatus = deriveStatus(overseerrReq);

      // Only auto-update if the request hasn't been actively worked by Pickrr
      // (don't overwrite 'downloading' or 'done' statuses)
      const pickrrManaged = ['downloading', 'done', 'failed', 'selected'].includes(r.status);
      if (!pickrrManaged && newStatus !== r.status) {
        await db.request.update({
          where: { id: r.id },
          data: { status: newStatus },
        });
        updated++;
      }
    }

    // ── Phase 3: Import new requests ────────────────────────────────────
    let imported = 0;
    let skipped = 0;

    for (const req of allOverseerrRequests) {
      // Skip if already in Pickrr DB (already handled in phase 2)
      const existing = await db.request.findUnique({
        where: { overseerrId: req.id },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const mediaType = req.media?.mediaType ?? 'movie';
      const tmdbId = req.media?.tmdbId;
      if (!tmdbId) {
        skipped++;
        continue;
      }

      const meta = await getTMDBMetadata(tmdbId, mediaType).catch(() => null);

      const seasons =
        mediaType === 'tv' && req.seasons && req.seasons.length > 0
          ? JSON.stringify(req.seasons.map((s) => s.seasonNumber).sort((a, b) => a - b))
          : null;

      const status = deriveStatus(req);

      try {
        await db.request.create({
          data: {
            overseerrId: req.id,
            tmdbId,
            mediaType,
            title: meta?.title ?? `Request #${req.id}`,
            year: meta?.year ?? null,
            posterPath: meta?.posterUrl ?? null,
            overview: meta?.overview ?? null,
            seasons,
            status,
            requestedBy:
              req.requestedBy?.displayName ??
              req.requestedBy?.username ??
              'unknown',
            requestedAt: req.createdAt ? new Date(req.createdAt) : new Date(),
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, imported, updated, pruned, skipped, errors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
