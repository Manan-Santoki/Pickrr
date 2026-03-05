import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/mobile-auth';

const querySchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
});

const bodySchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().min(1),
  year: z.number().int().nullable().optional(),
  posterPath: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
  inWatchlist: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

  const parsed = querySchema.safeParse({
    tmdbId: req.nextUrl.searchParams.get('tmdbId') ?? undefined,
    mediaType: req.nextUrl.searchParams.get('mediaType') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const preference = await db.mediaPreference.findUnique({
    where: {
      userId_tmdbId_mediaType: {
        userId,
        tmdbId: parsed.data.tmdbId,
        mediaType: parsed.data.mediaType,
      },
    },
  });

  return NextResponse.json({
    tmdbId: parsed.data.tmdbId,
    mediaType: parsed.data.mediaType,
    isFavorite: preference?.isFavorite ?? false,
    inWatchlist: preference?.inWatchlist ?? false,
    hasEntry: Boolean(preference),
  });
}

export async function PUT(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.mediaPreference.findUnique({
    where: {
      userId_tmdbId_mediaType: {
        userId,
        tmdbId: parsed.data.tmdbId,
        mediaType: parsed.data.mediaType,
      },
    },
  });

  const nextIsFavorite = parsed.data.isFavorite ?? existing?.isFavorite ?? false;
  const nextInWatchlist = parsed.data.inWatchlist ?? existing?.inWatchlist ?? false;

  const updated = await db.mediaPreference.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId,
        tmdbId: parsed.data.tmdbId,
        mediaType: parsed.data.mediaType,
      },
    },
    create: {
      userId,
      tmdbId: parsed.data.tmdbId,
      mediaType: parsed.data.mediaType,
      title: parsed.data.title,
      year: parsed.data.year ?? null,
      posterPath: parsed.data.posterPath ?? null,
      isFavorite: nextIsFavorite,
      inWatchlist: nextInWatchlist,
      autoFavoritedAt: nextIsFavorite ? new Date() : null,
    },
    update: {
      title: parsed.data.title,
      year: parsed.data.year ?? null,
      posterPath: parsed.data.posterPath ?? null,
      isFavorite: nextIsFavorite,
      inWatchlist: nextInWatchlist,
      autoFavoritedAt: nextIsFavorite ? existing?.autoFavoritedAt ?? new Date() : null,
    },
  });

  if (!updated.isFavorite && !updated.inWatchlist) {
    await db.mediaPreference.delete({ where: { id: updated.id } });
  }

  return NextResponse.json({
    tmdbId: parsed.data.tmdbId,
    mediaType: parsed.data.mediaType,
    isFavorite: updated.isFavorite,
    inWatchlist: updated.inWatchlist,
    hasEntry: updated.isFavorite || updated.inWatchlist,
  });
}
