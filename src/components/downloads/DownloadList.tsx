'use client';

import { useDownloads } from '@/hooks/useDownloads';
import { DownloadCard } from './DownloadCard';
import { Download } from 'lucide-react';

export function DownloadList() {
  const { downloads, isLoading, mutate } = useDownloads();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Download className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">No active downloads</p>
        <p className="text-sm mt-1">Torrents sent to qBittorrent will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {downloads.map((download) => (
        <DownloadCard key={download.hash} download={download} onAction={() => mutate()} />
      ))}
    </div>
  );
}
