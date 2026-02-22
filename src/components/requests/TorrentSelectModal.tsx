'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Download, ChevronDown, ExternalLink, RefreshCw, Tv } from 'lucide-react';
import { formatBytes, truncate } from '@/lib/utils';
import type { ProwlarrResult } from '@/types/prowlarr';
import type { AppTorrent } from '@/types';

const PAGE_SIZE = 10;

interface TorrentSelectModalProps {
  requestId: string;
  title: string;
  mediaType: 'movie' | 'tv';
  seasons: number[] | null;        // requested season numbers (TV only)
  existingTorrents: AppTorrent[];  // already-selected torrents
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SortKey = 'seeders' | 'size' | 'title';

function SeederBadge({ count }: { count: number }) {
  const color =
    count >= 50 ? 'text-green-400' : count >= 10 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-mono text-sm font-medium ${color}`}>{count.toLocaleString()}</span>;
}

// Build the search query for a given season selection
function buildSearchQuery(title: string, seasonNumber: number): string {
  if (seasonNumber === 0) return title; // full pack or movie
  const padded = String(seasonNumber).padStart(2, '0');
  return `${title} Season ${seasonNumber} S${padded}`;
}

export function TorrentSelectModal({
  requestId,
  title,
  mediaType,
  seasons,
  existingTorrents,
  open,
  onClose,
  onSuccess,
}: TorrentSelectModalProps) {
  // For TV: tabs are [0, ...seasons] where 0 = "Full Pack"
  // For movies: always season 0
  const seasonTabs: number[] =
    mediaType === 'tv' && seasons && seasons.length > 0
      ? [0, ...seasons]
      : [0];

  const [activeSeason, setActiveSeason] = useState<number>(
    // Default to first unselected season
    seasonTabs.find((s) => !existingTorrents.some((t) => t.seasonNumber === s)) ?? seasonTabs[0]
  );

  const [allResults, setAllResults] = useState<ProwlarrResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [grabbing, setGrabbing] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('seeders');
  const [indexerFilter, setIndexerFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [confirmResult, setConfirmResult] = useState<ProwlarrResult | null>(null);

  // Re-search whenever active season changes
  useEffect(() => {
    if (!open) return;
    setAllResults([]);
    setVisibleCount(PAGE_SIZE);
    setConfirmResult(null);
    setLoading(true);

    const query = buildSearchQuery(title, activeSeason);
    const params = new URLSearchParams({ query, type: mediaType });
    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data) => setAllResults(data.results ?? []))
      .catch(() => toast.error('Failed to search Prowlarr'))
      .finally(() => setLoading(false));
  }, [open, title, mediaType, activeSeason]);

  // Reset to first unselected season on open
  useEffect(() => {
    if (open) {
      setActiveSeason(
        seasonTabs.find((s) => !existingTorrents.some((t) => t.seasonNumber === s)) ?? seasonTabs[0]
      );
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const indexers = ['all', ...Array.from(new Set(allResults.map((r) => r.indexer))).sort()];

  const filtered = allResults
    .filter((r) => indexerFilter === 'all' || r.indexer === indexerFilter)
    .sort((a, b) => {
      if (sortKey === 'seeders') return b.seeders - a.seeders;
      if (sortKey === 'size') return b.size - a.size;
      return a.title.localeCompare(b.title);
    });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleGrab = async (result: ProwlarrResult) => {
    setGrabbing(result.guid);
    setConfirmResult(null);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          seasonNumber: activeSeason,
          title: result.title,
          indexer: result.indexer,
          size: result.size,
          seeders: result.seeders,
          leechers: result.leechers,
          downloadUrl: result.downloadUrl,
          magnetUrl: result.magnetUrl,
          infoUrl: result.infoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Download failed');

      toast.success('Torrent sent to qBittorrent!', {
        description: truncate(result.title, 60),
      });
      onSuccess();

      // Move to next unselected season, or close if all done
      const nextSeason = seasonTabs.find(
        (s) => s !== activeSeason && !existingTorrents.some((t) => t.seasonNumber === s)
      );
      if (nextSeason !== undefined) {
        setActiveSeason(nextSeason);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setGrabbing(null);
    }
  };

  if (!open) return null;

  // Confirmation overlay
  if (confirmResult) {
    const seasonLabel =
      activeSeason === 0
        ? mediaType === 'tv' ? 'Full Pack' : 'Movie'
        : `Season ${activeSeason}`;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmResult(null)} />
        <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-1">Confirm Selection</h3>
          <p className="text-sm text-gray-400 mb-4">
            {mediaType === 'tv' ? `${title} — ${seasonLabel}` : title}
          </p>
          <div className="bg-gray-800 rounded-lg p-3 mb-5 space-y-1">
            <p className="text-sm text-white font-medium">{truncate(confirmResult.title, 70)}</p>
            <div className="flex gap-3 text-xs text-gray-400">
              <span className="bg-gray-700 px-1.5 py-0.5 rounded font-mono">{confirmResult.indexer}</span>
              <span>{formatBytes(confirmResult.size)}</span>
              <span className={confirmResult.seeders >= 50 ? 'text-green-400' : confirmResult.seeders >= 10 ? 'text-yellow-400' : 'text-red-400'}>
                {confirmResult.seeders} seeds
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleGrab(confirmResult)}
              disabled={!!grabbing}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {grabbing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Download className="w-4 h-4" /> Confirm & Download</>
              )}
            </button>
            <button
              onClick={() => setConfirmResult(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const existingForSeason = existingTorrents.find((t) => t.seasonNumber === activeSeason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{truncate(title, 55)}</h2>
            <p className="text-sm text-gray-400">
              {loading
                ? 'Searching Prowlarr across all indexers...'
                : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Season tabs (TV only, when multiple seasons) */}
        {mediaType === 'tv' && seasonTabs.length > 1 && (
          <div className="flex items-center gap-1 px-6 pt-3 pb-0 overflow-x-auto">
            {seasonTabs.map((s) => {
              const done = existingTorrents.some((t) => t.seasonNumber === s);
              const isActive = s === activeSeason;
              return (
                <button
                  key={s}
                  onClick={() => {
                    setActiveSeason(s);
                    setIndexerFilter('all');
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : done
                      ? 'bg-green-900/40 text-green-400 border border-green-800/50 hover:bg-green-900/60'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {done && !isActive && <span className="text-xs">✓</span>}
                  {s === 0 ? (
                    <><Tv className="w-3 h-3" /> Full Pack</>
                  ) : (
                    `S${String(s).padStart(2, '0')}`
                  )}
                </button>
              );
            })}
            <span className="ml-2 text-xs text-gray-600">
              {existingTorrents.length}/{seasonTabs.length} selected
            </span>
          </div>
        )}

        {/* Re-grab notice */}
        {existingForSeason && (
          <div className="mx-6 mt-3 px-3 py-2 bg-indigo-950/40 border border-indigo-800/40 rounded-lg text-xs text-indigo-300">
            Currently: <span className="font-medium">{truncate(existingForSeason.title, 55)}</span>
            {' '}via {existingForSeason.indexer} — selecting a new one will replace it.
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 px-6 py-3 border-b border-gray-800 bg-gray-900/50 mt-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Sort by</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="seeders">Seeders (High to Low)</option>
              <option value="size">Size (Largest First)</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Indexer</label>
            <select
              value={indexerFilter}
              onChange={(e) => {
                setIndexerFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {indexers.map((idx) => (
                <option key={idx} value={idx}>
                  {idx === 'all' ? 'All Indexers' : idx}
                </option>
              ))}
            </select>
          </div>
          {!loading && allResults.length > 0 && (
            <span className="text-xs text-gray-600 ml-auto self-center">
              Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col gap-2 p-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <p className="text-base">No results found</p>
              <p className="text-sm mt-1 text-gray-600">Try adjusting filters or check Prowlarr indexers</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-700">
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-2.5 w-32">Indexer</th>
                    <th className="px-2 py-2.5">Title</th>
                    <th className="px-2 py-2.5 w-24 text-right">Size</th>
                    <th className="px-2 py-2.5 w-20 text-right">Seeds</th>
                    <th className="px-2 py-2.5 w-16 text-right">Leech</th>
                    <th className="px-3 py-2.5 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {visible.map((result, idx) => (
                    <tr
                      key={result.guid}
                      className={`hover:bg-gray-800/40 transition-colors ${idx === 0 ? 'bg-indigo-950/20' : ''}`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-sm font-mono">
                          {result.indexer}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {idx === 0 && (
                            <span className="text-xs bg-indigo-900/60 text-indigo-400 px-1 py-0.5 rounded flex-shrink-0">
                              Best
                            </span>
                          )}
                          <span className="text-gray-200 text-sm leading-snug">
                            {truncate(result.title, 65)}
                          </span>
                          {result.infoUrl && (
                            <a
                              href={result.infoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-600 hover:text-gray-400 flex-shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span className="font-mono text-xs text-gray-400">{formatBytes(result.size)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <SeederBadge count={result.seeders} />
                      </td>
                      <td className="px-2 py-2.5 text-right text-gray-500 font-mono text-xs">
                        {result.leechers}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => setConfirmResult(result)}
                          disabled={!!grabbing}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors ml-auto"
                        >
                          <Download className="w-3 h-3" />
                          Grab
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {hasMore && (
                <div className="flex justify-center py-4 border-t border-gray-800">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load more ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
