import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  DISCOVER_LABELS,
  OTT_SECTION_IDS,
  defaultMediaTypeForSection,
  isDiscoverSection,
  sectionSupportsMediaToggle,
  type DiscoverSection,
} from '@/lib/discover';
import { db } from '@/lib/db';
import { getRequestUser } from '@/lib/mobile-auth';
import { getConfigValue } from '@/lib/settings';
import { annotateWithJellyfinAvailability } from '@/services/jellyfin';
import { getRecommendations, type MediaType, type TMDBMedia } from '@/services/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const IMG_W780 = 'https://image.tmdb.org/t/p/w780';
const CURRENT_YEAR = new Date().getFullYear();

const SORT_OPTIONS = [
  'popularity.desc',
  'popularity.asc',
  'vote_average.desc',
  'vote_average.asc',
  'release_date.desc',
  'release_date.asc',
] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

type TMDBListResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: Record<string, unknown>[];
};

const querySchema = z.object({
  section: z.string().refine((value) => isDiscoverSection(value), {
    message: 'Invalid section',
  }),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  mediaType: z.enum(['movie', 'tv']).optional(),
  language: z.string().trim().regex(/^[a-z]{2}$/i).optional(),
  region: z.string().trim().regex(/^[a-z]{2}$/i).optional(),
  releaseYear: z.coerce.number().int().min(1900).max(CURRENT_YEAR + 1).optional(),
  minRating: z.coerce.number().min(0).max(10).default(0),
  sort: z.enum(SORT_OPTIONS).default('popularity.desc'),
});

function toPoster(path: unknown, size = IMG_W500): string | null {
  return typeof path === 'string' && path.length > 0 ? `${size}${path}` : null;
}

function toYear(rawDate: unknown): number | null {
  if (typeof rawDate !== 'string' || rawDate.length < 4) return null;
  const year = Number(rawDate.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function normaliseMedia(item: Record<string, unknown>, mediaType: MediaType): TMDBMedia {
  const title = mediaType === 'movie' ? (item.title as string) : (item.name as string);
  const rawDate = mediaType === 'movie' ? item.release_date : item.first_air_date;

  return {
    tmdbId: Number(item.id ?? 0),
    title: title ?? 'Unknown',
    year: toYear(rawDate),
    overview: typeof item.overview === 'string' ? item.overview : '',
    posterUrl: toPoster(item.poster_path),
    backdropUrl: toPoster(item.backdrop_path, IMG_W780),
    rating: Math.round(Number(item.vote_average ?? 0) * 10) / 10,
    voteCount: Number(item.vote_count ?? 0),
    mediaType,
    genres: [],
    language: typeof item.original_language === 'string' ? item.original_language : null,
    inJellyfin: false,
  };
}

async function tmdbFetch(path: string, params: Record<string, string>): Promise<TMDBListResponse> {
  const apiKey = await getConfigValue('TMDB_API_KEY');
  if (!apiKey) {
    throw new Error('TMDB API key not configured — set TMDB_API_KEY in Settings or env');
  }

  const query = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    include_adult: 'false',
    ...params,
  });

  const res = await fetch(`${TMDB_BASE}${path}?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }

  return (await res.json()) as TMDBListResponse;
}

function sortBy(items: TMDBMedia[], sort: SortOption): TMDBMedia[] {
  const list = [...items];

  const yearNumber = (value: number | null): number => (typeof value === 'number' ? value : -1);

  switch (sort) {
    case 'vote_average.desc':
      return list.sort((a, b) => b.rating - a.rating || b.voteCount - a.voteCount);
    case 'vote_average.asc':
      return list.sort((a, b) => a.rating - b.rating || a.voteCount - b.voteCount);
    case 'release_date.desc':
      return list.sort((a, b) => yearNumber(b.year) - yearNumber(a.year) || b.voteCount - a.voteCount);
    case 'release_date.asc':
      return list.sort((a, b) => yearNumber(a.year) - yearNumber(b.year) || b.voteCount - a.voteCount);
    case 'popularity.asc':
      return list.sort((a, b) => a.voteCount - b.voteCount || a.rating - b.rating);
    case 'popularity.desc':
    default:
      return list.sort((a, b) => b.voteCount - a.voteCount || b.rating - a.rating);
  }
}

function toTmdbDiscoverSort(sort: SortOption, mediaType: MediaType): string {
  if (sort === 'release_date.desc') {
    return mediaType === 'tv' ? 'first_air_date.desc' : 'primary_release_date.desc';
  }

  if (sort === 'release_date.asc') {
    return mediaType === 'tv' ? 'first_air_date.asc' : 'primary_release_date.asc';
  }

  return sort;
}

function filterItems(
  items: TMDBMedia[],
  {
    mediaType,
    language,
    releaseYear,
    minRating,
  }: {
    mediaType?: MediaType;
    language?: string;
    releaseYear?: number;
    minRating: number;
  }
): TMDBMedia[] {
  const languageLower = language?.toLowerCase();

  return items.filter((item) => {
    if (mediaType && item.mediaType !== mediaType) return false;
    if (languageLower && (item.language ?? '').toLowerCase() !== languageLower) return false;
    if (releaseYear && item.year !== releaseYear) return false;
    if (item.rating < minRating) return false;
    return true;
  });
}

function paginateItems(items: TMDBMedia[], page: number, limit: number): TMDBMedia[] {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

function resolveMediaType(section: DiscoverSection, requested?: MediaType): MediaType {
  if (
    section === 'trending_movies' ||
    section === 'now_playing' ||
    section === 'upcoming' ||
    section === 'popular_movies' ||
    section === 'top_rated_movies' ||
    section === 'bollywood' ||
    section === 'hollywood'
  ) {
    return 'movie';
  }

  if (section === 'trending_tv' || section === 'on_the_air' || section === 'popular_tv' || section === 'top_rated_tv') {
    return 'tv';
  }

  if (sectionSupportsMediaToggle(section)) {
    return requested ?? defaultMediaTypeForSection(section);
  }

  return defaultMediaTypeForSection(section);
}

async function fetchRecommendations(limit: number, userId: string | null): Promise<TMDBMedia[]> {
  const [saved, recentDownloads] = await Promise.all([
    db.mediaPreference.findMany({
      where: userId
        ? {
            userId,
            OR: [{ isFavorite: true }, { inWatchlist: true }],
          }
        : { userId: '' },
      orderBy: { updatedAt: 'desc' },
      take: 24,
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
      take: 24,
      select: { tmdbId: true, mediaType: true },
    }),
  ]);

  const seeds: Array<{ tmdbId: number; mediaType: MediaType }> = [];
  const seedSeen = new Set<string>();

  for (const item of [...saved, ...recentDownloads]) {
    const normalizedType: MediaType = item.mediaType === 'tv' ? 'tv' : 'movie';
    const key = `${normalizedType}-${item.tmdbId}`;
    if (seedSeen.has(key)) continue;
    seedSeen.add(key);
    seeds.push({ tmdbId: item.tmdbId, mediaType: normalizedType });
    if (seeds.length >= 24) break;
  }

  const seen = new Set<string>();
  const results: TMDBMedia[] = [];

  for (const item of seeds) {
    const list = await getRecommendations(item.tmdbId, item.mediaType);

    for (const entry of list) {
      const key = `${entry.mediaType}-${entry.tmdbId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(entry);

      if (results.length >= limit) {
        return results;
      }
    }
  }

  return results;
}

