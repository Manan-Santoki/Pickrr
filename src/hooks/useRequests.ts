import useSWR from 'swr';
import type { AppRequest } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRequests() {
  const { data, error, isLoading, mutate } = useSWR<AppRequest[]>(
    '/api/requests',
    fetcher,
    {
      refreshInterval: 10000, // poll every 10s for new requests
    }
  );

  return {
    requests: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
