'use client';

import { useRequests } from '@/hooks/useRequests';
import { RequestCard } from './RequestCard';
import { Clock } from 'lucide-react';

export function RequestList() {
  const { requests, isLoading, mutate } = useRequests();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Clock className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">No pending requests</p>
        <p className="text-sm mt-1">Requests from Overseerr will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} onRefresh={() => mutate()} />
      ))}
    </div>
  );
}
