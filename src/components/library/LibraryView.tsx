'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { Bookmark, Film, Heart, Loader2, Tv } from 'lucide-react';

interface LibraryItem {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  isFavorite: boolean;
  inWatchlist: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LibraryResponse {
  list: 'favorites' | 'watchlist' | 'all';
  results: LibraryItem[];
  error?: string;
}

const fetcher = async (url: string): Promise<LibraryResponse> => {
  const res = await fetch(url);
  const data = (await res.json()) as LibraryResponse;
  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to load library');
  }
  return data;
};

function mediaHref(item: LibraryItem): string {
  return item.mediaType === 'tv' ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;
}

export function LibraryView() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'watchlist'>('favorites');
  const { data, isLoading, error } = useSWR<LibraryResponse>('/api/library?list=all&limit=300', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const allItems = data?.results ?? [];

  const favorites = useMemo(() => allItems.filter((item) => item.isFavorite), [allItems]);
  const watchlist = useMemo(() => allItems.filter((item) => item.inWatchlist), [allItems]);
  const visible = activeTab === 'favorites' ? favorites : watchlist;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">Library</h1>
        <p className="mt-1 text-sm text-gray-500">Your saved favorites and watchlist titles.</p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-gray-900/70 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-red-500/20 text-red-200 ring-1 ring-red-400/30'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Heart className={`h-4 w-4 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
            Favorites
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs">{favorites.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'watchlist'
                ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Watchlist
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs">{watchlist.length}</span>
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-8 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading library...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error instanceof Error ? error.message : 'Failed to load library'}
        </div>
      ) : null}

      {!isLoading && !error && visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 px-4 py-12 text-center text-sm text-gray-500">
          {activeTab === 'favorites'
            ? 'No favorites yet. Add titles from movie/TV detail pages.'
            : 'Watchlist is empty. Add titles from movie/TV detail pages.'}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <Link
              key={item.id}
              href={mediaHref(item)}
              className="group overflow-hidden rounded-xl border border-white/5 bg-gray-900/70 transition-all hover:border-indigo-500/30"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-800">
                {item.posterPath ? (
                  <Image
                    src={item.posterPath}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-600">
                    {item.mediaType === 'tv' ? <Tv className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                  </div>
                )}

                <div className="absolute left-2 top-2 flex items-center gap-1">
                  {item.isFavorite ? (
                    <span className="rounded bg-red-500/80 p-1 text-white">
                      <Heart className="h-3 w-3 fill-current" />
                    </span>
                  ) : null}
                  {item.inWatchlist ? (
                    <span className="rounded bg-indigo-500/80 p-1 text-white">
                      <Bookmark className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1 p-2.5">
                <p className="truncate text-sm font-medium text-gray-100 group-hover:text-indigo-200">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {item.year ?? 'Unknown'} • {item.mediaType.toUpperCase()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
