import type { DiscoverSection, TMDBMedia } from '@/types/api';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDiscoverSection } from '@/features/pickrr/api';
import { usePullToRefresh, useRefetchOnFocus } from '../hooks/use-screen-refresh';
import { CinematicScreen } from '../ui/cinematic-screen';
import { MediaCard } from '../ui/media-card';
import { SectionHeader } from '../ui/section-header';
import { EmptyPanel, LoadingPanel } from '../ui/state-panels';

const discoverRows: Array<{ key: DiscoverSection; label: string; subtitle: string }> = [
  { key: 'trending', label: 'Trending This Week', subtitle: 'Most active titles right now' },
  { key: 'now_playing', label: 'Now Playing', subtitle: 'Current theater cycle' },
  { key: 'popular_tv', label: 'Popular TV', subtitle: 'High traction series' },
  { key: 'recommendations', label: 'For You', subtitle: 'Based on library and downloads' },
  { key: 'netflix', label: 'Netflix Picks', subtitle: 'Streaming provider row' },
  { key: 'prime', label: 'Prime Highlights', subtitle: 'Streaming provider row' },
  { key: 'disney', label: 'Disney+', subtitle: 'Streaming provider row' },
  { key: 'apple', label: 'Apple TV+', subtitle: 'Streaming provider row' },
  { key: 'max', label: 'HBO Max', subtitle: 'Streaming provider row' },
  { key: 'hulu', label: 'Hulu', subtitle: 'Streaming provider row' },
];

// eslint-disable-next-line max-lines-per-function
export function DiscoverHomeScreen() {
  const router = useRouter();

  const queryTrending = useDiscoverSection('trending');
  const queryNowPlaying = useDiscoverSection('now_playing');
  const queryPopularTv = useDiscoverSection('popular_tv');
  const queryRecommendations = useDiscoverSection('recommendations');
  const queryNetflix = useDiscoverSection('netflix');
  const queryPrime = useDiscoverSection('prime');
  const queryDisney = useDiscoverSection('disney');
  const queryApple = useDiscoverSection('apple');
  const queryMax = useDiscoverSection('max');
  const queryHulu = useDiscoverSection('hulu');
  const refreshDiscover = React.useCallback(async () => {
    await Promise.all([
      queryTrending.refetch(),
      queryNowPlaying.refetch(),
      queryPopularTv.refetch(),
      queryRecommendations.refetch(),
      queryNetflix.refetch(),
      queryPrime.refetch(),
      queryDisney.refetch(),
      queryApple.refetch(),
      queryMax.refetch(),
      queryHulu.refetch(),
    ]);
  }, [
    queryApple,
    queryDisney,
    queryHulu,
    queryMax,
    queryNetflix,
    queryNowPlaying,
    queryPopularTv,
    queryPrime,
    queryRecommendations,
    queryTrending,
  ]);

  useRefetchOnFocus(refreshDiscover);
  const { refreshing, onRefresh } = usePullToRefresh(refreshDiscover);

  const sections: Record<DiscoverSection, { data?: TMDBMedia[]; isPending: boolean }> = {
    trending: { data: queryTrending.data, isPending: queryTrending.isPending },
    trending_movies: { data: [], isPending: false },
    trending_tv: { data: [], isPending: false },
    now_playing: { data: queryNowPlaying.data, isPending: queryNowPlaying.isPending },
    upcoming: { data: [], isPending: false },
    on_the_air: { data: [], isPending: false },
    popular_movies: { data: [], isPending: false },
    popular_tv: { data: queryPopularTv.data, isPending: queryPopularTv.isPending },
    top_rated_movies: { data: [], isPending: false },
    top_rated_tv: { data: [], isPending: false },
    bollywood: { data: [], isPending: false },
    hollywood: { data: [], isPending: false },
    recommendations: { data: queryRecommendations.data, isPending: queryRecommendations.isPending },
    netflix: { data: queryNetflix.data, isPending: queryNetflix.isPending },
    prime: { data: queryPrime.data, isPending: queryPrime.isPending },
    disney: { data: queryDisney.data, isPending: queryDisney.isPending },
    apple: { data: queryApple.data, isPending: queryApple.isPending },
    max: { data: queryMax.data, isPending: queryMax.isPending },
    hulu: { data: queryHulu.data, isPending: queryHulu.isPending },
  };

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Curated rows from trending, theatrical, OTT providers, and recommendations.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.rows}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF9659"
            colors={['#FF9659']}
          />
        )}
      >
        {discoverRows.map((row) => {
          const current = sections[row.key];

          return (
            <View key={row.key} style={styles.rowCard}>
              <SectionHeader
                title={row.label}
                subtitle={row.subtitle}
                ctaLabel="Open"
                onPressCta={() => router.push(`/discover/category/${row.key}`)}
              />

              {current.isPending
                ? (
                    <LoadingPanel label="Loading row" />
                  )
                : current.data && current.data.length > 0
                  ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                        {current.data.map(item => (
                          <MediaCard
                            key={`${row.key}-${item.mediaType}-${item.tmdbId}`}
                            item={item}
                            onPress={(next) => {
                              const jellyfinParam = next.inJellyfin ? '?inJellyfin=1' : '';
                              router.push(`/media/${next.mediaType}/${next.tmdbId}${jellyfinParam}`);
                            }}
                          />
                        ))}
                      </ScrollView>
                    )
                  : (
                      <EmptyPanel title="No data" subtitle="This row returned no items." />
                    )}
            </View>
          );
        })}
      </ScrollView>
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
  rows: {
    gap: 14,
    paddingBottom: 140,
  },
  rowCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 10,
  },
  horizontalList: {
    paddingVertical: 2,
  },
});
