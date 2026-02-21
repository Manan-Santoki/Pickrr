import useSWR from 'swr';
import type { ProwlarrResult } from '@/types/prowlarr';

interface UseSearchOptions {
  query: string;
  type: 'movie' | 'tv';
  enabled: boolean;
}

interface SearchResponse {
  results: ProwlarrResult[];
  total: number;
}

const fetcher = ([url, query, type]: [string, string, string]) => {
  const params = new URLSearchParams({ query, type });
  return fetch(`${url}?${params}`).then((r) => r.json());
};

export function useSearch({ query, type, enabled }: UseSearchOptions) {
  const { data, error, isLoading } = useSWR<SearchResponse>(
    enabled && query ? ['/api/search', query, type] : null,
    fetcher
  );

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
  };
}
