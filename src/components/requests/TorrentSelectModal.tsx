'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Download, ArrowUpDown } from 'lucide-react';
import { formatBytes, truncate } from '@/lib/utils';
import type { ProwlarrResult } from '@/types/prowlarr';

interface TorrentSelectModalProps {
  requestId: string;
  title: string;
  mediaType: 'movie' | 'tv';
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SortKey = 'seeders' | 'size' | 'title';

function SeederBadge({ count }: { count: number }) {
  const color =
    count >= 50
      ? 'text-green-400'
      : count >= 10
      ? 'text-yellow-400'
      : 'text-red-400';
  return <span className={`font-mono text-sm ${color}`}>{count}</span>;
}

export function TorrentSelectModal({
  requestId,
  title,
  mediaType,
  open,
  onClose,
  onSuccess,
}: TorrentSelectModalProps) {
  const [results, setResults] = useState<ProwlarrResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [grabbing, setGrabbing] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('seeders');
  const [indexerFilter, setIndexerFilter] = useState('all');

  useEffect(() => {
    if (!open) return;
    setResults([]);
    setLoading(true);

    const params = new URLSearchParams({ query: title, type: mediaType });
    fetch(`/api/search?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? []);
      })
      .catch(() => toast.error('Failed to search Prowlarr'))
      .finally(() => setLoading(false));
  }, [open, title, mediaType]);

  const indexers = ['all', ...Array.from(new Set(results.map((r) => r.indexer)))];

  const filtered = results
    .filter((r) => indexerFilter === 'all' || r.indexer === indexerFilter)
    .sort((a, b) => {
      if (sortKey === 'seeders') return b.seeders - a.seeders;
      if (sortKey === 'size') return b.size - a.size;
      return a.title.localeCompare(b.title);
    });

  const handleGrab = async (result: ProwlarrResult) => {
    setGrabbing(result.guid);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
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

      toast.success('Torrent sent to qBittorrent!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGrabbing(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{truncate(title, 50)}</h2>
            <p className="text-sm text-gray-400">Select a torrent to download</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-3 px-6 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Sort by</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              <option value="seeders">Seeders</option>
              <option value="size">Size</option>
              <option value="title">Title</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Indexer</label>
            <select
              value={indexerFilter}
              onChange={(e) => setIndexerFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1"
            >
              {indexers.map((idx) => (
                <option key={idx} value={idx}>
                  {idx === 'all' ? 'All Indexers' : idx}
                </option>
              ))}
            </select>
          </div>
          {!loading && (
            <span className="text-xs text-gray-500 ml-auto self-center">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col gap-2 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No results found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="px-6 py-2 w-28">Indexer</th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2 w-24 text-right">Size</th>
                  <th className="px-2 py-2 w-16 text-right">Seeds</th>
                  <th className="px-2 py-2 w-16 text-right">Leech</th>
                  <th className="px-2 py-2 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((result) => (
                  <tr key={result.guid} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-2.5">
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">
                        {result.indexer}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-gray-200">
                      {truncate(result.title, 60)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-gray-400 font-mono text-xs">
                      {formatBytes(result.size)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <SeederBadge count={result.seeders} />
                    </td>
                    <td className="px-2 py-2.5 text-right text-gray-400 font-mono text-sm">
                      {result.leechers}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => handleGrab(result)}
                        disabled={!!grabbing}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {grabbing === result.guid ? '...' : 'Grab'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
