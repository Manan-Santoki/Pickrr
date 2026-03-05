import type { SettingsPayload } from '@/types/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Env from 'env';
import * as React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { getAuthSession, signOut, useAuthStore } from '@/features/auth/use-auth-store';
import {
  mobileLogout,
  pickrrQueryKeys,
  saveSettings,
  testServiceConnection,
  useSettings,
} from '@/features/pickrr/api';
import { usePullToRefresh, useRefetchOnFocus } from '../hooks/use-screen-refresh';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { ErrorPanel, LoadingPanel } from '../ui/state-panels';

const emptySettings: SettingsPayload = {
  PROWLARR_URL: '',
  PROWLARR_API_KEY: '',
  QBIT_URL: '',
  QBIT_USERNAME: '',
  QBIT_PASSWORD: '',
  TMDB_API_KEY: '',
  JELLYFIN_URL: '',
  JELLYFIN_API_KEY: '',
  MOVIES_SAVE_PATH: '',
  TV_SAVE_PATH: '',
};

// eslint-disable-next-line max-lines-per-function
export function SettingsScreen() {
  const queryClient = useQueryClient();
  const session = useAuthStore.use.session();
  const isAdmin = session?.user.role === 'admin';

  const settingsQuery = useSettings();
  const refreshSettings = React.useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);
  useRefetchOnFocus(refreshSettings);
  const { refreshing, onRefresh } = usePullToRefresh(refreshSettings);
  const [form, setForm] = React.useState<SettingsPayload>(emptySettings);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      setStatus('Settings saved');
      queryClient.invalidateQueries({ queryKey: pickrrQueryKeys.settings });
      showMessage({
        message: 'Settings saved',
        type: 'success',
      });
    },
    onError: () => {
      setStatus('Failed to save settings');
      showMessage({
        message: 'Failed to save settings',
        type: 'danger',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: testServiceConnection,
    onSuccess: (result) => {
      setStatus(result.ok ? `${result.service} connected` : `${result.service} failed`);
      showMessage({
        message: result.ok ? `${result.service} connected` : `${result.service} failed`,
        type: result.ok ? 'success' : 'warning',
      });
    },
    onError: () => {
      setStatus('Connection test failed');
      showMessage({
        message: 'Connection test failed',
        type: 'danger',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = getAuthSession()?.token.refreshToken;
      await mobileLogout({ refreshToken });
    },
    onSettled: () => {
      signOut();
    },
  });

  return (
    <CinematicScreen scroll={false} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          {isAdmin
            ? 'Admin controls for service credentials, save paths, and health tests.'
            : 'App-level preferences and account controls.'}
        </Text>
        <Text style={styles.subtitle}>
          Role:
          {session?.user.role ?? 'user'}
        </Text>
      </View>

      {!isAdmin
        ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              refreshControl={(
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#FF9659"
                  colors={['#FF9659']}
                />
              )}
            >
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>Application</Text>
                <Text style={styles.infoText}>
                  Environment:
                  {Env.EXPO_PUBLIC_APP_ENV}
                </Text>
                <Text style={styles.infoText}>
                  Version:
                  {Env.EXPO_PUBLIC_VERSION}
                </Text>
                <Text style={styles.infoText}>Theme: cinematic dark (default)</Text>
                <ActionButton
                  label="Sign out"
                  variant="danger"
                  onPress={() => logoutMutation.mutate()}
                  loading={logoutMutation.isPending}
                />
              </View>
            </ScrollView>
          )
        : settingsQuery.isPending
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
                <LoadingPanel label="Loading admin settings" />
              </ScrollView>
            )
          : settingsQuery.isError
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
                  <ErrorPanel message="Unable to load settings from backend." />
                </ScrollView>
              )
            : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  refreshControl={(
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor="#FF9659"
                      colors={['#FF9659']}
                    />
                  )}
                >
                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>Service Credentials</Text>
                    <SettingsInput
                      label="Prowlarr URL"
                      value={form.PROWLARR_URL}
                      onChangeText={value => setForm(previous => ({ ...previous, PROWLARR_URL: value }))}
                    />
                    <SettingsInput
                      label="Prowlarr API Key"
                      value={form.PROWLARR_API_KEY}
                      onChangeText={value => setForm(previous => ({ ...previous, PROWLARR_API_KEY: value }))}
                    />
                    <SettingsInput
                      label="qBittorrent URL"
                      value={form.QBIT_URL}
                      onChangeText={value => setForm(previous => ({ ...previous, QBIT_URL: value }))}
                    />
                    <SettingsInput
                      label="qBittorrent Username"
                      value={form.QBIT_USERNAME}
                      onChangeText={value => setForm(previous => ({ ...previous, QBIT_USERNAME: value }))}
                    />
                    <SettingsInput
                      label="qBittorrent Password"
                      value={form.QBIT_PASSWORD}
                      secureTextEntry
                      onChangeText={value => setForm(previous => ({ ...previous, QBIT_PASSWORD: value }))}
                    />
                    <SettingsInput
                      label="TMDB API Key"
                      value={form.TMDB_API_KEY}
                      onChangeText={value => setForm(previous => ({ ...previous, TMDB_API_KEY: value }))}
                    />
                    <SettingsInput
                      label="Jellyfin URL"
                      value={form.JELLYFIN_URL}
                      onChangeText={value => setForm(previous => ({ ...previous, JELLYFIN_URL: value }))}
                    />
                    <SettingsInput
                      label="Jellyfin API Key"
                      value={form.JELLYFIN_API_KEY}
                      secureTextEntry
                      onChangeText={value => setForm(previous => ({ ...previous, JELLYFIN_API_KEY: value }))}
                    />
                  </View>

                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>Save Paths</Text>
                    <SettingsInput
                      label="Movies path"
                      value={form.MOVIES_SAVE_PATH}
                      onChangeText={value => setForm(previous => ({ ...previous, MOVIES_SAVE_PATH: value }))}
                    />
                    <SettingsInput
                      label="TV path"
                      value={form.TV_SAVE_PATH}
                      onChangeText={value => setForm(previous => ({ ...previous, TV_SAVE_PATH: value }))}
                    />
                  </View>

                  <View style={styles.panel}>
                    <Text style={styles.sectionTitle}>Connectivity Tests</Text>
                    <View style={styles.testButtons}>
                      <ActionButton label="Test Prowlarr" variant="secondary" onPress={() => testMutation.mutate('prowlarr')} />
                      <ActionButton label="Test qBittorrent" variant="secondary" onPress={() => testMutation.mutate('qbittorrent')} />
                      <ActionButton label="Test TMDB" variant="secondary" onPress={() => testMutation.mutate('tmdb')} />
                      <ActionButton label="Test Jellyfin" variant="secondary" onPress={() => testMutation.mutate('jellyfin')} />
                    </View>
                  </View>

                  <ActionButton
                    label="Save Settings"
                    onPress={() => saveMutation.mutate(form)}
                    loading={saveMutation.isPending}
                  />

                  <ActionButton
                    label="Sign out"
                    variant="danger"
                    onPress={() => logoutMutation.mutate()}
                    loading={logoutMutation.isPending}
                  />
                </ScrollView>
              )}

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </CinematicScreen>
  );
}

function SettingsInput({ label, ...inputProps }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholder={label}
        placeholderTextColor="#7E91AD"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
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
  panel: {
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
  infoText: {
    color: '#9AB0CC',
    fontSize: 13,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 150,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    color: '#A9BBD4',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(111,132,159,0.45)',
    backgroundColor: 'rgba(11,16,28,0.9)',
    color: '#F6FAFF',
    paddingHorizontal: 10,
    fontSize: 13,
  },
  testButtons: {
    gap: 8,
  },
  status: {
    color: '#FFD7C0',
    fontSize: 12,
    textAlign: 'center',
  },
});
