'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Star, Film, Tv, X, Loader2, ArrowLeft } from 'lucide-react';
import { TorrentSelectModal } from '@/components/requests/TorrentSelectModal';
import type { TMDBMedia } from '@/services/tmdb';
import Image from 'next/image';

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 7.5 ? 'text-green-400' : rating >= 6 ? 'text-yellow-400' : 'text-gray-500';
  return (
    <span className={`flex items-center gap-0.5 text-xs font-mono ${color}`}>
      <Star className="w-2.5 h-2.5 fill-current" />
      {rating.toFixed(1)}
    </span>
  );
}

function MediaTypeIcon({ type }: { type: 'movie' | 'tv' }) {
  return type === 'movie'
    ? <Film className="w-3 h-3 text-orange-400" />
    : <Tv className="w-3 h-3 text-blue-400" />;
}

function TMDBCard({
  item,
  onClick,
}: {
  item: TMDBMedia;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left flex gap-3 p-3 rounded-xl bg-gray-900/60 border border-white/5 hover:border-indigo-500/30 hover:bg-gray-900 transition-all"
    >
      {/* Poster */}
      <div className="w-12 h-[68px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            width={48}
            height={68}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MediaTypeIcon type={item.mediaType} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <MediaTypeIcon type={item.mediaType} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {item.year && <span className="text-xs text-gray-500">{item.year}</span>}
              {item.rating > 0 && <RatingBadge rating={item.rating} />}
              {item.language && item.language !== 'en' && (
                <span className="text-[10px] uppercase bg-gray-800 text-gray-500 px-1 py-0.5 rounded">
                  {item.language}
                </span>
              )}
            </div>
          </div>
        </div>
        {item.overview && (
          <p className="text-[11px] text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
            {item.overview}
          </p>
        )}
        <p className="text-[10px] text-indigo-500 mt-1.5 group-hover:text-indigo-400 transition-colors font-medium">
          Find torrents →
        </p>
      </div>
    </button>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'movie' | 'tv' | 'multi'>('multi');
  const [tmdbResults, setTmdbResults] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TMDBMedia | null>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<number[] | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState<number | null>(null); // holds tmdbId while loading
  const debounceRef = useRef<NodeJS.Timeout>();

  const doSearch = useCallback(async (q: string, t: string) => {
    if (!q.trim() || q.trim().length < 2) { setTmdbResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(q)}&type=${t}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      setTmdbResults(data.results ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setTmdbResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, typeFilter), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, typeFilter, doSearch]);

  const clearSearch = () => {
    setQuery('');
    setTmdbResults([]);
    setError(null);
  };

  const handleSelect = async (item: TMDBMedia) => {
    if (item.mediaType === 'tv') {
      setLoadingSeasons(item.tmdbId);
      try {
        const res = await fetch(`/api/tmdb/tv/${item.tmdbId}`);
        const data = await res.json();
        setSelectedSeasons(Array.isArray(data.seasons) ? data.seasons : null);
      } catch {
        setSelectedSeasons(null);
      } finally {
        setLoadingSeasons(null);
      }
    } else {
      setSelectedSeasons(null);
    }
    setSelected(item);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Search</h1>
        <p className="text-sm text-gray-500 mt-1">
          Find movies and shows via TMDB, then pick a torrent.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies and TV shows..."
            autoFocus
            className="w-full pl-9 pr-9 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl overflow-hidden text-sm">
          {(['multi', 'movie', 'tv'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 font-medium transition-colors ${
                typeFilter === t ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'multi' ? 'All' : t === 'movie' ? 'Movies' : 'TV'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching TMDB...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-900/20 border border-red-800/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Empty — no query */}
      {!loading && !query && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Search anything</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Type a title above to search TMDB. Click a result to browse torrents.
          </p>
        </div>
      )}

      {/* No results */}
      {!loading && query && tmdbResults.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 border border-dashed border-gray-800 rounded-xl">
          <p className="font-medium text-gray-500">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Try a different title or check spelling</p>
        </div>
      )}

      {/* TMDB Results */}
      {!loading && tmdbResults.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-3 font-medium uppercase tracking-wider">
            {tmdbResults.length} results from TMDB — click to find torrents
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {tmdbResults.map((item) => (
              <div key={`${item.mediaType}-${item.tmdbId}`} className="relative">
                <TMDBCard
                  item={item}
                  onClick={() => handleSelect(item)}
                />
                {loadingSeasons === item.tmdbId && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/70 backdrop-blur-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Torrent select modal — opens when a TMDB result is clicked */}
      {selected && (
        <TorrentSelectModal
          requestId=""
          title={selected.title}
          mediaType={selected.mediaType}
          seasons={selectedSeasons}
          existingTorrents={[]}
          open={true}
          onClose={() => { setSelected(null); setSelectedSeasons(null); }}
          onSuccess={() => { setSelected(null); setSelectedSeasons(null); }}
        />
      )}
    </div>
  );
}
