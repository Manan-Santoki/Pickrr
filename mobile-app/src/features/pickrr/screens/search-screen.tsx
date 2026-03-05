import type { MediaType } from '@/types/api';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTmdbSearch } from '@/features/pickrr/api';
import { CinematicScreen } from '../ui/cinematic-screen';
import { MediaCard } from '../ui/media-card';
import { SegmentedControl } from '../ui/segmented-control';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../ui/state-panels';

function useDebouncedValue(value: string, delay = 320) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

export function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [type, setType] = React.useState<'all' | MediaType>('all');

  const debouncedQuery = useDebouncedValue(query);
  const searchQuery = useTmdbSearch(debouncedQuery, type);

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find movies and series, inspect details, then queue torrents instantly.</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by title"
        placeholderTextColor="#7E91AD"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <SegmentedControl
        value={type}
        onChange={setType}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Movie', value: 'movie' },
          { label: 'TV', value: 'tv' },
        ]}
      />

      {debouncedQuery.trim().length < 2 ? (
        <EmptyPanel
          title="Start typing"
          subtitle="Search supports all TMDB content. Use at least two characters."
        />
      ) : searchQuery.isPending ? (
        <LoadingPanel label="Fetching TMDB results" />
      ) : searchQuery.isError ? (
        <ErrorPanel message="Unable to load TMDB search right now." />
      ) : searchQuery.data && searchQuery.data.length > 0 ? (
        <FlatList
          data={searchQuery.data}
          keyExtractor={(item) => `${item.mediaType}-${item.tmdbId}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              compact
              onPress={(next) => router.push(`/media/${next.mediaType}/${next.tmdbId}`)}
            />
          )}
        />
      ) : (
        <EmptyPanel title="No results" subtitle="Try another keyword or switch media type." />
      )}
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
    gap: 12,
  },
  hero: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(17,26,44,0.9)',
    gap: 8,
  },
  title: {
    color: '#F7FBFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: '#9AB0CC',
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(111,132,159,0.45)',
    backgroundColor: 'rgba(11,16,28,0.9)',
    color: '#F6FAFF',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  list: {
    paddingBottom: 120,
  },
});
