import useSWR from 'swr';

export interface ActiveDownload {
  hash: string;
  name: string;
  progress: number;
  dlspeed: number;
  eta: number;
  size: string;
  state: string;
  num_seeds: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDownloads() {
  const { data, error, isLoading } = useSWR<ActiveDownload[]>(
    '/api/downloads',
    fetcher,
    {
      refreshInterval: 3000, // poll every 3s for progress updates
    }
  );

  return {
    downloads: data ?? [],
    isLoading,
    isError: !!error,
  };
}
