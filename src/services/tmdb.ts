import { getConfigValue } from '@/lib/settings';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const IMG_W300 = 'https://image.tmdb.org/t/p/w300';
const IMG_W780 = 'https://image.tmdb.org/t/p/w780';

async function getApiKey(): Promise<string> {
  const key = await getConfigValue('TMDB_API_KEY');
  if (!key) throw new Error('TMDB API key not configured — add it in Settings');
  return key;
}

function poster(path: string | null, size = IMG_W500): string | null {
  return path ? `${size}${path}` : null;
}

// ── Core types ────────────────────────────────────────────────────────────────

export interface TMDBMedia {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  mediaType: 'movie' | 'tv';
  genres?: string[];
  language?: string;        // original_language
  popularity?: number;
}

export interface TMDBSearchResult extends TMDBMedia {
  /** Known streaming providers in the request region */
  providers?: string[];
}

// ── Internal raw-result normaliser ────────────────────────────────────────────

function normalise(item: Record<string, unknown>, forcedType?: 'movie' | 'tv'): TMDBMedia {
  const mediaType: 'movie' | 'tv' =
    forcedType ?? (item.media_type === 'tv' ? 'tv' : 'movie');
  const title = (mediaType === 'movie' ? item.title : item.name) as string ?? 'Unknown';
  const rawDate = (mediaType === 'movie' ? item.release_date : item.first_air_date) as string;
  const year = rawDate ? new Date(rawDate).getFullYear() : null;

  const genres = Array.isArray(item.genres)
    ? (item.genres as { name: string }[]).map((g) => g.name)
    : Array.isArray(item.genre_ids)
    ? [] // ids only; skip resolution for list endpoints
    : [];

  return {
    tmdbId: item.id as number,
    title,
    year,
    overview: (item.overview as string) ?? '',
    posterUrl: poster(item.poster_path as string | null),
    backdropUrl: poster(item.backdrop_path as string | null, IMG_W780),
    rating: Math.round(((item.vote_average as number) ?? 0) * 10) / 10,
    voteCount: (item.vote_count as number) ?? 0,
    mediaType,
    genres,
    language: (item.original_language as string) ?? undefined,
    popularity: (item.popularity as number) ?? undefined,
  };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function tmdbFetch<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string> = {},
  cacheSeconds = 3600
): Promise<T> {
  const apiKey = await getApiKey();
  const qs = new URLSearchParams({ api_key: apiKey, ...params }).toString();
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`, {
    next: { revalidate: cacheSeconds },
  });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as T;
}

// ── Metadata (existing — used by sync/webhook) ────────────────────────────────

export async function getTMDBMetadata(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<TMDBMedia | null> {
  try {
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const data = await tmdbFetch<Record<string, unknown>>(
      `/${endpoint}/${tmdbId}`,
      {},
      86400
    );
    return normalise(data, mediaType);
  } catch {
    return null;
  }
}

// ── TMDB Search ───────────────────────────────────────────────────────────────

export async function searchTMDB(
  query: string,
  type: 'movie' | 'tv' | 'multi' = 'multi'
): Promise<TMDBSearchResult[]> {
  const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    endpoint,
    { query, include_adult: 'false', language: 'en-US' },
    300 // 5 min cache for search
  );

  return (data.results ?? [])
    .filter((r) => {
      // multi search includes people — exclude
      if (type === 'multi' && r.media_type === 'person') return false;
      return true;
    })
    .slice(0, 20)
    .map((r) =>
      normalise(r, type === 'multi' ? undefined : type)
    );
}

// ── Discovery lists ───────────────────────────────────────────────────────────

export async function getTrending(
  type: 'all' | 'movie' | 'tv' = 'all',
  window: 'day' | 'week' = 'week'
): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    `/trending/${type}/${window}`,
    { language: 'en-US' }
  );
  return (data.results ?? []).slice(0, 20).map((r) =>
    normalise(r, type === 'all' ? undefined : type)
  );
}

export async function getNowPlaying(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    '/movie/now_playing',
    { language: 'en-US', region: 'US' }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, 'movie'));
}

export async function getUpcoming(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    '/movie/upcoming',
    { language: 'en-US', region: 'US' }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, 'movie'));
}

export async function getOnTheAir(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    '/tv/on_the_air',
    { language: 'en-US' }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, 'tv'));
}

/**
 * Popular movies or TV shows.
 */
export async function getPopular(type: 'movie' | 'tv' = 'movie'): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    `/${type}/popular`,
    { language: 'en-US' }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, type));
}

/**
 * Bollywood — Hindi-language movies sorted by popularity.
 */
export async function getBollywood(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    '/discover/movie',
    {
      with_original_language: 'hi',
      sort_by: 'popularity.desc',
      language: 'en-US',
      'vote_count.gte': '50',
    }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, 'movie'));
}

/**
 * Hollywood — Popular English-language movies.
 */
export async function getHollywood(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    '/discover/movie',
    {
      with_original_language: 'en',
      sort_by: 'popularity.desc',
      language: 'en-US',
      'vote_count.gte': '100',
    }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, 'movie'));
}

/**
 * Content available on a specific streaming service.
 * Common provider IDs: Netflix=8, Amazon Prime=9, Disney+=337, Apple TV+=2, HBO Max=1899
 */
export async function getOTTContent(
  providerId: number,
  type: 'movie' | 'tv' = 'movie',
  region = 'US'
): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    `/discover/${type}`,
    {
      with_watch_providers: String(providerId),
      watch_region: region,
      sort_by: 'popularity.desc',
      language: 'en-US',
    }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, type));
}

/**
 * Recommendations for a specific title.
 */
export async function getRecommendations(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<TMDBMedia[]> {
  try {
    const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
      `/${mediaType}/${tmdbId}/recommendations`,
      { language: 'en-US' },
      3600
    );
    return (data.results ?? []).slice(0, 12).map((r) => normalise(r, mediaType));
  } catch {
    return [];
  }
}

/**
 * Streaming providers for a title (US region).
 */
export async function getWatchProviders(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  region = 'US'
): Promise<{ provider_name: string; logo_path: string; provider_id: number }[]> {
  try {
    const data = await tmdbFetch<{ results: Record<string, unknown> }>(
      `/${mediaType}/${tmdbId}/watch/providers`,
      {}
    );
    const regionData = data.results?.[region] as
      | { flatrate?: { provider_name: string; logo_path: string; provider_id: number }[] }
      | undefined;
    return regionData?.flatrate ?? [];
  } catch {
    return [];
  }
}

/**
 * Season numbers (>= 1) for a TV show.
 */
export async function getTVSeasons(tmdbId: number): Promise<number[]> {
  const data = await tmdbFetch<{ seasons?: { season_number: number }[] }>(
    `/tv/${tmdbId}`,
    {},
    3600
  );
  return (data.seasons ?? [])
    .filter((s) => s.season_number >= 1)
    .map((s) => s.season_number);
}

/**
 * Top-rated movies or TV shows.
 */
export async function getTopRated(type: 'movie' | 'tv' = 'movie'): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    `/${type}/top_rated`,
    { language: 'en-US' }
  );
  return (data.results ?? []).slice(0, 20).map((r) => normalise(r, type));
}
