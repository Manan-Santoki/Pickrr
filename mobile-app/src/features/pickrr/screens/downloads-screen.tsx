import type { AppDownload } from '@/types/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { pickrrQueryKeys, updateDownloadAction, useDownloads } from '@/features/pickrr/api';
import { formatBytes, formatDuration } from '@/features/pickrr/format';
import { usePullToRefresh, useRefetchOnFocus } from '../hooks/use-screen-refresh';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../ui/state-panels';

function splitDownloads(downloads: AppDownload[]) {
  const active = downloads.filter(item => item.status === 'downloading' || item.status === 'paused');
  const completed = downloads.filter(item => item.status === 'done' || item.status === 'failed');
  return { active, completed };
}

// eslint-disable-next-line max-lines-per-function
export function DownloadsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const downloadsQuery = useDownloads();
  const refreshDownloads = React.useCallback(async () => {
    await downloadsQuery.refetch();
  }, [downloadsQuery]);
  useRefetchOnFocus(refreshDownloads);
  const { refreshing, onRefresh } = usePullToRefresh(refreshDownloads);
  const actionMutation = useMutation({
    mutationFn: updateDownloadAction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.downloads });
      const actionLabel = variables.action === 'delete'
        ? 'Download removed'
        : variables.action === 'pause'
          ? 'Download paused'
          : 'Download resumed';
      showMessage({
        message: actionLabel,
        type: 'success',
      });
    },
    onError: (_, variables) => {
      const actionLabel = variables.action === 'delete'
        ? 'remove'
        : variables.action === 'pause'
          ? 'pause'
          : 'resume';
      showMessage({
        message: `Failed to ${actionLabel} download`,
        type: 'danger',
      });
    },
  });

  const grouped = splitDownloads(downloadsQuery.data ?? []);

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Downloads</Text>
        <Text style={styles.subtitle}>Live telemetry from qBittorrent, grouped by active and completed states.</Text>
      </View>

      {downloadsQuery.isPending
        ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={(
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#FF9659"
                  colors={['#FF9659']}
                />
              )}
            >
              <LoadingPanel label="Syncing downloads" />
            </ScrollView>
          )
        : downloadsQuery.isError
          ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={(
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#FF9659"
                    colors={['#FF9659']}
                  />
                )}
              >
                <ErrorPanel message="Unable to load download state." />
              </ScrollView>
            )
          : !downloadsQuery.data || downloadsQuery.data.length === 0
              ? (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={(
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FF9659"
                        colors={['#FF9659']}
                      />
                    )}
                  >
                    <EmptyPanel title="Nothing queued" subtitle="Grab torrents from media detail to start downloads." />
                  </ScrollView>
                )
              : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.sections}
                    refreshControl={(
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FF9659"
                        colors={['#FF9659']}
                      />
                    )}
                  >
                    <DownloadSection
                      title="Active"
                      items={grouped.active}
                      actionMutation={actionMutation}
                      onOpenDetail={id => router.push(`/downloads/${id}`)}
                    />
                    <DownloadSection
                      title="Completed / Failed"
                      items={grouped.completed}
                      actionMutation={actionMutation}
                      onOpenDetail={id => router.push(`/downloads/${id}`)}
                    />
                  </ScrollView>
                )}
    </CinematicScreen>
  );
}

function DownloadSection({
  title,
  items,
  actionMutation,
  onOpenDetail,
}: {
  title: string;
  items: AppDownload[];
  actionMutation: {
    mutate: (payload: { hash: string; action: 'pause' | 'resume' | 'delete'; deleteFiles?: boolean }) => void;
    isPending: boolean;
  };
  onOpenDetail: (id: string) => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0
        ? (
            <Text style={styles.emptyText}>No items in this section.</Text>
          )
        : (
            items.map((item) => {
              const hash = item.hash ?? item.qbitHash;
              const isPaused = item.status === 'paused';

              return (
                <Pressable
                  key={item.id}
                  style={styles.downloadCard}
                  onPress={() => onOpenDetail(item.id)}
                  android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
                >
                  <Text numberOfLines={2} style={styles.downloadTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta}>
                    {item.status.toUpperCase()}
                    {' '}
                    •
                    {(item.progress * 100).toFixed(1)}
                    % •
                    {formatBytes(Number(item.size))}
                  </Text>
                  <Text style={styles.meta}>
                    DL
                    {' '}
                    {formatBytes(item.dlspeed)}
                    /s • UL
                    {' '}
                    {formatBytes(item.upspeed)}
                    /s • ETA
                    {' '}
                    {formatDuration(item.eta)}
                  </Text>

                  <View style={styles.actions}>
                    <ActionButton
                      label={isPaused ? 'Resume' : 'Pause'}
                      variant="secondary"
                      disabled={!hash || actionMutation.isPending}
                      loading={actionMutation.isPending}
                      onPress={() => {
                        if (!hash)
                          return;
                        actionMutation.mutate({
                          hash,
                          action: isPaused ? 'resume' : 'pause',
                        });
                      }}
                    />
                    <ActionButton
                      label="Delete"
                      variant="danger"
                      disabled={!hash || actionMutation.isPending}
                      onPress={() => {
                        if (!hash)
                          return;
                        actionMutation.mutate({
                          hash,
                          action: 'delete',
                        });
                      }}
                    />
                  </View>
                </Pressable>
              );
            })
          )}
    </View>
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
  sections: {
    gap: 12,
    paddingBottom: 150,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 10,
  },
  sectionTitle: {
    color: '#F4F9FF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: '#93A8C5',
    fontSize: 12,
  },
  downloadCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    gap: 6,
    backgroundColor: 'rgba(11,16,28,0.72)',
  },
  downloadTitle: {
    color: '#F5F9FF',
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: '#9AB0CC',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
