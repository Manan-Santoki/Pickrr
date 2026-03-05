import { useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pickrrQueryKeys, updateDownloadAction, useDownloadDetail } from '@/features/pickrr/api';
import { formatBytes, formatDuration } from '@/features/pickrr/format';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { ErrorPanel, LoadingPanel } from '../ui/state-panels';

export function DownloadDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const downloadId = Array.isArray(params.id) ? params.id[0] : params.id;

  const queryClient = useQueryClient();
  const downloadQuery = useDownloadDetail(downloadId ?? '');

  const actionMutation = useMutation({
    mutationFn: updateDownloadAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.downloadDetail(downloadId ?? '') });
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.downloads });
    },
  });

  if (downloadQuery.isPending) {
    return (
      <CinematicScreen>
        <LoadingPanel label="Loading download detail" />
      </CinematicScreen>
    );
  }

  if (downloadQuery.isError || !downloadQuery.data) {
    return (
      <CinematicScreen>
        <ErrorPanel message="Unable to load this download." />
      </CinematicScreen>
    );
  }

  const item = downloadQuery.data;
  const hash = item.hash ?? item.qbitHash;

  return (
    <CinematicScreen>
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>Status: {item.status.toUpperCase()}</Text>
        <Text style={styles.meta}>Progress: {(item.progress * 100).toFixed(2)}%</Text>
        <Text style={styles.meta}>State: {item.state ?? 'Unknown'}</Text>
        <Text style={styles.meta}>Download: {formatBytes(item.dlspeed)}/s</Text>
        <Text style={styles.meta}>Upload: {formatBytes(item.upspeed)}/s</Text>
        <Text style={styles.meta}>ETA: {formatDuration(item.eta)}</Text>
        <Text style={styles.meta}>Seeds/Leeches: {item.num_seeds}/{item.num_leechs}</Text>
        <Text style={styles.meta}>Hash: {hash ?? 'Unavailable'}</Text>
      </View>

      <View style={styles.actionRow}>
        <ActionButton
          label={item.status === 'paused' ? 'Resume' : 'Pause'}
          variant="secondary"
          disabled={!hash}
          loading={actionMutation.isPending}
          onPress={() => {
            if (!hash) return;
            actionMutation.mutate({
              hash,
              action: item.status === 'paused' ? 'resume' : 'pause',
            });
          }}
        />
        <ActionButton
          label="Delete"
          variant="danger"
          disabled={!hash}
          loading={actionMutation.isPending}
          onPress={() => {
            if (!hash) return;
            actionMutation.mutate({ hash, action: 'delete' });
          }}
        />
      </View>
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 8,
  },
  title: {
    color: '#F7FBFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  meta: {
    color: '#A0B4CF',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
