import { getConfigValue } from '@/lib/settings';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const IMG_W780 = 'https://image.tmdb.org/t/p/w780';
const IMG_W185 = 'https://image.tmdb.org/t/p/w185';

export type MediaType = 'movie' | 'tv';

export interface TMDBMedia {
  tmdbId: number;
  title: string;
  year: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  mediaType: MediaType;
  genres: string[];
  language: string | null;
}

export interface TMDBTrailer {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  url: string;
}

export interface TMDBReview {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  url: string | null;
  rating: number | null;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string | null;
  profileUrl: string | null;
}

export interface TMDBDetails extends TMDBMedia {
  runtimeMinutes: number | null;
  seasons: number[];
  trailers: TMDBTrailer[];
  primaryTrailer: TMDBTrailer | null;
  reviews: TMDBReview[];
  cast: TMDBCastMember[];
}

async function getApiKey(): Promise<string> {
  const key = await getConfigValue('TMDB_API_KEY');
  if (!key) {
    throw new Error('TMDB API key not configured — set TMDB_API_KEY in Settings or env');
  }
  return key;
}

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

  const genres = Array.isArray(item.genres)
    ? item.genres
        .filter((entry): entry is { name?: string } => typeof entry === 'object' && entry !== null)
        .map((entry) => entry.name)
        .filter((name): name is string => typeof name === 'string')
    : [];

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
    genres,
    language: typeof item.original_language === 'string' ? item.original_language : null,
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = await getApiKey();
  const query = new URLSearchParams({ api_key: apiKey, language: 'en-US', ...params }).toString();

  const res = await fetch(`${TMDB_BASE}${path}?${query}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

export async function searchTMDB(query: string, type: MediaType | 'multi' = 'multi'): Promise<TMDBMedia[]> {
  const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(endpoint, {
    query,
    include_adult: 'false',
  });

  return (data.results ?? [])
    .filter((item) => {
      if (type !== 'multi') return true;
      return item.media_type === 'movie' || item.media_type === 'tv';
    })
    .slice(0, 20)
    .map((item) => {
      const inferredType: MediaType =
        type === 'multi'
          ? item.media_type === 'tv'
            ? 'tv'
            : 'movie'
          : type;

      return normaliseMedia(item, inferredType);
    });
}

export async function getTMDBDetails(tmdbId: number, mediaType: MediaType): Promise<TMDBDetails> {
  const data = await tmdbFetch<Record<string, unknown>>(`/${mediaType}/${tmdbId}`, {
    append_to_response: 'videos,reviews,credits',
  });
  const base = normaliseMedia(data, mediaType);

  const episodeRunTime = Array.isArray(data.episode_run_time)
    ? Number(data.episode_run_time[0])
    : NaN;

  const runtimeMinutes =
    mediaType === 'movie'
      ? Number.isFinite(Number(data.runtime))
        ? Number(data.runtime)
        : null
      : Number.isFinite(episodeRunTime)
      ? episodeRunTime
      : null;

  const seasons =
    mediaType === 'tv' && Array.isArray(data.seasons)
      ? data.seasons
          .map((season) => (season as { season_number?: number }).season_number)
          .filter((seasonNumber): seasonNumber is number => typeof seasonNumber === 'number' && seasonNumber > 0)
      : [];

  const videoResults = ((data.videos as { results?: unknown[] } | undefined)?.results ?? [])
    .filter((video): video is Record<string, unknown> => typeof video === 'object' && video !== null);

  const trailers = videoResults
    .map((video) => {
      const site = typeof video.site === 'string' ? video.site : '';
      const key = typeof video.key === 'string' ? video.key : '';
      if (site !== 'YouTube' || key.length === 0) return null;

      const trailer: TMDBTrailer = {
        key,
        name: typeof video.name === 'string' ? video.name : 'Trailer',
        site,
        type: typeof video.type === 'string' ? video.type : 'Trailer',
        official: Boolean(video.official),
        url: `https://www.youtube.com/watch?v=${key}`,
      };
      return trailer;
    })
    .filter((item): item is TMDBTrailer => item !== null)
    .sort((a, b) => {
      const aScore = Number(a.type === 'Trailer') * 10 + Number(a.official) * 5;
      const bScore = Number(b.type === 'Trailer') * 10 + Number(b.official) * 5;
      return bScore - aScore;
    });

  const primaryTrailer = trailers[0] ?? null;

  const reviewResults = ((data.reviews as { results?: unknown[] } | undefined)?.results ?? [])
    .filter((review): review is Record<string, unknown> => typeof review === 'object' && review !== null);

  const reviews: TMDBReview[] = reviewResults.slice(0, 8).map((review, index) => {
    const authorDetails = (review.author_details as Record<string, unknown> | undefined) ?? {};
    const rating =
      typeof authorDetails.rating === 'number' ? authorDetails.rating : null;

    return {
      id: typeof review.id === 'string' ? review.id : `${tmdbId}-${index}`,
      author: typeof review.author === 'string' ? review.author : 'Anonymous',
      content: typeof review.content === 'string' ? review.content : '',
      createdAt:
        typeof review.created_at === 'string'
          ? review.created_at
          : new Date().toISOString(),
      url: typeof review.url === 'string' ? review.url : null,
      rating,
    };
  });

  const castResults = ((data.credits as { cast?: unknown[] } | undefined)?.cast ?? [])
    .filter((member): member is Record<string, unknown> => typeof member === 'object' && member !== null);

  const cast: TMDBCastMember[] = castResults.slice(0, 18).map((member, index) => ({
    id: typeof member.id === 'number' ? member.id : index,
    name: typeof member.name === 'string' ? member.name : 'Unknown',
    character: typeof member.character === 'string' && member.character.trim().length > 0 ? member.character : null,
    profileUrl: toPoster(member.profile_path, IMG_W185),
  }));

  return {
    ...base,
    runtimeMinutes,
    seasons,
    trailers,
    primaryTrailer,
    reviews,
    cast,
  };
}

