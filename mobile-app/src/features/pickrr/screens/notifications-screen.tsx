import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationsRead, pickrrQueryKeys, useNotifications } from '@/features/pickrr/api';
import { formatRelativeTime } from '@/features/pickrr/format';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../ui/state-panels';

export function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useNotifications(80);

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.notifications });
    },
  });

  const data = notificationsQuery.data;

  return (
    <CinematicScreen>
      <View style={styles.hero}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Download lifecycle feed with unread state and deep links.</Text>
        <Text style={styles.unreadCount}>Unread: {data?.unreadCount ?? 0}</Text>
      </View>

      <ActionButton
        label="Mark all as read"
        variant="secondary"
        disabled={markReadMutation.isPending || !data || data.unreadCount === 0}
        onPress={() => markReadMutation.mutate({ markAll: true })}
      />

      {notificationsQuery.isPending ? (
        <LoadingPanel label="Loading notifications" />
      ) : notificationsQuery.isError ? (
        <ErrorPanel message="Unable to load notification feed." />
      ) : !data || data.notifications.length === 0 ? (
        <EmptyPanel title="No notifications" subtitle="Download activity will appear here." />
      ) : (
        data.notifications.map((item) => {
          const unread = !item.readAt;
          return (
            <Pressable
              key={item.id}
              style={[styles.row, unread ? styles.rowUnread : undefined]}
              onPress={() => {
                if (unread) {
                  markReadMutation.mutate({ ids: [item.id] });
                }
                if (item.entityId) {
                  router.push(`/downloads/${item.entityId}`);
                }
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowBody}>{item.body}</Text>
              <Text style={styles.rowMeta}>
                {item.type.replace(/_/g, ' ')} • {formatRelativeTime(item.createdAt)}
              </Text>
            </Pressable>
          );
        })
      )}
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
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
  unreadCount: {
    color: '#FFB084',
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(19,29,46,0.93)',
    gap: 6,
  },
  rowUnread: {
    borderColor: 'rgba(255,124,54,0.42)',
    backgroundColor: 'rgba(38,24,16,0.52)',
  },
  rowTitle: {
    color: '#F7FBFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rowBody: {
    color: '#A0B4CF',
    fontSize: 13,
    lineHeight: 20,
  },
  rowMeta: {
    color: '#90A6C3',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
