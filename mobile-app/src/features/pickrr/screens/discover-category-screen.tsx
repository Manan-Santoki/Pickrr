import type { DiscoverSection, MediaType } from '@/types/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDiscoverCategory } from '@/features/pickrr/api';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { MediaCard } from '../ui/media-card';
import { SegmentedControl } from '../ui/segmented-control';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../ui/state-panels';

function normalizeSection(value: string | string[] | undefined): DiscoverSection {
  const raw = Array.isArray(value) ? value[0] : value;
  const supported: DiscoverSection[] = [
    'trending',
    'trending_movies',
    'trending_tv',
    'now_playing',
    'upcoming',
    'on_the_air',
    'popular_movies',
    'popular_tv',
    'top_rated_movies',
    'top_rated_tv',
    'bollywood',
    'hollywood',
    'recommendations',
    'netflix',
    'prime',
    'disney',
    'apple',
    'max',
    'hulu',
  ];

  if (raw && supported.includes(raw as DiscoverSection)) {
    return raw as DiscoverSection;
  }

  return 'trending';
}

// eslint-disable-next-line max-lines-per-function
export function DiscoverCategoryScreen() {
  const params = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const section = normalizeSection(params.section);

  const [page, setPage] = React.useState(1);
  const [mediaType, setMediaType] = React.useState<MediaType>('movie');
  const [language, setLanguage] = React.useState('');
  const [region, setRegion] = React.useState('US');
  const [releaseYear, setReleaseYear] = React.useState('');
  const [minRating, setMinRating] = React.useState('0');

  const categoryQuery = useDiscoverCategory({
    section,
    page,
    mediaType,
    language: language.trim() || undefined,
    region: region.trim() || undefined,
    releaseYear: releaseYear ? Number(releaseYear) : undefined,
    minRating: Number(minRating) || 0,
    sort: 'popularity.desc',
  });

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>
          Category:
          {section.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.subtitle}>Fine-grained discover filters with pagination.</Text>
      </View>

      <View style={styles.filtersCard}>
        <SegmentedControl
          value={mediaType}
          onChange={setMediaType}
          options={[
            { label: 'Movie', value: 'movie' },
            { label: 'TV', value: 'tv' },
          ]}
        />

        <View style={styles.filterRow}>
          <TextInput
            value={language}
            onChangeText={setLanguage}
            placeholder="Language (en)"
            placeholderTextColor="#7E91AD"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={region}
            onChangeText={setRegion}
            placeholder="Region (US)"
            placeholderTextColor="#7E91AD"
            style={styles.input}
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>

        <View style={styles.filterRow}>
          <TextInput
            value={releaseYear}
            onChangeText={setReleaseYear}
            placeholder="Release year"
            placeholderTextColor="#7E91AD"
            style={styles.input}
            keyboardType="number-pad"
          />
          <TextInput
            value={minRating}
            onChangeText={setMinRating}
            placeholder="Min rating"
            placeholderTextColor="#7E91AD"
            style={styles.input}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {categoryQuery.isPending
        ? (
            <LoadingPanel label="Loading discover category" />
          )
        : categoryQuery.isError || !categoryQuery.data
          ? (
              <ErrorPanel message="Unable to load category content." />
            )
          : categoryQuery.data.results.length === 0
            ? (
                <EmptyPanel title="No content" subtitle="Adjust filters and try again." />
              )
            : (
                <FlatList
                  data={categoryQuery.data.results}
                  keyExtractor={item => `${item.mediaType}-${item.tmdbId}`}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <MediaCard
                      item={item}
                      compact
                      onPress={(next) => {
                        const jellyfinParam = next.inJellyfin ? '?inJellyfin=1' : '';
                        router.push(`/media/${next.mediaType}/${next.tmdbId}${jellyfinParam}`);
                      }}
                    />
                  )}
                />
              )}

      <View style={styles.paginationRow}>
        <ActionButton
          label="Prev"
          variant="secondary"
          onPress={() => setPage(previous => Math.max(1, previous - 1))}
          disabled={page <= 1}
        />
        <Text style={styles.pageLabel}>
          Page
          {page}
        </Text>
        <ActionButton
          label="Next"
          onPress={() => setPage(previous => previous + 1)}
          disabled={Boolean(categoryQuery.data && page >= categoryQuery.data.totalPages)}
        />
      </View>
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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  subtitle: {
    color: '#9AB0CC',
    fontSize: 13,
    lineHeight: 20,
  },
  filtersCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(111,132,159,0.45)',
    backgroundColor: 'rgba(11,16,28,0.9)',
    color: '#F6FAFF',
    paddingHorizontal: 10,
    fontSize: 13,
  },
  list: {
    paddingBottom: 110,
  },
  paginationRow: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pageLabel: {
    color: '#D0DCED',
    fontSize: 13,
    fontWeight: '700',
  },
});
