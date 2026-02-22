import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
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

// OTT provider catalogue
export const OTT_PROVIDERS = [
  { id: 8,    name: 'Netflix',        color: '#E50914' },
  { id: 9,    name: 'Prime Video',    color: '#00A8E1' },
  { id: 337,  name: 'Disney+',        color: '#113CCF' },
  { id: 2,    name: 'Apple TV+',      color: '#555555' },
  { id: 1899, name: 'Max',            color: '#002BE7' },
  { id: 15,   name: 'Hulu',           color: '#1CE783' },
];

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

// OTT section name → TMDB provider ID
const OTT_SECTION_IDS: Partial<Record<Section, number>> = {
  netflix: 8,
  prime:   9,
  disney:  337,
  apple:   2,
  max:     1899,
  hulu:    15,
};

const sectionFetchers: Partial<Record<Section, () => Promise<TMDBMedia[]>>> = {
  trending:         () => getTrending('all', 'week'),
  trending_movies:  () => getTrending('movie', 'week'),
  trending_tv:      () => getTrending('tv', 'week'),
  now_playing:      () => getNowPlaying(),
  upcoming:         () => getUpcoming(),
  on_the_air:       () => getOnTheAir(),
  popular_movies:   () => getPopular('movie'),
  popular_tv:       () => getPopular('tv'),
  top_rated_movies: () => getTopRated('movie'),
  top_rated_tv:     () => getTopRated('tv'),
  bollywood:        () => getBollywood(),
  hollywood:        () => getHollywood(),
  recommendations:  async () => [], // handled separately below
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const section = (req.nextUrl.searchParams.get('section') ?? 'trending') as Section;

  try {
    if (section === 'recommendations') {
      // Build personalised recommendations from the last 10 unique tmdbIds in DB
      const recent = await db.request.findMany({
        where: { status: { not: 'declined' } },
        orderBy: { requestedAt: 'desc' },
        take: 10,
        select: { tmdbId: true, mediaType: true },
      });

      const seen = new Set<number>();
      const recs: TMDBMedia[] = [];

      for (const r of recent) {
        if (seen.has(r.tmdbId)) continue;
        seen.add(r.tmdbId);
        const items = await getRecommendations(r.tmdbId, r.mediaType as 'movie' | 'tv');
        for (const item of items) {
          if (!recs.find((x) => x.tmdbId === item.tmdbId)) recs.push(item);
        }
        if (recs.length >= 20) break;
      }

      return NextResponse.json({ results: recs.slice(0, 20) });
    }

    // OTT sections support a ?mediaType=movie|tv query param
    if (section in OTT_SECTION_IDS) {
      const providerId = OTT_SECTION_IDS[section]!;
      const mediaType = (req.nextUrl.searchParams.get('mediaType') ?? 'movie') as 'movie' | 'tv';
      const results = await getOTTContent(providerId, mediaType);
      return NextResponse.json({ results });
    }

    const fetcher = sectionFetchers[section];
    if (!fetcher) return NextResponse.json({ error: 'Unknown section' }, { status: 400 });

    const results = await fetcher();
    return NextResponse.json({ results });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Discover failed' },
      { status: 500 }
    );
  }
}
