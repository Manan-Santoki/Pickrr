'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TorrentSelectModal } from './TorrentSelectModal';
import { timeAgo } from '@/lib/utils';
import type { AppRequest } from '@/types';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-700 text-gray-300',
  searching: 'bg-blue-900 text-blue-300',
  awaiting_selection: 'bg-yellow-900 text-yellow-300',
  selected: 'bg-indigo-900 text-indigo-300',
  downloading: 'bg-blue-900 text-blue-300',
  done: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  searching: 'Searching',
  awaiting_selection: 'Awaiting Selection',
  selected: 'Selected',
  downloading: 'Downloading',
  done: 'Done',
  failed: 'Failed',
};

interface RequestCardProps {
  request: AppRequest;
  onRefresh: () => void;
}

export function RequestCard({ request, onRefresh }: RequestCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
        {/* Poster */}
        <div className="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-800">
          {request.posterPath ? (
            <Image
              src={request.posterPath}
              alt={request.title}
              width={64}
              height={96}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs text-center p-1">
              No Poster
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white truncate">
                {request.title}
                {request.year && (
                  <span className="text-gray-400 font-normal ml-1">({request.year})</span>
                )}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded uppercase">
                  {request.mediaType}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${statusColors[request.status] ?? 'bg-gray-700 text-gray-300'}`}
                >
                  {request.status === 'awaiting_selection' && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mr-1 animate-pulse" />
                  )}
                  {statusLabels[request.status] ?? request.status}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Requested by <span className="text-gray-400">{request.requestedBy}</span>{' '}
            · {timeAgo(request.requestedAt)}
          </p>

          {request.overview && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{request.overview}</p>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0 flex items-center">
          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition-colors"
          >
            Select Torrent
          </button>
        </div>
      </div>

      <TorrentSelectModal
        requestId={request.id}
        title={request.title}
        mediaType={request.mediaType}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}
