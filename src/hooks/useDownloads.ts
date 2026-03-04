import useSWR from 'swr';
import type { AppDownload } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDownloads() {
  const { data, error, isLoading, mutate } = useSWR<AppDownload[]>('/api/downloads', fetcher, {
    refreshInterval: 4000,
  });

  return {
    downloads: Array.isArray(data) ? data : [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
