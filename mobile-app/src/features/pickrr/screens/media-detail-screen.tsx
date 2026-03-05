import type { MediaType, TorrentResult } from '@/types/api';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pickrrQueryKeys,
  queueDownload,
  searchTorrents,
  updateLibraryStatus,
  useLibraryStatus,
  useMediaDetail,
} from '@/features/pickrr/api';
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

  const searchMutation = useMutation({
    mutationFn: async (query: string) => searchTorrents(query, mediaType),
    onSuccess: (results) => {
      setTorrentResults(results);
      setTorrentError(null);
    },
    onError: () => {
      setTorrentError('Torrent search failed. Check Prowlarr settings.');
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
            {details.mediaType.toUpperCase()} • {details.year ?? 'NA'} • ★ {details.rating.toFixed(1)}
            {details.runtimeMinutes ? ` • ${details.runtimeMinutes}m` : ''}
          </Text>
          <Text style={styles.summary}>{details.overview || 'No synopsis provided.'}</Text>

          <View style={styles.rowButtons}>
            <ActionButton
              label={status?.isFavorite ? 'Favorited' : 'Favorite'}
              variant={status?.isFavorite ? 'secondary' : 'primary'}
              onPress={() => {
                libraryMutation.mutate({
                  tmdbId,
                  mediaType,
                  title: details.title,
                  year: details.year,
                  posterPath: details.posterUrl,
                  isFavorite: !status?.isFavorite,
                  inWatchlist: status?.inWatchlist ?? false,
                });
              }}
            />
            <ActionButton
              label={status?.inWatchlist ? 'In Watchlist' : 'Watchlist'}
              variant="secondary"
              onPress={() => {
                libraryMutation.mutate({
                  tmdbId,
                  mediaType,
                  title: details.title,
                  year: details.year,
                  posterPath: details.posterUrl,
                  isFavorite: status?.isFavorite ?? false,
                  inWatchlist: !status?.inWatchlist,
                });
              }}
            />
          </View>

          {details.primaryTrailer ? (
            <ActionButton
              label={`Watch Trailer: ${details.primaryTrailer.name}`}
              variant="secondary"
              onPress={() => {
                void Linking.openURL(details.primaryTrailer!.url);
              }}
            />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cast</Text>
          {details.cast.length === 0 ? (
            <Text style={styles.smallMuted}>No cast information available.</Text>
          ) : (
            details.cast.slice(0, 8).map((member) => (
              <Text key={member.id} style={styles.smallMuted}>
                {member.name}
                {member.character ? ` as ${member.character}` : ''}
              </Text>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {details.reviews.length === 0 ? (
            <Text style={styles.smallMuted}>No reviews yet.</Text>
          ) : (
            details.reviews.slice(0, 2).map((review) => (
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
          <Text style={styles.sectionTitle}>Find Torrent</Text>
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
                return;
              }
              searchMutation.mutate(nextQuery);
            }}
            loading={searchMutation.isPending}
          />

          {torrentError ? <Text style={styles.error}>{torrentError}</Text> : null}
          {torrentResults.length > 0 ? (
            torrentResults.slice(0, 8).map((item) => (
              <View key={item.guid} style={styles.torrentRow}>
                <View style={styles.torrentMeta}>
                  <Text numberOfLines={2} style={styles.torrentTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.smallMuted}>
                    {item.indexer} • Seeders: {item.seeders} • Size: {(item.size / 1024 / 1024 / 1024).toFixed(2)} GB
                  </Text>
                </View>
                <ActionButton
                  label="Grab"
                  onPress={() => {
                    queueMutation.mutate({
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
                  }}
                  loading={queueMutation.isPending}
                />
              </View>
            ))
          ) : searchMutation.isSuccess ? (
            <EmptyPanel title="No torrents found" subtitle="Try another query or provider setup." />
          ) : null}
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
