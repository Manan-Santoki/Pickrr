import useSWR from 'swr';
import type { ProwlarrResult } from '@/types/prowlarr';

interface UseSearchOptions {
  query: string;
  type: 'movie' | 'tv';
  limit?: number;
  enabled: boolean;
}

interface SearchResponse {
  results: ProwlarrResult[];
  total: number;
}

const fetcher = (
  [url, query, type, limit]: [string, string, string, number]
) => {
  const params = new URLSearchParams({
    query,
    type,
    limit: String(limit),
  });

  return fetch(`${url}?${params}`).then((r) => r.json());
};

export function useSearch({ query, type, limit = 50, enabled }: UseSearchOptions) {
  const { data, error, isLoading } = useSWR<SearchResponse>(
    enabled && query ? ['/api/search', query, type, limit] : null,
    fetcher
  );

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}