export async function getTrending(
  type: 'all' | 'movie' | 'tv' = 'all',
  window: 'day' | 'week' = 'week'
): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
    `/trending/${type}/${window}`
  );

  return (data.results ?? []).slice(0, 20).map((item) => {
    const inferredType: MediaType =
      type === 'tv' ? 'tv' : type === 'movie' ? 'movie' : item.media_type === 'tv' ? 'tv' : 'movie';
    return normaliseMedia(item, inferredType);
  });
}

export async function getNowPlaying(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>('/movie/now_playing', {
    region: 'US',
  });
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, 'movie'));
}

export async function getUpcoming(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>('/movie/upcoming', {
    region: 'US',
  });
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, 'movie'));
}

export async function getOnTheAir(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>('/tv/on_the_air');
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, 'tv'));
}

export async function getPopular(type: MediaType = 'movie'): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(`/${type}/popular`);
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, type));
}

export async function getBollywood(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>('/discover/movie', {
    with_original_language: 'hi',
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  });
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, 'movie'));
}

export async function getHollywood(): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>('/discover/movie', {
    with_original_language: 'en',
    sort_by: 'popularity.desc',
    'vote_count.gte': '100',
  });
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, 'movie'));
}

export async function getOTTContent(
  providerId: number,
  type: MediaType = 'movie',
  region = 'US'
): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(`/discover/${type}`, {
    with_watch_providers: String(providerId),
    watch_region: region,
    sort_by: 'popularity.desc',
  });
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, type));
}

export async function getRecommendations(
  tmdbId: number,
  mediaType: MediaType
): Promise<TMDBMedia[]> {
  try {
    const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(
      `/${mediaType}/${tmdbId}/recommendations`
    );
    return (data.results ?? []).slice(0, 12).map((item) => normaliseMedia(item, mediaType));
  } catch {
    return [];
  }
}

export async function getTopRated(type: MediaType = 'movie'): Promise<TMDBMedia[]> {
  const data = await tmdbFetch<{ results: Record<string, unknown>[] }>(`/${type}/top_rated`);
  return (data.results ?? []).slice(0, 20).map((item) => normaliseMedia(item, type));
}
