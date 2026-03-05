import type { MediaType, TorrentResult } from '@/types/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import {
  pickrrQueryKeys,
  queueDownload,
  searchTorrents,
  updateLibraryStatus,
  useLibraryStatus,
  useMediaDetail,
} from '@/features/pickrr/api';
import { formatBytes } from '@/features/pickrr/format';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../ui/state-panels';

function normalizeType(value: string | string[] | undefined): MediaType {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'tv' ? 'tv' : 'movie';
}

function normalizeId(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

// eslint-disable-next-line max-lines-per-function
export function MediaDetailScreen() {
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const mediaType = normalizeType(params.type);
  const tmdbId = normalizeId(params.id);

  const queryClient = useQueryClient();
  const detailQuery = useMediaDetail(tmdbId, mediaType);
  const libraryStatus = useLibraryStatus(tmdbId, mediaType);

  const [torrentQuery, setTorrentQuery] = React.useState('');
  const [torrentResults, setTorrentResults] = React.useState<TorrentResult[]>([]);
  const [torrentError, setTorrentError] = React.useState<string | null>(null);
  const [visibleTorrentCount, setVisibleTorrentCount] = React.useState(8);
  const [queuedGuids, setQueuedGuids] = React.useState<Set<string>>(new Set());
  const [queueingGuid, setQueueingGuid] = React.useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: async (query: string) => searchTorrents(query, mediaType),
    onSuccess: (results) => {
      const sorted = [...results].sort((a, b) => b.seeders - a.seeders);
      setTorrentResults(sorted);
      setVisibleTorrentCount(8);
      setTorrentError(null);
      showMessage({
        message: sorted.length > 0 ? `Found ${sorted.length} torrents` : 'No torrents found',
        type: sorted.length > 0 ? 'success' : 'warning',
      });
    },
    onError: (error: unknown) => {
      const nextMessage = error instanceof Error ? error.message : 'Torrent search failed. Check Prowlarr settings.';
      setTorrentError(nextMessage);
      showMessage({
        message: nextMessage,
        type: 'danger',
      });
    },
  });

  const queueMutation = useMutation({
    mutationFn: queueDownload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.downloads });
    },
  });

  const libraryMutation = useMutation({
    mutationFn: updateLibraryStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.libraryStatus(tmdbId, mediaType) });
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.library('favorites') });
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.library('watchlist') });
    },
  });

  React.useEffect(() => {
    if (detailQuery.data) {
      const base = detailQuery.data.year ? `${detailQuery.data.title} ${detailQuery.data.year}` : detailQuery.data.title;
      setTorrentQuery(base);
    }
  }, [detailQuery.data]);

  if (detailQuery.isPending) {
    return (
      <CinematicScreen>
        <LoadingPanel label="Loading media detail" />
      </CinematicScreen>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <CinematicScreen>
        <ErrorPanel message="Unable to load media details." />
      </CinematicScreen>
    );
  }

  const details = detailQuery.data;
  const status = libraryStatus.data;
  const visibleTorrents = torrentResults.slice(0, visibleTorrentCount);
  const canShowMoreTorrents = visibleTorrentCount < torrentResults.length;

  const updateLibrary = async (payload: { isFavorite: boolean; inWatchlist: boolean }, successMessage: string) => {
    try {
      await libraryMutation.mutateAsync({
        tmdbId,
        mediaType,
        title: details.title,
        year: details.year,
        posterPath: details.posterUrl,
        ...payload,
      });
      showMessage({
        message: successMessage,
        type: 'success',
      });
    }
    catch (error: unknown) {
      showMessage({
        message: error instanceof Error ? error.message : 'Failed to update library status',
        type: 'danger',
      });
    }
  };

  const queueTorrent = async (item: TorrentResult) => {
    if (queuedGuids.has(item.guid)) {
      return;
    }

    setQueueingGuid(item.guid);
    try {
      await queueMutation.mutateAsync({
        tmdbId,
        mediaType,
        title: details.title,
        year: details.year,
        posterPath: details.posterUrl,
        torrentTitle: item.title,
        indexer: item.indexer,
        size: item.size,
        seeders: item.seeders,
        downloadUrl: item.downloadUrl,
        magnetUrl: item.magnetUrl,
      });
      setQueuedGuids(previous => new Set(previous).add(item.guid));
      showMessage({
        message: 'Torrent queued',
        type: 'success',
      });
    }
    catch (error: unknown) {
      showMessage({
        message: error instanceof Error ? error.message : 'Failed to queue torrent',
        type: 'danger',
      });
    }
    finally {
      setQueueingGuid(null);
    }
  };

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Image
          source={{ uri: details.backdropUrl ?? details.posterUrl ?? undefined }}
          style={styles.backdrop}
          contentFit="cover"
        />

        <View style={styles.card}>
          <Text style={styles.title}>{details.title}</Text>
          <Text style={styles.meta}>
            {details.mediaType.toUpperCase()}
            {' '}
            •
            {details.year ?? 'NA'}
            {' '}
            • ★
            {details.rating.toFixed(1)}
            {details.runtimeMinutes ? ` • ${details.runtimeMinutes}m` : ''}
          </Text>
          <Text style={styles.summary}>{details.overview || 'No synopsis provided.'}</Text>

          <View style={styles.rowButtons}>
            <Pressable
              style={[styles.iconToggle, status?.isFavorite ? styles.iconToggleActive : undefined]}
              disabled={libraryMutation.isPending}
              onPress={() => {
                void updateLibrary(
                  {
                    isFavorite: !status?.isFavorite,
                    inWatchlist: status?.inWatchlist ?? false,
                  },
                  status?.isFavorite ? 'Removed from favorites' : 'Added to favorites',
                );
              }}
            >
              <Ionicons
                name={status?.isFavorite ? 'heart' : 'heart-outline'}
                size={16}
                color={status?.isFavorite ? '#FFB191' : '#9EB3CF'}
              />
              <Text style={[styles.iconToggleText, status?.isFavorite ? styles.iconToggleTextActive : undefined]}>
                {status?.isFavorite ? 'Liked' : 'Like'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.iconToggle, status?.inWatchlist ? styles.iconToggleActive : undefined]}
              disabled={libraryMutation.isPending}
              onPress={() => {
                void updateLibrary(
                  {
                    isFavorite: status?.isFavorite ?? false,
                    inWatchlist: !status?.inWatchlist,
                  },
                  status?.inWatchlist ? 'Removed from watchlist' : 'Added to watchlist',
                );
              }}
            >
              <Ionicons
                name={status?.inWatchlist ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={status?.inWatchlist ? '#FFB191' : '#9EB3CF'}
              />
              <Text style={[styles.iconToggleText, status?.inWatchlist ? styles.iconToggleTextActive : undefined]}>
                {status?.inWatchlist ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>

          {details.primaryTrailer
            ? (
                <View style={styles.trailerAction}>
                  <ActionButton
                    label={`Open Trailer: ${details.primaryTrailer.name}`}
                    variant="secondary"
                    onPress={() => {
                      void Linking.openURL(details.primaryTrailer!.url).catch(() => {
                        showMessage({
                          message: 'Unable to open trailer URL',
                          type: 'danger',
                        });
                      });
                    }}
                  />
                  <Text style={styles.smallMuted}>Trailer opens in YouTube/browser (no in-app player).</Text>
                </View>
              )
            : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cast</Text>
          {details.cast.length === 0
            ? (
                <Text style={styles.smallMuted}>No cast information available.</Text>
              )
            : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
                  {details.cast.slice(0, 12).map(member => (
                    <View key={member.id} style={styles.castCard}>
                      {member.profileUrl
                        ? (
                            <Image source={{ uri: member.profileUrl }} style={styles.castImage} contentFit="cover" />
                          )
                        : (
                            <View style={styles.castImageFallback}>
                              <Ionicons name="person-outline" size={16} color="#8EA4C1" />
                            </View>
                          )}
                      <Text numberOfLines={1} style={styles.castName}>
                        {member.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.castRole}>
                        {member.character ?? 'Cast'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {details.reviews.length === 0
            ? (
                <Text style={styles.smallMuted}>No reviews yet.</Text>
              )
            : (
                details.reviews.slice(0, 2).map(review => (
                  <View key={review.id} style={styles.reviewBlock}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <Text numberOfLines={4} style={styles.smallMuted}>
                      {review.content}
                    </Text>
                  </View>
                ))
              )}
        </View>

        <View style={styles.card}>
          <View style={styles.torrentHeader}>
            <Text style={styles.sectionTitle}>Find Torrent</Text>
            {torrentResults.length > 0
              ? (
                  <Text style={styles.torrentSummary}>
                    {torrentResults.length}
                    {' '}
                    found
                  </Text>
                )
              : null}
          </View>
          <Text style={styles.smallMuted}>Results are sorted by seeders. Pull newer terms for better quality.</Text>
          <TextInput
            value={torrentQuery}
            onChangeText={setTorrentQuery}
            placeholder="Search torrent title"
            placeholderTextColor="#7E91AD"
            style={styles.input}
          />
          <ActionButton
            label="Search Torrents"
            onPress={() => {
              const nextQuery = torrentQuery.trim();
              if (!nextQuery) {
                setTorrentError('Enter query text before searching.');
                showMessage({
                  message: 'Enter a query before searching',
                  type: 'warning',
                });
                return;
              }
              searchMutation.mutate(nextQuery);
            }}
            loading={searchMutation.isPending}
          />

          {torrentError ? <Text style={styles.error}>{torrentError}</Text> : null}
          {torrentResults.length > 0
            ? (
                <>
                  {visibleTorrents.map((item) => {
                    const isQueued = queuedGuids.has(item.guid);
                    return (
                      <View key={item.guid} style={styles.torrentRow}>
                        <View style={styles.torrentMeta}>
                          <Text numberOfLines={2} style={styles.torrentTitle}>
                            {item.title}
                          </Text>
                          <Text style={styles.smallMuted}>
                            {item.indexer}
                            {' '}
                            •
                            {item.seeders}
                            {' '}
                            seed •
                            {formatBytes(item.size)}
                          </Text>
                        </View>
                        <ActionButton
                          label={isQueued ? 'Queued' : 'Grab'}
                          variant={isQueued ? 'secondary' : 'primary'}
                          disabled={isQueued || queueingGuid !== null}
                          onPress={() => {
                            void queueTorrent(item);
                          }}
                          loading={queueingGuid === item.guid}
                        />
                      </View>
                    );
                  })}

                  {canShowMoreTorrents
                    ? (
                        <ActionButton
                          label={`Show More (${torrentResults.length - visibleTorrentCount})`}
                          variant="secondary"
                          onPress={() => {
                            setVisibleTorrentCount(previous => Math.min(previous + 8, torrentResults.length));
                          }}
                        />
                      )
                    : null}
                </>
              )
            : searchMutation.isSuccess
              ? (
                  <EmptyPanel title="No torrents found" subtitle="Try another query or provider setup." />
                )
              : null}
        </View>
      </ScrollView>
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 70,
  },
  backdrop: {
    height: 210,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 10,
  },
  title: {
    color: '#F6FAFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  meta: {
    color: '#A4B7D0',
    fontSize: 13,
  },
  summary: {
    color: '#D5E0F2',
    fontSize: 13,
    lineHeight: 20,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconToggle: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125,150,182,0.35)',
    backgroundColor: 'rgba(13,19,33,0.75)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconToggleActive: {
    borderColor: 'rgba(255,124,54,0.48)',
    backgroundColor: 'rgba(66,35,20,0.6)',
  },
  iconToggleText: {
    color: '#9EB3CF',
    fontSize: 13,
    fontWeight: '700',
  },
  iconToggleTextActive: {
    color: '#FFCAA8',
  },
  trailerAction: {
    gap: 8,
  },
  sectionTitle: {
    color: '#F4F9FF',
    fontSize: 17,
    fontWeight: '700',
  },
  smallMuted: {
    color: '#9AB0CC',
    fontSize: 12,
    lineHeight: 19,
  },
  castRow: {
    gap: 10,
    paddingRight: 8,
  },
  castCard: {
    width: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(11,16,28,0.72)',
    overflow: 'hidden',
  },
  castImage: {
    width: '100%',
    height: 118,
    backgroundColor: '#0D1422',
  },
  castImageFallback: {
    width: '100%',
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1422',
  },
  castName: {
    color: '#F5F9FF',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  castRole: {
    color: '#9AB0CC',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  reviewBlock: {
    gap: 6,
  },
  reviewAuthor: {
    color: '#FFD1B7',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(111,132,159,0.45)',
    backgroundColor: 'rgba(11,16,28,0.9)',
    color: '#F6FAFF',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  error: {
    color: '#FFC5CF',
    fontSize: 12,
  },
  torrentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  torrentSummary: {
    color: '#FFB48A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  torrentRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    gap: 8,
    backgroundColor: 'rgba(11,16,28,0.72)',
  },
  torrentMeta: {
    gap: 4,
  },
  torrentTitle: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '600',
  },
});
