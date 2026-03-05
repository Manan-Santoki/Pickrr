import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/mobile-auth';
import {
  getTrending,
  getNowPlaying,
  getUpcoming,
  getOnTheAir,
  getPopular,
  getBollywood,
  getHollywood,
  getOTTContent,
  getRecommendations,
  getTopRated,
  type TMDBMedia,
} from '@/services/tmdb';

type Section =
  | 'trending'
  | 'trending_movies'
  | 'trending_tv'
  | 'now_playing'
  | 'upcoming'
  | 'on_the_air'
  | 'popular_movies'
  | 'popular_tv'
  | 'top_rated_movies'
  | 'top_rated_tv'
  | 'bollywood'
  | 'hollywood'
  | 'recommendations'
  | 'netflix'
  | 'prime'
  | 'disney'
  | 'apple'
  | 'max'
  | 'hulu';

const OTT_SECTION_IDS: Partial<Record<Section, number>> = {
  netflix: 8,
  prime: 9,
  disney: 337,
  apple: 2,
  max: 1899,
  hulu: 15,
};

const sectionFetchers: Partial<Record<Section, () => Promise<TMDBMedia[]>>> = {
  trending: () => getTrending('all', 'week'),
  trending_movies: () => getTrending('movie', 'week'),
  trending_tv: () => getTrending('tv', 'week'),
  now_playing: () => getNowPlaying(),
  upcoming: () => getUpcoming(),
  on_the_air: () => getOnTheAir(),
  popular_movies: () => getPopular('movie'),
  popular_tv: () => getPopular('tv'),
  top_rated_movies: () => getTopRated('movie'),
  top_rated_tv: () => getTopRated('tv'),
  bollywood: () => getBollywood(),
  hollywood: () => getHollywood(),
  recommendations: async () => [],
};

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = user.id;

  const section = (req.nextUrl.searchParams.get('section') ?? 'trending') as Section;

  try {
    if (section === 'recommendations') {
      const [saved, recentDownloads] = await Promise.all([
        db.mediaPreference.findMany({
          where: userId
            ? {
                userId,
                OR: [{ isFavorite: true }, { inWatchlist: true }],
              }
            : { userId: '' },
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: { tmdbId: true, mediaType: true },
        }),
        db.download.findMany({
          where: userId
            ? {
                userId,
                status: { not: 'failed' },
              }
            : { userId: '' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { tmdbId: true, mediaType: true },
        }),
      ]);

      const combinedSeeds = [...saved, ...recentDownloads];
      const sourceSeen = new Set<string>();
      const seeds: Array<{ tmdbId: number; mediaType: 'movie' | 'tv' }> = [];

      for (const item of combinedSeeds) {
        const normalizedType: 'movie' | 'tv' = item.mediaType === 'tv' ? 'tv' : 'movie';
        const key = `${normalizedType}-${item.tmdbId}`;
        if (sourceSeen.has(key)) continue;
        sourceSeen.add(key);
        seeds.push({ tmdbId: item.tmdbId, mediaType: normalizedType });
        if (seeds.length >= 20) break;
      }

      const seen = new Set<string>();
      const recs: TMDBMedia[] = [];

      for (const item of seeds) {
        const list = await getRecommendations(item.tmdbId, item.mediaType);
        for (const rec of list) {
          const recKey = `${rec.mediaType}-${rec.tmdbId}`;
          if (seen.has(recKey)) continue;
          seen.add(recKey);
          recs.push(rec);
        }

        if (recs.length >= 20) break;
      }

      return NextResponse.json({ results: recs.slice(0, 20) });
    }

    if (section in OTT_SECTION_IDS) {
      const providerId = OTT_SECTION_IDS[section];
      if (!providerId) return NextResponse.json({ error: 'Unknown section' }, { status: 400 });

      const mediaType = (req.nextUrl.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv';
      const results = await getOTTContent(providerId, mediaType);
      return NextResponse.json({ results });
    }

    const fetcher = sectionFetchers[section];
    if (!fetcher) return NextResponse.json({ error: 'Unknown section' }, { status: 400 });

    const results = await fetcher();
    return NextResponse.json({ results });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discover failed' },
      { status: 500 }
    );
  }
}
