import useSWR from 'swr';

export interface ActiveDownload {
  hash: string;
  name: string;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  size: string;
  state: string;
  num_seeds: number;
  num_leechs: number;
  seasonNumber: number;
  // Linked request info (null for unlinked torrents)
  requestId: string | null;
  requestTitle: string | null;
  mediaType: 'movie' | 'tv' | null;
  posterPath: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDownloads() {
  const { data, error, isLoading, mutate } = useSWR<ActiveDownload[]>(
    '/api/downloads',
    fetcher,
    {
      refreshInterval: 3000, // poll every 3s for live progress
    }
  );

  const downloads = Array.isArray(data) ? data : [];

  return {
    downloads,
    isLoading,
    isError: !!error,
    mutate,
  };
}
