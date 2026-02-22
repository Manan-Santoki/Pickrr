'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TorrentSelectModal } from './TorrentSelectModal';
import { timeAgo } from '@/lib/utils';
import type { AppRequest } from '@/types';
import { Download, CheckCircle, RefreshCw, Trash2, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; className: string; pulse?: boolean }> = {
  pending:            { label: 'Pending',            className: 'bg-gray-700/60 text-gray-400' },
  searching:          { label: 'Searching',           className: 'bg-blue-900/40 text-blue-400', pulse: true },
  awaiting_selection: { label: 'Needs Selection',     className: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/30', pulse: true },
  selected:           { label: 'Selected',            className: 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/30' },
  processing:         { label: 'Processing',          className: 'bg-purple-900/40 text-purple-300 border border-purple-700/30', pulse: true },
  downloading:        { label: 'Downloading',         className: 'bg-blue-900/40 text-blue-300 border border-blue-700/30', pulse: true },
  available:          { label: 'Available',           className: 'bg-green-900/40 text-green-300 border border-green-700/30' },
  done:               { label: 'Done',                className: 'bg-green-900/40 text-green-300' },
  declined:           { label: 'Declined',            className: 'bg-red-900/40 text-red-400' },
  failed:             { label: 'Failed',              className: 'bg-red-900/40 text-red-400' },
};

interface RequestCardProps {
  request: AppRequest;
  userRole: string;
  onRefresh: () => void;
}

function RejectConfirmDialog({
  title,
  hasDownload,
  onConfirm,
  onCancel,
}: {
  title: string;
  hasDownload: boolean;
  onConfirm: (stopDownload: boolean) => void;
  onCancel: () => void;
}) {
  const [stopDownload, setStopDownload] = useState(hasDownload);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0f1117] border border-red-900/40 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Reject & Delete</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Remove <span className="text-white font-medium">&ldquo;{title}&rdquo;</span> from Pickrr, Overseerr, and *arr.
          This cannot be undone.
        </p>
        {hasDownload && (
          <label className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gray-900/60 border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={stopDownload}
              onChange={(e) => setStopDownload(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 flex-shrink-0"
            />
            <span className="text-sm text-gray-300">Stop & remove from qBittorrent</span>
          </label>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(stopDownload)}
            className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white font-medium rounded-xl transition-colors text-sm"
          >
            Reject & Delete
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function RequestCard({ request, userRole, onRefresh }: RequestCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const canSelect = userRole === 'admin' || userRole === 'selector';
  const canReject = userRole === 'admin';

  const status = statusConfig[request.status] ?? { label: request.status, className: 'bg-gray-700 text-gray-400' };
  const isActionable = ['awaiting_selection', 'selected', 'pending'].includes(request.status);
  const isDownloading = request.status === 'downloading';
  const isProcessing = request.status === 'processing';
  const isAvailable = request.status === 'available' || request.status === 'done';
  const hasActiveDownload = request.torrents.length > 0 && isDownloading;

  const isTV = request.mediaType === 'tv';
  const seasons = request.seasons ?? [];
  const allSeasonTabs = isTV && seasons.length > 0 ? [0, ...seasons] : [];
  const selectedSeasons = new Set(request.torrents.map((t) => t.seasonNumber));

  const handleReject = async (stopDownload: boolean) => {
    setRejecting(true);
    setRejectOpen(false);
    try {
      const res = await fetch(`/api/requests/${request.id}?stopDownload=${stopDownload}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      toast.success(`Rejected "${request.title}"`);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      <div className={`flex gap-3 p-3.5 rounded-xl border transition-all ${
        isAvailable
          ? 'bg-green-950/10 border-green-900/20 hover:border-green-900/40'
          : isActionable
          ? 'bg-gray-900/60 border-yellow-900/20 hover:border-yellow-900/40'
          : 'bg-gray-900/60 border-white/5 hover:border-white/10'
      }`}>

        {/* Poster */}
        <div className="w-12 h-[68px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-800/80">
          {request.posterPath ? (
            <Image
              src={request.posterPath}
              alt={request.title}
              width={48}
              height={68}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700 text-[10px] text-center p-1">
              No Art
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm text-white truncate">
                  {request.title}
                  {request.year && (
                    <span className="text-gray-500 font-normal ml-1">({request.year})</span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-mono bg-gray-800/80 text-gray-600 px-1 py-0.5 rounded border border-gray-700/50">
                  #{request.overseerrId}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium ${status.className}`}>
                  {status.pulse && <span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse" />}
                  {status.label}
                </span>
                {isTV && seasons.length > 0 && (
                  <span className="text-[10px] text-gray-600">
                    {seasons.length} season{seasons.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {canSelect && isActionable && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors font-medium"
                >
                  <Download className="w-3 h-3" />
                  {request.torrents.length > 0 ? 'Re-select' : 'Select'}
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => setRejectOpen(true)}
                  disabled={rejecting}
                  title="Reject & delete"
                  className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-600 mt-1.5">
            By <span className="text-gray-500">{request.requestedBy}</span>
            {' · '}
            <span title={new Date(request.requestedAt).toLocaleString()}>
              {timeAgo(request.requestedAt)}
            </span>
          </p>

          {/* Season chips */}
          {isTV && allSeasonTabs.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {allSeasonTabs.map((s) => {
                const done = selectedSeasons.has(s);
                return (
                  <span
                    key={s}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      done
                        ? 'bg-green-900/40 text-green-400 border border-green-800/30'
                        : 'bg-gray-800/80 text-gray-600 border border-gray-700/50'
                    }`}
                  >
                    {done ? '✓ ' : ''}{s === 0 ? 'Pack' : `S${String(s).padStart(2, '0')}`}
                  </span>
                );
              })}
            </div>
          )}

          {/* Torrent info */}
          {request.torrents.length > 0 && allSeasonTabs.length <= 1 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-600">
              <CheckCircle className="w-3 h-3 text-indigo-400 flex-shrink-0" />
              <span className="truncate text-gray-500">
                {request.torrents[0].indexer} · {request.torrents[0].title}
              </span>
            </div>
          )}

          {/* Status-specific info */}
          {isDownloading && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-blue-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Downloading — check Downloads tab</span>
            </div>
          )}
          {isProcessing && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-purple-400">
              <Zap className="w-3 h-3" />
              <span>Being handled by Radarr / Sonarr automatically</span>
            </div>
          )}
          {isAvailable && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-green-500">
              <CheckCircle2 className="w-3 h-3" />
              <span>Media is available</span>
            </div>
          )}
        </div>
      </div>

      <TorrentSelectModal
        requestId={request.id}
        title={request.title}
        mediaType={request.mediaType}
        seasons={request.seasons}
        existingTorrents={request.torrents}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={onRefresh}
      />

      {rejectOpen && (
        <RejectConfirmDialog
          title={request.title}
          hasDownload={hasActiveDownload}
          onConfirm={handleReject}
          onCancel={() => setRejectOpen(false)}
        />
      )}
    </>
  );
}