async function fetchSectionFromTmdb(
  section: DiscoverSection,
  mediaType: MediaType,
  page: number,
  language: string | undefined,
  region: string | undefined,
  releaseYear: number | undefined,
  minRating: number,
  sort: SortOption
): Promise<{ results: TMDBMedia[]; totalPages: number; totalResults: number }> {
  const tmdbPage = String(page);
  const baseParams: Record<string, string> = { page: tmdbPage };

  let path = '';
  let params: Record<string, string> = { ...baseParams };
  let mapperType: MediaType = mediaType;

  switch (section) {
    case 'trending': {
      path = `/trending/${mediaType}/week`;
      mapperType = mediaType;
      break;
    }
    case 'trending_movies': {
      path = '/trending/movie/week';
      mapperType = 'movie';
      break;
    }
    case 'trending_tv': {
      path = '/trending/tv/week';
      mapperType = 'tv';
      break;
    }
    case 'now_playing': {
      path = '/movie/now_playing';
      params = {
        ...params,
        region: region ?? 'US',
      };
      mapperType = 'movie';
      break;
    }
    case 'upcoming': {
      path = '/movie/upcoming';
      params = {
        ...params,
        region: region ?? 'US',
      };
      mapperType = 'movie';
      break;
    }
    case 'on_the_air': {
      path = '/tv/on_the_air';
      mapperType = 'tv';
      break;
    }
    case 'popular_movies': {
      path = '/movie/popular';
      mapperType = 'movie';
      break;
    }
    case 'popular_tv': {
      path = '/tv/popular';
      mapperType = 'tv';
      break;
    }
    case 'top_rated_movies': {
      path = '/movie/top_rated';
      mapperType = 'movie';
      break;
    }
    case 'top_rated_tv': {
      path = '/tv/top_rated';
      mapperType = 'tv';
      break;
    }
    case 'bollywood': {
      path = '/discover/movie';
      params = {
        ...params,
        sort_by: toTmdbDiscoverSort(sort, 'movie'),
        with_original_language: language ?? 'hi',
      };

      if (minRating > 0) {
        params['vote_average.gte'] = String(minRating);
        params['vote_count.gte'] = '50';
      }

      if (releaseYear) {
        params.primary_release_year = String(releaseYear);
      }

      if (region) {
        params.with_origin_country = region;
      }

      mapperType = 'movie';
      break;
    }
    case 'hollywood': {
      path = '/discover/movie';
      params = {
        ...params,
        sort_by: toTmdbDiscoverSort(sort, 'movie'),
        with_original_language: language ?? 'en',
      };

      if (minRating > 0) {
        params['vote_average.gte'] = String(minRating);
        params['vote_count.gte'] = '50';
      }

      if (releaseYear) {
        params.primary_release_year = String(releaseYear);
      }

      if (region) {
        params.with_origin_country = region;
      }

      mapperType = 'movie';
      break;
    }
    case 'netflix':
    case 'prime':
    case 'disney':
    case 'apple':
    case 'max':
    case 'hulu': {
      const providerId = OTT_SECTION_IDS[section];
      if (!providerId) {
        throw new Error('Unknown OTT provider');
      }

      path = `/discover/${mediaType}`;
      params = {
        ...params,
        sort_by: toTmdbDiscoverSort(sort, mediaType),
        watch_region: region ?? 'US',
        with_watch_providers: String(providerId),
      };

      if (minRating > 0) {
        params['vote_average.gte'] = String(minRating);
        params['vote_count.gte'] = '50';
      }

      if (releaseYear) {
        params[mediaType === 'tv' ? 'first_air_date_year' : 'primary_release_year'] = String(releaseYear);
      }

      if (language) {
        params.with_original_language = language;
      }

      mapperType = mediaType;
      break;
    }
    case 'recommendations': {
      return { results: [], totalPages: 1, totalResults: 0 };
    }
  }

  const payload = await tmdbFetch(path, params);

  const normalized = (payload.results ?? []).map((item) => normaliseMedia(item, mapperType));

  return {
    results: normalized,
    totalPages: Math.max(1, Number(payload.total_pages ?? 1)),
    totalResults: Number(payload.total_results ?? normalized.length),
  };
}

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

  const parsed = querySchema.safeParse({
    section: req.nextUrl.searchParams.get('section'),
    page: req.nextUrl.searchParams.get('page') ?? undefined,
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    mediaType: req.nextUrl.searchParams.get('mediaType') || undefined,
    language: req.nextUrl.searchParams.get('language') || undefined,
    region: req.nextUrl.searchParams.get('region') || undefined,
    releaseYear: req.nextUrl.searchParams.get('releaseYear') || undefined,
    minRating: req.nextUrl.searchParams.get('minRating') ?? undefined,
    sort: req.nextUrl.searchParams.get('sort') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const section = parsed.data.section as DiscoverSection;
  const page = parsed.data.page;
  const limit = parsed.data.limit;
  const minRating = parsed.data.minRating;
  const releaseYear = parsed.data.releaseYear;
  const language = parsed.data.language?.toLowerCase();
  const region = parsed.data.region?.toUpperCase();
  const sort = parsed.data.sort;

  const requestedMediaType = parsed.data.mediaType as MediaType | undefined;
  const appliedMediaType = resolveMediaType(section, requestedMediaType);

  try {
    if (section === 'recommendations') {
      const fullList = await fetchRecommendations(240, userId);
      const filtered = filterItems(fullList, {
        mediaType: sectionSupportsMediaToggle(section) ? appliedMediaType : undefined,
        language,
        releaseYear,
        minRating,
      });
      const sorted = sortBy(filtered, sort);
      const totalResults = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalResults / limit));
      const results = paginateItems(sorted, page, limit);
      const annotatedResults = await annotateWithJellyfinAvailability(results);

      return NextResponse.json({
        section,
        label: DISCOVER_LABELS[section],
        results: annotatedResults,
        page,
        totalPages,
        totalResults,
        appliedMediaType,
        appliedFilters: {
          language: language ?? null,
          region: region ?? null,
          releaseYear: releaseYear ?? null,
          minRating,
          sort,
        },
      });
    }

    const payload = await fetchSectionFromTmdb(
      section,
      appliedMediaType,
      page,
      language,
      region,
      releaseYear,
      minRating,
      sort
    );

    const filtered = filterItems(payload.results, {
      mediaType: sectionSupportsMediaToggle(section) ? appliedMediaType : undefined,
      language,
      releaseYear,
      minRating,
    });

    const sorted = sortBy(filtered, sort);
    const results = sorted.slice(0, limit);
    const annotatedResults = await annotateWithJellyfinAvailability(results);

    return NextResponse.json({
      section,
      label: DISCOVER_LABELS[section],
      results: annotatedResults,
      page,
      totalPages: payload.totalPages,
      totalResults: payload.totalResults,
      appliedMediaType,
      appliedFilters: {
        language: language ?? null,
        region: region ?? null,
        releaseYear: releaseYear ?? null,
        minRating,
        sort,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load discover category',
      },
      { status: 500 }
    );
  }
}
