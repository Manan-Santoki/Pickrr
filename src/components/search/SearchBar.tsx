'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, type: 'movie' | 'tv') => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        onSearch(query.trim(), type);
      }, 400);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, type, onSearch]);

  return (
    <div className="flex gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies or TV shows..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setType('movie')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            type === 'movie'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Movie
        </button>
        <button
          onClick={() => setType('tv')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            type === 'tv'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          TV
        </button>
      </div>
    </div>
  );
}
