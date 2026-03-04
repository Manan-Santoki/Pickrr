'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  Download,
  ExternalLink,
  Heart,
  Loader2,
  Search,
  Star,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes, truncate } from '@/lib/utils';
import type { ProwlarrResult } from '@/types/prowlarr';
import type { MediaType, TMDBDetails } from '@/services/tmdb';

interface MediaDetailViewProps {
  tmdbId: number;
  mediaType: MediaType;
}

interface TorrentResponse {
  results: ProwlarrResult[];
  total: number;
  error?: string;
}

interface LibraryStatusResponse {
  isFavorite: boolean;
  inWatchlist: boolean;
  hasEntry: boolean;
  error?: string;
}

function buildInitialQuery(details: TMDBDetails | null): string {
  if (!details) return '';
  return details.year ? `${details.title} ${details.year}` : details.title;
}

function truncateReview(content: string, maxLength = 420): string {
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}...`;
}

export function MediaDetailView({ tmdbId, mediaType }: MediaDetailViewProps) {
  const [details, setDetails] = useState<TMDBDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedTrailerKey, setSelectedTrailerKey] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryBusy, setLibraryBusy] = useState<'favorite' | 'watchlist' | null>(null);

  const [torrentQuery, setTorrentQuery] = useState('');
  const [torrentResults, setTorrentResults] = useState<ProwlarrResult[]>([]);
  const [torrentsLoading, setTorrentsLoading] = useState(false);
  const [torrentsError, setTorrentsError] = useState<string | null>(null);
  const [grabbingGuid, setGrabbingGuid] = useState<string | null>(null);

  const fetchTorrents = useCallback(
    async (query: string) => {
      const cleanedQuery = query.trim();
      if (!cleanedQuery) {
        setTorrentResults([]);
        setTorrentsError(null);
        return;
      }

      setTorrentsLoading(true);
      setTorrentsError(null);

      try {
        const params = new URLSearchParams({
          query: cleanedQuery,
          type: mediaType,
        });

        const res = await fetch(`/api/torrents/search?${params}`);
        const data = (await res.json()) as TorrentResponse;

        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to search torrents');
        }

        setTorrentResults(Array.isArray(data.results) ? data.results : []);
      } catch (error: unknown) {
        setTorrentResults([]);
        setTorrentsError(error instanceof Error ? error.message : 'Failed to search torrents');
      } finally {
        setTorrentsLoading(false);
      }
    },
    [mediaType]
  );

  const loadLibraryStatus = useCallback(async () => {
    setLibraryLoading(true);

    try {
      const params = new URLSearchParams({
        tmdbId: String(tmdbId),
        mediaType,
      });

      const res = await fetch(`/api/library/status?${params.toString()}`);
      const data = (await res.json()) as LibraryStatusResponse;

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to load favorites/watchlist status');
      }

      setIsFavorite(Boolean(data.isFavorite));
      setInWatchlist(Boolean(data.inWatchlist));
    } catch {
      setIsFavorite(false);
      setInWatchlist(false);
    } finally {
      setLibraryLoading(false);
    }
  }, [mediaType, tmdbId]);

  const updateLibraryStatus = useCallback(
    async (patch: { isFavorite?: boolean; inWatchlist?: boolean }) => {
      if (!details) return;

      const res = await fetch('/api/library/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: details.tmdbId,
          mediaType,
          title: details.title,
          year: details.year,
          posterPath: details.posterUrl,
          ...patch,
        }),
      });

      const data = (await res.json()) as LibraryStatusResponse;
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to update favorites/watchlist');
      }

      setIsFavorite(Boolean(data.isFavorite));
      setInWatchlist(Boolean(data.inWatchlist));
    },
    [details, mediaType]
  );

  useEffect(() => {
    void loadLibraryStatus();
  }, [loadLibraryStatus]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const res = await fetch(`/api/tmdb/${tmdbId}?type=${mediaType}`);
        const data = (await res.json()) as TMDBDetails & { error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to fetch media details');
        }

        if (!cancelled) {
          setDetails(data);
          setSelectedTrailerKey(data.primaryTrailer?.key ?? data.trailers[0]?.key ?? null);
          const initialQuery = buildInitialQuery(data);
          setTorrentQuery(initialQuery);
          await fetchTorrents(initialQuery);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setDetailsError(error instanceof Error ? error.message : 'Failed to fetch media details');
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [fetchTorrents, mediaType, tmdbId]);

  const subtitle = useMemo(() => {
    if (!details) return mediaType === 'movie' ? 'Movie' : 'TV Show';

    const bits: string[] = [];
    bits.push(mediaType === 'movie' ? 'Movie' : 'TV Show');
    if (details.year) bits.push(String(details.year));
    if (details.runtimeMinutes) bits.push(`${details.runtimeMinutes} min`);
    if (details.rating > 0) bits.push(`${details.rating.toFixed(1)}★`);
    return bits.join(' • ');
  }, [details, mediaType]);

  const selectedTrailer = useMemo(() => {
    if (!details || !selectedTrailerKey) return details?.primaryTrailer ?? null;
    return details.trailers.find((trailer) => trailer.key === selectedTrailerKey) ?? details.primaryTrailer;
  }, [details, selectedTrailerKey]);

  const handleFavoriteToggle = async () => {
    if (!details || libraryLoading) return;

    setLibraryBusy('favorite');
    try {
      const next = !isFavorite;
      await updateLibraryStatus({ isFavorite: next });
      toast.success(next ? 'Added to favorites' : 'Removed from favorites');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorites');
    } finally {
      setLibraryBusy(null);
    }
  };

  const handleWatchlistToggle = async () => {
    if (!details || libraryLoading) return;

    setLibraryBusy('watchlist');
    try {
      const next = !inWatchlist;
      await updateLibraryStatus({ inWatchlist: next });
      toast.success(next ? 'Added to watchlist' : 'Removed from watchlist');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update watchlist');
    } finally {
      setLibraryBusy(null);
    }
  };

  const handleGrab = async (result: ProwlarrResult) => {
    if (!details) return;

    setGrabbingGuid(result.guid);

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: details.tmdbId,
          mediaType,
          title: details.title,
          year: details.year,
          posterPath: details.posterUrl,
          torrentTitle: result.title,
          indexer: result.indexer,
          size: result.size,
          seeders: result.seeders,
          downloadUrl: result.downloadUrl,
          magnetUrl: result.magnetUrl,
        }),
      });

      const data = (await res.json()) as { error?: string; id?: string; autoFavorited?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to send torrent to qBittorrent');
      }

      setIsFavorite(true);
      setInWatchlist(true);
      toast.success(data.autoFavorited ? 'Torrent sent and auto-added to favorites' : 'Torrent sent to qBittorrent');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send torrent');
    } finally {
      setGrabbingGuid(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      {detailsLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/70 px-4 py-8 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading media details...
        </div>
      ) : null}

      {detailsError ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {detailsError}
        </div>
      ) : null}

      {details ? (
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-gray-900/70 p-5 md:grid-cols-[180px,1fr]">
          <div className="overflow-hidden rounded-xl bg-gray-800">
            {details.posterUrl ? (
              <Image
                src={details.posterUrl}
                alt={details.title}
                width={180}
                height={270}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-gray-600">
                No poster
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-white">{details.title}</h1>
                <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleFavoriteToggle}
                  disabled={libraryLoading || libraryBusy !== null}
                  className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isFavorite
                      ? 'border-red-400/40 bg-red-500/20 text-red-200 hover:bg-red-500/30'
                      : 'border-white/10 bg-gray-800 text-gray-300 hover:border-red-400/40 hover:text-red-200'
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                  {libraryBusy === 'favorite'
                    ? 'Saving...'
                    : isFavorite
                    ? 'Favorited'
                    : 'Add Favorite'}
                </button>

                <button
                  onClick={handleWatchlistToggle}
                  disabled={libraryLoading || libraryBusy !== null}
                  className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    inWatchlist
                      ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30'
                      : 'border-white/10 bg-gray-800 text-gray-300 hover:border-indigo-400/40 hover:text-indigo-200'
                  }`}
                >
                  {inWatchlist ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                  {libraryBusy === 'watchlist'
                    ? 'Saving...'
                    : inWatchlist
                    ? 'In Watchlist'
                    : 'Add Watchlist'}
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {details.overview || 'No overview available.'}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              {details.genres.map((genre) => (
                <span key={genre} className="rounded bg-gray-800 px-2 py-1 text-gray-400">
                  {genre}
                </span>
              ))}
              {details.rating > 0 ? (
                <span className="inline-flex items-center gap-1 rounded bg-yellow-900/20 px-2 py-1 text-yellow-300">
                  <Star className="h-3 w-3 fill-current" />
                  {details.rating.toFixed(1)} ({details.voteCount.toLocaleString()} votes)
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-gray-950/60 p-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rating</h2>
                <p className="mt-2 text-2xl font-semibold text-yellow-300">
                  {details.rating > 0 ? details.rating.toFixed(1) : 'N/A'}
                  <span className="ml-1 text-sm text-gray-400">/ 10</span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                    style={{ width: `${Math.max(0, Math.min(100, details.rating * 10))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">TMDB votes: {details.voteCount.toLocaleString()}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-gray-950/60 p-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Quick Info</h2>
                <div className="mt-2 space-y-1.5 text-sm text-gray-300">
                  <p>
                    <span className="text-gray-500">Language:</span> {details.language?.toUpperCase() ?? 'N/A'}
                  </p>
                  <p>
                    <span className="text-gray-500">Type:</span> {mediaType === 'movie' ? 'Movie' : 'TV Show'}
                  </p>
                  <p>
                    <span className="text-gray-500">Runtime:</span> {details.runtimeMinutes ? `${details.runtimeMinutes} min` : 'N/A'}
                  </p>
                  {mediaType === 'tv' ? (
                    <p>
                      <span className="text-gray-500">Seasons:</span> {details.seasons.length || 'N/A'}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {details ? (
        <section className="rounded-2xl border border-white/10 bg-gray-900/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Trailer</h2>
            {selectedTrailer ? (
              <a
                href={selectedTrailer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
              >
                Open on YouTube
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>

          {selectedTrailer ? (
            <div className="space-y-3">
              <div className="aspect-video overflow-hidden rounded-xl border border-gray-800">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedTrailer.key}?rel=0&modestbranding=1`}
                  title={`${details.title} trailer`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {details.trailers.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {details.trailers.slice(0, 6).map((trailer) => (
                    <button
                      key={trailer.key}
                      onClick={() => setSelectedTrailerKey(trailer.key)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                        trailer.key === selectedTrailer.key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {truncate(trailer.name, 28)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-800 text-sm text-gray-500">
              No trailer available from TMDB/YouTube.
            </div>
          )}
        </section>
      ) : null}

      {details ? (
        <section className="rounded-2xl border border-white/10 bg-gray-900/70 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Cast</h2>
            <span className="text-xs text-gray-500">{details.cast.length} shown</span>
          </div>

          {details.cast.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-800 px-4 py-6 text-center text-sm text-gray-500">
              Cast details are not available on TMDB for this title.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {details.cast.map((member) => (
                <article
                  key={`${member.id}-${member.name}`}
                  className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950/50"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-800">
                    {member.profileUrl ? (
                      <Image
                        src={member.profileUrl}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 12vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-600">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-semibold text-gray-200">{member.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">
                      {member.character ? member.character : 'Cast'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-gray-900/70 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={torrentQuery}
              onChange={(event) => setTorrentQuery(event.target.value)}
              placeholder="Search torrents"
              className="w-full rounded-xl border border-gray-800 bg-gray-950/80 py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
            />
          </div>
          <button
            onClick={() => fetchTorrents(torrentQuery)}
            disabled={torrentsLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-800"
          >
            {torrentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search Prowlarr
          </button>
        </div>

        {torrentsError ? (
          <div className="mb-4 rounded-lg border border-red-900/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {torrentsError}
          </div>
        ) : null}

        {torrentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded bg-gray-800/70" />
            ))}
          </div>
        ) : null}

        {!torrentsLoading && torrentResults.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
            No torrents found.
          </p>
        ) : null}

        {torrentResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Indexer</th>
                  <th className="px-2 py-2 text-right">Size</th>
                  <th className="px-2 py-2 text-right">Seeders</th>
                  <th className="px-2 py-2 text-right">Leechers</th>
                  <th className="px-2 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {torrentResults.map((result) => (
                  <tr key={result.guid} className="hover:bg-gray-800/40">
                    <td className="px-2 py-2 text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{truncate(result.title, 95)}</span>
                        {result.infoUrl ? (
                          <a
                            href={result.infoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 transition-colors hover:text-gray-300"
                            aria-label="Open torrent info"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-gray-400">{result.indexer}</td>
                    <td className="px-2 py-2 text-right font-mono text-gray-400">{formatBytes(result.size)}</td>
                    <td className="px-2 py-2 text-right font-mono text-green-400">{result.seeders}</td>
                    <td className="px-2 py-2 text-right font-mono text-gray-400">{result.leechers}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => handleGrab(result)}
                        disabled={grabbingGuid !== null}
                        className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-800"
                      >
                        <Download className="h-3 w-3" />
                        {grabbingGuid === result.guid ? 'Sending...' : 'Grab'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {details ? (
        <section className="rounded-2xl border border-white/10 bg-gray-900/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">Reviews</h2>
            <span className="text-xs text-gray-500">{details.reviews.length} shown</span>
          </div>

          {details.reviews.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-800 px-4 py-6 text-center text-sm text-gray-500">
              No reviews available on TMDB for this title.
            </p>
          ) : (
            <div className="space-y-3">
              {details.reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-300">{review.author}</span>
                    <span>•</span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    {review.rating !== null ? (
                      <>
                        <span>•</span>
                        <span className="text-yellow-300">{review.rating.toFixed(1)} / 10</span>
                      </>
                    ) : null}
                    {review.url ? (
                      <>
                        <span>•</span>
                        <a
                          href={review.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200"
                        >
                          Full review
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-300">{truncateReview(review.content)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
