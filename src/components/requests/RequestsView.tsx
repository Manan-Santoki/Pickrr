'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { RefreshCw, Film, Tv, Clock, Zap, Download, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { AppRequest } from '@/types';
import { RequestCard } from './RequestCard';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tab = 'all' | 'awaiting' | 'processing' | 'downloading' | 'available' | 'declined';

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string; statuses: string[] }[] = [
  { id: 'all', label: 'All', icon: Search, color: 'text-gray-400', statuses: [] },
  {
    id: 'awaiting',
    label: 'Needs Selection',
    icon: Clock,
    color: 'text-yellow-400',
    statuses: ['awaiting_selection', 'selected', 'pending'],
  },
  {
    id: 'processing',
    label: 'Processing',
    icon: Zap,
    color: 'text-purple-400',
    statuses: ['processing'],
  },
  {
    id: 'downloading',
    label: 'Downloading',
    icon: Download,
    color: 'text-blue-400',
    statuses: ['downloading'],
  },
  {
    id: 'available',
    label: 'Available',
    icon: CheckCircle2,
    color: 'text-green-400',
    statuses: ['available', 'done'],
  },
  {
    id: 'declined',
    label: 'Declined',
    icon: AlertCircle,
    color: 'text-red-400',
    statuses: ['declined', 'failed'],
  },
];

function SyncButton({ onDone }: { onDone: () => void }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/requests/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');

      const parts: string[] = [];
      if (data.imported > 0) parts.push(`${data.imported} imported`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.pruned > 0) parts.push(`${data.pruned} removed`);

      if (parts.length > 0) {
        toast.success(parts.join(' · '));
        onDone();
      } else {
        toast.info('Everything up to date');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sync failed — check Overseerr settings');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 rounded-lg border border-gray-700 transition-colors"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync Overseerr'}
    </button>
  );
}

interface RequestsViewProps {
  userRole: string;
}

export function RequestsView({ userRole }: RequestsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('awaiting');
  const [search, setSearch] = useState('');

  const { data, isLoading, mutate } = useSWR<AppRequest[]>('/api/requests', fetcher, {
    refreshInterval: 15000,
  });

  const requests = Array.isArray(data) ? data : [];

  // Count per tab
  const counts: Record<Tab, number> = {
    all: requests.length,
    awaiting: requests.filter((r) => ['awaiting_selection', 'selected', 'pending'].includes(r.status)).length,
    processing: requests.filter((r) => r.status === 'processing').length,
    downloading: requests.filter((r) => r.status === 'downloading').length,
    available: requests.filter((r) => ['available', 'done'].includes(r.status)).length,
    declined: requests.filter((r) => ['declined', 'failed'].includes(r.status)).length,
  };

  const tabStatuses = TABS.find((t) => t.id === activeTab)?.statuses ?? [];
  const filtered = requests
    .filter((r) => activeTab === 'all' || tabStatuses.includes(r.status))
    .filter((r) =>
      search.trim() === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.requestedBy.toLowerCase().includes(search.toLowerCase())
    );

  const movies = filtered.filter((r) => r.mediaType === 'movie');
  const shows = filtered.filter((r) => r.mediaType === 'tv');

  const handleRefresh = useCallback(() => mutate(), [mutate]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">{requests.length} total across all statuses</p>
        </div>
        <SyncButton onDone={handleRefresh} />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 pb-0 overflow-x-auto overflow-y-hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? `${tab.color} border-current`
                : 'text-gray-500 hover:text-gray-300 border-transparent'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? 'bg-current/20 text-current' : 'bg-gray-800 text-gray-500'
                }`}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title or requester..."
          className="w-full pl-8 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-900/60 border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600 border border-dashed border-gray-800 rounded-xl">
          <Clock className="w-8 h-8 mb-3 opacity-40" />
          <p className="font-medium text-gray-500">No requests found</p>
          <p className="text-sm mt-1 text-center max-w-xs">
            {search ? 'Try a different search term.' : 'Sync from Overseerr to import requests.'}
          </p>
        </div>
      )}

      {/* Movies section */}
      {!isLoading && movies.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Film className="w-3.5 h-3.5 text-orange-400" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Movies
            </h2>
            <span className="text-[10px] bg-orange-900/30 text-orange-400 border border-orange-800/30 px-1.5 py-0.5 rounded-full">
              {movies.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {movies.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                userRole={userRole}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        </section>
      )}

      {/* TV section */}
      {!isLoading && shows.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Tv className="w-3.5 h-3.5 text-blue-400" />
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              TV Shows
            </h2>
            <span className="text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800/30 px-1.5 py-0.5 rounded-full">
              {shows.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {shows.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                userRole={userRole}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
