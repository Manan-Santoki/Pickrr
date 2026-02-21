'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { formatBytes, truncate } from '@/lib/utils';
import type { ProwlarrResult } from '@/types/prowlarr';

interface SearchResultsProps {
  results: ProwlarrResult[];
  isLoading: boolean;
  mediaType: 'movie' | 'tv';
}

function SeederBadge({ count }: { count: number }) {
  const color =
    count >= 50 ? 'text-green-400' : count >= 10 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-mono text-sm ${color}`}>{count}</span>;
}

export function SearchResults({ results, isLoading, mediaType }: SearchResultsProps) {
  const [grabbing, setGrabbing] = useState<string | null>(null);

  const handleGrab = async (result: ProwlarrResult) => {
    setGrabbing(result.guid);
    try {
      const savePath =
        mediaType === 'movie'
          ? process.env.NEXT_PUBLIC_MOVIES_PATH ?? '/downloads/movies'
          : process.env.NEXT_PUBLIC_TV_PATH ?? '/downloads/tv';

      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: '',
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGrabbing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-900 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 border-b border-gray-700">
          <tr className="text-left text-gray-400 text-xs">
            <th className="px-4 py-2 w-28">Indexer</th>
            <th className="px-2 py-2">Title</th>
            <th className="px-2 py-2 w-24 text-right">Size</th>
            <th className="px-2 py-2 w-16 text-right">Seeds</th>
            <th className="px-2 py-2 w-16 text-right">Leech</th>
            <th className="px-2 py-2 w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {results.map((result) => (
            <tr key={result.guid} className="hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-2.5">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">
                  {result.indexer}
                </span>
              </td>
              <td className="px-2 py-2.5 text-gray-200">{truncate(result.title, 70)}</td>
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
    </div>
  );
}
