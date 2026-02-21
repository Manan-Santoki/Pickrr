'use client';

import { useState, useCallback } from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchResults } from '@/components/search/SearchResults';
import { useSearch } from '@/hooks/useSearch';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'movie' | 'tv'>('movie');

  const { results, isLoading } = useSearch({
    query,
    type,
    enabled: query.length >= 2,
  });

  const handleSearch = useCallback((q: string, t: 'movie' | 'tv') => {
    setQuery(q);
    setType(t);
  }, []);

  return (
    <div>
      <SearchBar onSearch={handleSearch} />
      <SearchResults results={results} isLoading={isLoading} mediaType={type} />
    </div>
  );
}
