'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatBytes, formatSpeed, formatETA, truncate } from '@/lib/utils';
import type { ActiveDownload } from '@/hooks/useDownloads';
import { Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const stateConfig: Record<string, { label: string; className: string; barClass: string }> = {
  downloading: { label: 'Downloading', className: 'bg-blue-900/60 text-blue-300', barClass: 'bg-blue-500' },
  uploading: { label: 'Seeding', className: 'bg-green-900/60 text-green-300', barClass: 'bg-green-500' },
  stalledDL: { label: 'Stalled', className: 'bg-yellow-900/60 text-yellow-300', barClass: 'bg-yellow-500' },
  stalledUP: { label: 'Seeding (Stalled)', className: 'bg-yellow-900/60 text-yellow-300', barClass: 'bg-green-500' },
  pausedDL: { label: 'Paused', className: 'bg-gray-700 text-gray-300', barClass: 'bg-gray-500' },
  pausedUP: { label: 'Paused', className: 'bg-gray-700 text-gray-300', barClass: 'bg-gray-500' },
  queuedDL: { label: 'Queued', className: 'bg-indigo-900/60 text-indigo-300', barClass: 'bg-indigo-500' },
  checkingDL: { label: 'Checking', className: 'bg-purple-900/60 text-purple-300', barClass: 'bg-purple-500' },
  metaDL: { label: 'Fetching Metadata', className: 'bg-orange-900/60 text-orange-300', barClass: 'bg-orange-500' },
};

interface DownloadCardProps {
  download: ActiveDownload;
  onAction?: () => void;
}

export function DownloadCard({ download, onAction }: DownloadCardProps) {
  const [acting, setActing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progressPercent = Math.min(Math.round(download.progress * 100), 100);
  const state = stateConfig[download.state] ?? {
    label: download.state,
    className: 'bg-gray-700 text-gray-300',
    barClass: 'bg-gray-500',
  };
  const isComplete = progressPercent >= 100;
  const isPaused = download.state === 'pausedDL' || download.state === 'pausedUP';

  const sendAction = async (action: 'pause' | 'resume' | 'delete', deleteFiles = false) => {
    setActing(true);
    setConfirmDelete(false);
    try {
      const res = await fetch('/api/downloads/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: download.hash, action, deleteFiles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      const label = action === 'pause' ? 'Torrent paused' : action === 'resume' ? 'Torrent resumed' : 'Torrent removed';
      toast.success(label);
      onAction?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <div className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
        {download.posterPath && (
          <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-800 ring-1 ring-gray-700">
            <Image
              src={download.posterPath}
              alt={download.requestTitle ?? download.name}
              width={40}
              height={56}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              {download.requestTitle && download.requestTitle !== download.name && (
                <p className="text-xs text-gray-500 mb-0.5">
                  {download.requestTitle}
                  {download.seasonNumber > 0 && (
                    <span className="ml-1 font-mono">
                      S{String(download.seasonNumber).padStart(2, '0')}
                    </span>
                  )}
                </p>
              )}
              <p className="text-sm font-medium text-white truncate">
                {truncate(download.name, 75)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {download.mediaType && (
                <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                  {download.mediaType === 'movie' ? 'Movie' : 'TV'}
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded ${state.className}`}>
                {state.label}
              </span>
              {/* Pause / Resume */}
              <button
                onClick={() => sendAction(isPaused ? 'resume' : 'pause')}
                disabled={acting || isComplete}
                title={isPaused ? 'Resume' : 'Pause'}
                className="p-1 text-gray-500 hover:text-yellow-400 disabled:opacity-30 transition-colors"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              {/* Delete */}
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={acting}
                title="Remove from qBittorrent"
                className="p-1 text-gray-500 hover:text-red-400 disabled:opacity-30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${state.barClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono font-medium">
              {isComplete ? (
                <span className="text-green-400">Complete</span>
              ) : (
                `${progressPercent}%`
              )}
            </span>
            <div className="flex items-center gap-3 font-mono">
              {!isComplete && download.dlspeed > 0 && (
                <span className="text-blue-400">↓ {formatSpeed(download.dlspeed)}</span>
              )}
              {download.upspeed > 0 && (
                <span className="text-green-400/60">↑ {formatSpeed(download.upspeed)}</span>
              )}
              {!isComplete && <span>ETA {formatETA(download.eta)}</span>}
              <span className="text-gray-600">{download.num_seeds} seeds</span>
              <span className="text-gray-600">{formatBytes(download.size)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm mx-4 p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Remove Download</h3>
            <p className="text-sm text-gray-400 mb-4 truncate">{download.name}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => sendAction('delete', false)}
                className="py-2 bg-red-900/60 hover:bg-red-800 text-red-300 font-medium rounded-md text-sm transition-colors"
              >
                Remove torrent (keep files)
              </button>
              <button
                onClick={() => sendAction('delete', true)}
                className="py-2 bg-red-700 hover:bg-red-600 text-white font-medium rounded-md text-sm transition-colors"
              >
                Remove torrent + delete files
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
