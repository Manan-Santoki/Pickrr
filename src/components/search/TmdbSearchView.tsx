'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Search, Star, Tv, Film, X } from 'lucide-react';
import type { TMDBMedia } from '@/services/tmdb';

interface SearchResponse {
  results: TMDBMedia[];
  error?: string;
}

function mediaHref(item: TMDBMedia): string {
  return item.mediaType === 'movie' ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`;
}

export function TmdbSearchView() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'movie' | 'tv' | 'multi'>('multi');
  const [results, setResults] = useState<TMDBMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ query: query.trim(), type });
        const res = await fetch(`/api/tmdb/search?${params}`);
        const data = (await res.json()) as SearchResponse;

        if (!res.ok) {
          throw new Error(data.error ?? 'Search failed');
        }

        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (fetchError: unknown) {
        setResults([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Search failed');
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, type]);

  const emptyMessage = useMemo(() => {
    if (!query.trim()) return 'Search TMDB for movies and TV shows.';
    if (query.trim().length < 2) return 'Type at least 2 characters.';
    return 'No results found.';
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <section className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6">
        <h1 className="text-2xl font-semibold text-white">Search</h1>
        <p className="mt-1 text-sm text-gray-400">
          Search TMDB, open a title, then pick a torrent from Prowlarr.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a movie or TV show"
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 py-2.5 pl-9 pr-10 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 transition-colors hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex overflow-hidden rounded-xl border border-gray-800 bg-gray-950/80 text-sm">
            {(['multi', 'movie', 'tv'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setType(option)}
                className={`px-3 py-2 font-medium transition-colors ${
                  type === option
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {option === 'multi' ? 'All' : option === 'movie' ? 'Movies' : 'TV'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-6 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching TMDB...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 px-4 py-10 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => (
            <Link
              key={`${item.mediaType}-${item.tmdbId}`}
              href={mediaHref(item)}
              className="group flex gap-3 rounded-xl border border-white/5 bg-gray-900/70 p-3 transition-colors hover:border-indigo-500/30"
            >
              <div className="h-[92px] w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    width={64}
                    height={92}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-600">
                    {item.mediaType === 'movie' ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white group-hover:text-indigo-200">
                  {item.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                  {item.year ? <span>{item.year}</span> : null}
                  <span className="uppercase">{item.mediaType}</span>
                  {item.rating > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-yellow-400">
                      <Star className="h-3 w-3 fill-current" />
                      {item.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600">
                  {item.overview || 'No overview available.'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
