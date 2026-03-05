import type { LibraryItem } from '@/types/api';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLibrary } from '@/features/pickrr/api';
import { CinematicScreen } from '../ui/cinematic-screen';
import { SegmentedControl } from '../ui/segmented-control';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../ui/state-panels';

export function LibraryScreen() {
  const router = useRouter();
  const [list, setList] = React.useState<'favorites' | 'watchlist'>('favorites');
  const [mode, setMode] = React.useState<'grid' | 'list'>('grid');

  const libraryQuery = useLibrary(list);

  const columns = mode === 'grid' ? 2 : 1;

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Favorites and watchlist with mobile-optimized layout toggle.</Text>
      </View>

      <SegmentedControl
        value={list}
        onChange={setList}
        options={[
          { label: 'Favorites', value: 'favorites' },
          { label: 'Watchlist', value: 'watchlist' },
        ]}
      />

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { label: 'Grid', value: 'grid' },
          { label: 'List', value: 'list' },
        ]}
      />

      {libraryQuery.isPending ? (
        <LoadingPanel label="Loading library" />
      ) : libraryQuery.isError || !libraryQuery.data ? (
        <ErrorPanel message="Unable to load library." />
      ) : libraryQuery.data.results.length === 0 ? (
        <EmptyPanel title="No items" subtitle="Add items from media detail actions." />
      ) : (
        <FlatList
          data={libraryQuery.data.results}
          keyExtractor={(item) => item.id}
          key={columns}
          numColumns={columns}
          contentContainerStyle={styles.list}
          columnWrapperStyle={columns === 2 ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <LibraryItemCard
              item={item}
              mode={mode}
              onPress={() => router.push(`/media/${item.mediaType}/${item.tmdbId}`)}
            />
          )}
        />
      )}
    </CinematicScreen>
  );
}

function LibraryItemCard({
  item,
  mode,
  onPress,
}: {
  item: LibraryItem;
  mode: 'grid' | 'list';
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.card, mode === 'list' ? styles.cardList : styles.cardGrid]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
    >
      <Image
        source={{ uri: item.posterPath ?? undefined }}
        style={[styles.poster, mode === 'list' ? styles.posterList : styles.posterGrid]}
        contentFit="cover"
      />
      <View style={styles.cardMeta}>
        <Text numberOfLines={2} style={styles.cardTitle}>
          {item.title}
        </Text>
        <Text style={styles.cardSubtitle}>
          {item.mediaType.toUpperCase()} • {item.year ?? 'NA'}
        </Text>
      </View>
    </Pressable>
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
  list: {
    paddingBottom: 140,
    gap: 10,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardGrid: {
    width: '48.5%',
  },
  cardList: {
    width: '100%',
    flexDirection: 'row',
  },
  poster: {
    backgroundColor: '#0D1422',
  },
  posterGrid: {
    width: '100%',
    height: 210,
  },
  posterList: {
    width: 104,
    height: 140,
  },
  cardMeta: {
    padding: 10,
    gap: 4,
    flexShrink: 1,
  },
  cardTitle: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#95A7C0',
    fontSize: 12,
  },
});
