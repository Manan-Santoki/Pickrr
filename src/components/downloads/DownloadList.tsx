'use client';

import { Download } from 'lucide-react';
import { useDownloads } from '@/hooks/useDownloads';
import { DownloadCard } from './DownloadCard';

export function DownloadList() {
  const { downloads, isLoading, mutate } = useDownloads();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-gray-800 bg-gray-900"
          />
        ))}
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Download className="mb-4 h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">No downloads yet</p>
        <p className="mt-1 text-sm">Grab a torrent from a movie or TV detail page.</p>
      </div>
    );
  }

  const active = downloads.filter((item) => ['downloading', 'paused'].includes(item.status));
  const completed = downloads.filter((item) => !['downloading', 'paused'].includes(item.status));

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Active</h2>
          <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-300">
            {active.length}
          </span>
        </div>
        {active.length > 0 ? (
          <div className="flex flex-col gap-3">
            {active.map((download) => (
              <DownloadCard key={download.id} download={download} onAction={() => mutate()} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-800 px-4 py-6 text-sm text-gray-600">
            No active torrents.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Completed</h2>
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
            {completed.length}
          </span>
        </div>
        {completed.length > 0 ? (
          <div className="flex flex-col gap-3">
            {completed.map((download) => (
              <DownloadCard key={download.id} download={download} onAction={() => mutate()} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-800 px-4 py-6 text-sm text-gray-600">
            Nothing completed yet.
          </p>
        )}
      </section>
    </div>
  );
}
