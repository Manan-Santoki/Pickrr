'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Film,
  Globe2,
  Loader2,
  MapPinned,
  SlidersHorizontal,
  Star,
  Tv,
} from 'lucide-react';
import {
  DISCOVER_LABELS,
  defaultMediaTypeForSection,
  sectionSupportsMediaToggle,
  type DiscoverSection,
} from '@/lib/discover';
import type { TMDBMedia } from '@/services/tmdb';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popularity (High to Low)' },
  { value: 'popularity.asc', label: 'Popularity (Low to High)' },
  { value: 'vote_average.desc', label: 'Rating (High to Low)' },
  { value: 'vote_average.asc', label: 'Rating (Low to High)' },
  { value: 'release_date.desc', label: 'Newest First' },
  { value: 'release_date.asc', label: 'Oldest First' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];
const CURRENT_YEAR = new Date().getFullYear();

const LANGUAGE_OPTIONS = [
  { value: '', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
] as const;

const COUNTRY_OPTIONS = [
  { value: '', label: 'All Countries' },
  { value: 'US', label: 'United States' },
  { value: 'IN', label: 'India' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'KR', label: 'South Korea' },
  { value: 'JP', label: 'Japan' },
  { value: 'ES', label: 'Spain' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
] as const;

interface DiscoverCategoryResponse {
  section: DiscoverSection;
  label: string;
  results: TMDBMedia[];
  page: number;
  totalPages: number;
  totalResults: number;
  appliedMediaType: 'movie' | 'tv';
  appliedFilters: {
    language: string | null;
    region: string | null;
    releaseYear: number | null;
    minRating: number;
    sort: SortValue;
  };
  error?: string;
}

async function fetcher(url: string): Promise<DiscoverCategoryResponse> {
  const res = await fetch(url);
  const data = (await res.json()) as DiscoverCategoryResponse;

  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to load discover category');
  }

  return data;
}

function mediaHref(item: TMDBMedia): string {
  return item.mediaType === 'movie' ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`;
}

function initialMediaType(section: DiscoverSection, value: string | null): 'movie' | 'tv' {
  if (!sectionSupportsMediaToggle(section)) {
    return defaultMediaTypeForSection(section);
  }

  return value === 'tv' ? 'tv' : 'movie';
}

function initialSort(value: string | null): SortValue {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortValue)
    : 'popularity.desc';
}

export function DiscoverCategoryView({ section }: { section: DiscoverSection }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(() =>
    initialMediaType(section, searchParams.get('mediaType'))
  );
  const [language, setLanguage] = useState(() => searchParams.get('language') ?? '');
  const [region, setRegion] = useState(() => searchParams.get('region') ?? '');
  const [minRating, setMinRating] = useState(() => {
    const value = Number(searchParams.get('minRating') ?? 0);
    return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : 0;
  });
  const [sort, setSort] = useState<SortValue>(() => initialSort(searchParams.get('sort')));
  const [releaseYear, setReleaseYear] = useState(() => {
    const value = Number(searchParams.get('releaseYear') ?? 0);
    if (!Number.isFinite(value) || value < 1900 || value > CURRENT_YEAR + 1) return 0;
    return Math.floor(value);
  });
  const [page, setPage] = useState(() => {
    const value = Number(searchParams.get('page') ?? 1);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  });
  const normalizedLanguage = language.trim().slice(0, 2).toLowerCase();
  const languageCode = normalizedLanguage.length === 2 ? normalizedLanguage : '';
  const normalizedRegion = region.trim().slice(0, 2).toUpperCase();
  const regionCode = normalizedRegion.length === 2 ? normalizedRegion : '';

  const swrKey = useMemo(() => {
    const params = new URLSearchParams({
      section,
      page: String(page),
      limit: '20',
      minRating: String(minRating),
      sort,
    });

    if (sectionSupportsMediaToggle(section)) {
      params.set('mediaType', mediaType);
    }

    if (languageCode) {
      params.set('language', languageCode);
    }

    if (regionCode) {
      params.set('region', regionCode);
    }

    if (releaseYear > 0) {
      params.set('releaseYear', String(releaseYear));
    }

    return `/api/discover/category?${params.toString()}`;
  }, [languageCode, mediaType, minRating, page, regionCode, releaseYear, section, sort]);

  const { data, error, isLoading, isValidating } = useSWR<DiscoverCategoryResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    const params = new URLSearchParams();

    if (sectionSupportsMediaToggle(section)) {
      params.set('mediaType', mediaType);
    }

    if (languageCode) {
      params.set('language', languageCode);
    }

    if (regionCode) {
      params.set('region', regionCode);
    }

    if (releaseYear > 0) {
      params.set('releaseYear', String(releaseYear));
    }

    if (minRating > 0) {
      params.set('minRating', String(minRating));
    }

    if (sort !== 'popularity.desc') {
      params.set('sort', sort);
    }

    if (page > 1) {
      params.set('page', String(page));
    }

    const query = params.toString();
    router.replace(query ? `/discover/${section}?${query}` : `/discover/${section}`, { scroll: false });
  }, [languageCode, mediaType, minRating, page, regionCode, releaseYear, router, section, sort]);

  const items = data?.results ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalResults = data?.totalResults ?? 0;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-2">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{DISCOVER_LABELS[section]}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse the full category with language, region, rating, and sorting controls.
            </p>
          </div>

          <p className="text-xs text-gray-500">
            {isValidating && !isLoading ? 'Refreshing...' : `${totalResults.toLocaleString()} results`}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {sectionSupportsMediaToggle(section) ? (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-1.5">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <button
                  onClick={() => {
                    setMediaType('movie');
                    setPage(1);
                  }}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 font-medium transition-colors ${
                    mediaType === 'movie'
                      ? 'bg-indigo-600 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.35)]'
                      : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200'
                  }`}
                >
                  <Film className="h-3.5 w-3.5" />
                  Movies
                </button>
                <button
                  onClick={() => {
                    setMediaType('tv');
                    setPage(1);
                  }}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 font-medium transition-colors ${
                    mediaType === 'tv'
                      ? 'bg-indigo-600 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.35)]'
                      : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5" />
                  TV Shows
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-2 text-sm text-gray-400">
              Media type fixed to{' '}
              <span className="font-semibold uppercase text-gray-200">{defaultMediaTypeForSection(section)}</span>
            </div>
          )}

          <label className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-indigo-300/80" />
              Language
            </span>
            <select
              value={languageCode}
              onChange={(event) => {
                setLanguage(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 pr-8 text-sm text-gray-100 transition-colors hover:border-white/20 focus:border-indigo-400/50 focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900 text-gray-200">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-5 top-[34px] h-4 w-4 text-gray-500" />
          </label>

          <label className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPinned className="h-3.5 w-3.5 text-cyan-300/80" />
              Country / Region
            </span>
            <select
              value={regionCode}
              onChange={(event) => {
                setRegion(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 pr-8 text-sm text-gray-100 transition-colors hover:border-white/20 focus:border-indigo-400/50 focus:outline-none"
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900 text-gray-200">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-5 top-[34px] h-4 w-4 text-gray-500" />
          </label>

          <label className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-emerald-300/80" />
              Release Year
            </span>
            <select
              value={releaseYear > 0 ? String(releaseYear) : ''}
              onChange={(event) => {
                const value = Number(event.target.value);
                setReleaseYear(Number.isFinite(value) && value > 0 ? value : 0);
                setPage(1);
              }}
              className="mt-1 w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 pr-8 text-sm text-gray-100 transition-colors hover:border-white/20 focus:border-indigo-400/50 focus:outline-none"
            >
              <option value="" className="bg-gray-900 text-gray-200">
                All Years
              </option>
              {Array.from({ length: CURRENT_YEAR - 1949 }).map((_, index) => {
                const year = CURRENT_YEAR + 1 - index;
                return (
                  <option key={year} value={year} className="bg-gray-900 text-gray-200">
                    {year}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-5 top-[34px] h-4 w-4 text-gray-500" />
          </label>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-2 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-yellow-300/80" />
                Minimum Rating
              </span>
              <span className="font-semibold text-yellow-300">{minRating.toFixed(1)}</span>
            </div>
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={minRating}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMinRating(Number.isFinite(next) ? Math.max(0, Math.min(10, next)) : 0);
                  setPage(1);
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-800 accent-yellow-400"
              />
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                  style={{ width: `${Math.max(0, Math.min(100, minRating * 10))}%` }}
                />
              </div>
            </div>
          </div>

          <label className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent px-3 py-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <ChevronDown className="h-3.5 w-3.5 rotate-90 text-pink-300/80" />
              Sort By
            </span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortValue);
                setPage(1);
              }}
              className="mt-1 w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 pr-8 text-sm text-gray-100 transition-colors hover:border-white/20 focus:border-indigo-400/50 focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900 text-gray-200">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-5 top-[34px] h-4 w-4 text-gray-500" />
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-7 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading category...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error instanceof Error ? error.message : 'Failed to load category'}
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
          No results for this filter set.
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <Link
              key={`${item.mediaType}-${item.tmdbId}`}
              href={mediaHref(item)}
              className="group overflow-hidden rounded-xl border border-white/5 bg-gray-900/70 transition-all hover:border-indigo-500/30"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-800">
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-600">
                    {item.mediaType === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                  </div>
                )}

                {item.rating > 0 ? (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[11px] text-yellow-300">
                    <Star className="h-3 w-3 fill-current" />
                    {item.rating.toFixed(1)}
                  </span>
                ) : null}

                {item.inJellyfin ? (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-emerald-950/85 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    In Jellyfin
                  </span>
                ) : null}
              </div>

              <div className="space-y-1 p-2.5">
                <p className="truncate text-sm font-medium text-gray-100 group-hover:text-indigo-200">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {item.year ?? 'Unknown'} • {item.mediaType.toUpperCase()}
                  {item.language ? ` • ${item.language.toUpperCase()}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-gray-900/50 p-3">
        <button
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-sm text-gray-200 transition-colors enabled:hover:border-indigo-400/30 enabled:hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        <p className="text-xs text-gray-500">
          Page <span className="font-semibold text-gray-300">{page}</span> of{' '}
          <span className="font-semibold text-gray-300">{totalPages}</span>
        </p>

        <button
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-sm text-gray-200 transition-colors enabled:hover:border-indigo-400/30 enabled:hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
