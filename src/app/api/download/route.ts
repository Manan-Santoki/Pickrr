import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getConfigValue } from '@/lib/settings';
import { addTorrent } from '@/services/qbittorrent';

const downloadSchema = z.object({
  tmdbId: z.number().int(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  year: z.number().int().nullable().optional(),
  posterPath: z.string().nullable().optional(),
  torrentTitle: z.string().min(1),
  indexer: z.string().min(1),
  size: z.number().int().nonnegative(),
  seeders: z.number().int().nonnegative(),
  downloadUrl: z.string().nullable().optional(),
  magnetUrl: z.string().nullable().optional(),
  savePath: z.string().optional(),
});

async function resolveSavePath(mediaType: 'movie' | 'tv', explicitPath?: string): Promise<string> {
  if (explicitPath && explicitPath.trim() !== '') {
    return explicitPath.trim();
  }

  const [moviesPath, tvPath] = await Promise.all([
    getConfigValue('MOVIES_SAVE_PATH'),
    getConfigValue('TV_SAVE_PATH'),
  ]);

  if (mediaType === 'movie') {
    return moviesPath ?? '/downloads/movies';
  }

  return tvPath ?? '/downloads/tv';
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUser = session.user as { id?: string | null };
  const userId = typeof sessionUser?.id === 'string' && sessionUser.id.length > 0
    ? sessionUser.id
    : null;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = downloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  if (!payload.downloadUrl && !payload.magnetUrl) {
    return NextResponse.json({ error: 'downloadUrl or magnetUrl is required' }, { status: 400 });
  }

  try {
    const savePath = await resolveSavePath(payload.mediaType, payload.savePath);

    await addTorrent(
      {
        downloadUrl: payload.downloadUrl ?? null,
        magnetUrl: payload.magnetUrl ?? null,
      },
      savePath,
      payload.mediaType
    );

    const created = await db.download.create({
      data: {
        userId,
        tmdbId: payload.tmdbId,
        mediaType: payload.mediaType,
        title: payload.title,
        year: payload.year ?? null,
        posterPath: payload.posterPath ?? null,
        torrentTitle: payload.torrentTitle,
        indexer: payload.indexer,
        size: BigInt(payload.size),
        seeders: payload.seeders,
        downloadUrl: payload.downloadUrl ?? '',
        magnetUrl: payload.magnetUrl ?? null,
        savePath,
        status: 'downloading',
      },
    });

    await db.mediaPreference.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId: payload.tmdbId,
          mediaType: payload.mediaType,
        },
      },
      create: {
        userId,
        tmdbId: payload.tmdbId,
        mediaType: payload.mediaType,
        title: payload.title,
        year: payload.year ?? null,
        posterPath: payload.posterPath ?? null,
        isFavorite: true,
        inWatchlist: true,
        autoFavoritedAt: new Date(),
      },
      update: {
        title: payload.title,
        year: payload.year ?? null,
        posterPath: payload.posterPath ?? null,
        isFavorite: true,
        inWatchlist: true,
        autoFavoritedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, id: created.id, autoFavorited: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to queue download' },
      { status: 500 }
    );
  }
}
