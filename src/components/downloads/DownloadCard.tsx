'use client';

import { formatBytes, formatSpeed, formatETA, truncate } from '@/lib/utils';
import type { ActiveDownload } from '@/hooks/useDownloads';

const stateColors: Record<string, string> = {
  downloading: 'bg-blue-900 text-blue-300',
  uploading: 'bg-green-900 text-green-300',
  stalledDL: 'bg-yellow-900 text-yellow-300',
  stalledUP: 'bg-yellow-900 text-yellow-300',
  pausedDL: 'bg-gray-700 text-gray-300',
  pausedUP: 'bg-gray-700 text-gray-300',
  queuedDL: 'bg-indigo-900 text-indigo-300',
  checkingDL: 'bg-purple-900 text-purple-300',
};

interface DownloadCardProps {
  download: ActiveDownload;
}

export function DownloadCard({ download }: DownloadCardProps) {
  const progressPercent = Math.round(download.progress * 100);

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-white truncate flex-1">
          {truncate(download.name, 70)}
        </p>
        <span
          className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
            stateColors[download.state] ?? 'bg-gray-700 text-gray-300'
          }`}
        >
          {download.state}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-mono">{progressPercent}%</span>
        <div className="flex items-center gap-3">
          <span>↓ {formatSpeed(download.dlspeed)}</span>
          <span>ETA {formatETA(download.eta)}</span>
          <span>{download.num_seeds} seeds</span>
          <span className="text-gray-500">{formatBytes(download.size)}</span>
        </div>
      </div>
    </div>
  );
}
