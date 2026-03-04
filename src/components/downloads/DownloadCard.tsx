'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AppDownload } from '@/types';
import { formatBytes, formatETA, formatSpeed, truncate } from '@/lib/utils';

const stateLabel: Record<string, string> = {
  downloading: 'Downloading',
  uploading: 'Seeding',
  stalledDL: 'Stalled',
  stalledUP: 'Seeding (Stalled)',
  pausedDL: 'Paused',
  pausedUP: 'Paused',
  queuedDL: 'Queued',
  checkingDL: 'Checking',
  metaDL: 'Fetching Metadata',
};

interface DownloadCardProps {
  download: AppDownload;
  onAction: () => void;
}

function statusBadge(status: AppDownload['status']): string {
  if (status === 'done') return 'bg-green-900/60 text-green-300';
  if (status === 'failed') return 'bg-red-900/60 text-red-300';
  if (status === 'paused') return 'bg-yellow-900/60 text-yellow-300';
  return 'bg-blue-900/60 text-blue-300';
}

export function DownloadCard({ download, onAction }: DownloadCardProps) {
  const [acting, setActing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progressPercent = Math.round(Math.min(download.progress, 1) * 100);
  const torrentState = download.state ? stateLabel[download.state] ?? download.state : null;
  const isPaused = download.status === 'paused';
  const canControl = !!download.hash;

  const sendAction = async (
    action: 'pause' | 'resume' | 'delete',
    deleteFiles = false
  ) => {
    if (!download.hash) return;

    setActing(true);
    setConfirmDelete(false);

    try {
      const res = await fetch('/api/downloads/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: download.hash, action, deleteFiles }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Action failed');
      }

      toast.success(
        action === 'pause'
          ? 'Torrent paused'
          : action === 'resume'
          ? 'Torrent resumed'
          : 'Torrent removed'
      );

      onAction();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <>
      <article className="flex gap-4 rounded-xl border border-gray-800 bg-gray-900/70 p-4">
        {download.posterPath ? (
          <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-800 ring-1 ring-gray-700">
            <Image
              src={download.posterPath}
              alt={download.title}
              width={40}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">
                {download.title}
                {download.year ? <span className="ml-1">({download.year})</span> : null}
              </p>
              <p className="truncate text-sm font-medium text-white">
                {truncate(download.torrentTitle, 100)}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">{download.indexer}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-xs ${statusBadge(download.status)}`}>
                {download.status}
              </span>

              <button
                onClick={() => sendAction(isPaused ? 'resume' : 'pause')}
                disabled={!canControl || acting || download.status === 'done' || download.status === 'failed'}
                title={isPaused ? 'Resume' : 'Pause'}
                className="p-1 text-gray-500 transition-colors hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => setConfirmDelete(true)}
                disabled={!canControl || acting}
                title="Remove from qBittorrent"
                className="p-1 text-gray-500 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-2 h-1.5 w-full rounded-full bg-gray-800">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-gray-400">
            <span>{progressPercent}%</span>
            {download.status === 'downloading' ? <span>ETA {formatETA(download.eta)}</span> : null}
            {download.dlspeed > 0 ? <span className="text-blue-400">↓ {formatSpeed(download.dlspeed)}</span> : null}
            {download.upspeed > 0 ? <span className="text-green-400/70">↑ {formatSpeed(download.upspeed)}</span> : null}
            <span>{formatBytes(download.size)}</span>
            {torrentState ? <span className="text-gray-500">{torrentState}</span> : null}
          </div>
        </div>
      </article>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <h3 className="mb-2 text-base font-semibold text-white">Remove Download</h3>
            <p className="mb-4 truncate text-sm text-gray-400">{download.torrentTitle}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => sendAction('delete', false)}
                className="rounded-md bg-red-900/60 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-800"
              >
                Remove torrent (keep files)
              </button>
              <button
                onClick={() => sendAction('delete', true)}
                className="rounded-md bg-red-700 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Remove torrent + delete files
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md bg-gray-800 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
