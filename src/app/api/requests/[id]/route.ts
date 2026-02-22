import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteOverseerrRequest } from '@/services/overseerr';
import { deleteRadarrMovie } from '@/services/radarr';
import { deleteSonarrSeries } from '@/services/sonarr';
import { deleteTorrent } from '@/services/qbittorrent';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const request = await db.request.findUnique({
    where: { id: params.id },
    include: { torrents: { orderBy: { seasonNumber: 'asc' } } },
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    ...request,
    seasons: request.seasons ? JSON.parse(request.seasons) : null,
    torrents: request.torrents.map((t) => ({ ...t, size: t.size.toString() })),
  });
}

/**
 * DELETE /api/requests/[id]
 * Rejects & removes the request from Pickrr, Overseerr, and *arr.
 * Query param: ?stopDownload=true to also remove the active qBit torrent.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stopDownload = req.nextUrl.searchParams.get('stopDownload') === 'true';

  const request = await db.request.findUnique({
    where: { id: params.id },
    include: { torrents: true },
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 1. Stop active qBit downloads if requested
  if (stopDownload) {
    for (const torrent of request.torrents) {
      if (torrent.qbitHash) {
        deleteTorrent(torrent.qbitHash, false).catch(console.error);
      }
    }
  }

  // 2. Delete from Pickrr DB
  await db.torrent.deleteMany({ where: { requestId: request.id } });
  await db.request.delete({ where: { id: request.id } });

  // 3. Delete from Overseerr (fire-and-forget)
  deleteOverseerrRequest(request.overseerrId).catch(console.error);

  // 4. Remove from *arr (fire-and-forget, no files deleted)
  if (request.mediaType === 'movie') {
    deleteRadarrMovie(request.tmdbId).catch(console.error);
  } else {
    deleteSonarrSeries(request.tmdbId).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
