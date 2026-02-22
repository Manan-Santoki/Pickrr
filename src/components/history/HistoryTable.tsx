'use client';

import useSWR from 'swr';
import { formatBytes, timeAgo, truncate } from '@/lib/utils';
import type { AppRequest } from '@/types';
import { History } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusColors: Record<string, string> = {
  done: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
};

export function HistoryTable() {
  const { data: requests, isLoading } = useSWR<AppRequest[]>('/api/history', fetcher);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-900 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <History className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">No download history</p>
        <p className="text-sm mt-1">Completed downloads will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 border-b border-gray-700">
          <tr className="text-left text-gray-400 text-xs">
            <th className="px-4 py-3">Title</th>
            <th className="px-2 py-3 w-16">Type</th>
            <th className="px-2 py-3 w-32">Requested By</th>
            <th className="px-2 py-3">Torrent</th>
            <th className="px-2 py-3 w-24 text-right">Size</th>
            <th className="px-2 py-3 w-28">Selected By</th>
            <th className="px-2 py-3 w-24">Status</th>
            <th className="px-2 py-3 w-28 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-800/30 transition-colors">
              <td className="px-4 py-3 text-white font-medium">
                {req.title}
                {req.year && <span className="text-gray-400 font-normal ml-1">({req.year})</span>}
              </td>
              <td className="px-2 py-3">
                <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded uppercase">
                  {req.mediaType}
                </span>
              </td>
              <td className="px-2 py-3 text-gray-400">{req.requestedBy}</td>
              <td className="px-2 py-3 text-gray-300">
                {req.torrents.length > 0 ? (
                  <span className="text-xs space-y-0.5 flex flex-col">
                    {req.torrents.map((t) => (
                      <span key={t.id}>
                        <span className="bg-gray-700 text-gray-300 px-1 py-0.5 rounded mr-1 font-mono">
                          {t.indexer}
                        </span>
                        {t.seasonNumber > 0 && (
                          <span className="text-indigo-400 mr-1">S{String(t.seasonNumber).padStart(2, '0')}</span>
                        )}
                        {truncate(t.title, 35)}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="px-2 py-3 text-right text-gray-400 font-mono text-xs">
                {req.torrents.length > 0
                  ? formatBytes(req.torrents.reduce((s, t) => s + Number(t.size), 0).toString())
                  : '—'}
              </td>
              <td className="px-2 py-3 text-gray-400">
                {req.torrents[0]?.selectedBy ?? '—'}
              </td>
              <td className="px-2 py-3">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    statusColors[req.status] ?? 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {req.status}
                </span>
              </td>
              <td className="px-2 py-3 text-right text-gray-500 text-xs">
                {timeAgo(req.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
