import type { MobileAuthProvider } from '@/types/api';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLoginMutation } from '@/features/pickrr/api';
import { setAuthSession } from '@/features/auth/use-auth-store';
import { ActionButton } from '../ui/action-button';
import { CinematicScreen } from '../ui/cinematic-screen';
import { SegmentedControl } from '../ui/segmented-control';

export function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLoginMutation();

  const [provider, setProvider] = React.useState<MobileAuthProvider>('local');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = React.useCallback(async () => {
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    setError(null);

    try {
      const response = await loginMutation.mutateAsync({
        provider,
        username: username.trim(),
        password,
        platform:
          Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
            ? Platform.OS
            : 'unknown',
        appVersion: Constants.expoConfig?.version,
        deviceName: Constants.deviceName ?? undefined,
      });

      setAuthSession({
        user: response.user,
        token: response.token,
      });

      router.replace('/(tabs)/search');
    } catch (requestError) {
      console.error('Login error:', requestError);
      const message =
        typeof requestError === 'object'
          ? 'Invalid credentials or backend is unreachable.'
          : 'Login failed';
      setError(message);
    }
  }, [loginMutation, password, provider, router, username]);

  return (
    <CinematicScreen contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Secure Mobile Gateway</Text>
        <Text style={styles.title}>Sign in to Pickrr</Text>
        <Text style={styles.copy}>
          Use your local credentials or Jellyfin identity. Session tokens rotate automatically in the background.
        </Text>
      </View>

      <SegmentedControl
        options={[
          { label: 'Local', value: 'local' },
          { label: 'Jellyfin', value: 'jellyfin' },
        ]}
        value={provider}
        onChange={setProvider}
      />

      <View style={styles.formCard}>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor="#7E91AD"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#7E91AD"
          style={styles.input}
          secureTextEntry
          textContentType="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ActionButton
          label={provider === 'local' ? 'Sign In' : 'Sign In with Jellyfin'}
          onPress={onSubmit}
          loading={loginMutation.isPending}
        />

        <Pressable onPress={() => router.push('/(auth)/onboarding')}>
          <Text style={styles.link}>Review onboarding highlights</Text>
        </Pressable>
      </View>
    </CinematicScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,124,54,0.4)',
    backgroundColor: 'rgba(14,20,34,0.96)',
    gap: 10,
  },
  kicker: {
    color: '#FFB084',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F5F9FF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  copy: {
    color: '#A4B7D0',
    fontSize: 13,
    lineHeight: 20,
  },
  formCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(20,28,44,0.92)',
    gap: 10,
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
  error: {
    color: '#FFC5CF',
    fontSize: 12,
  },
  link: {
    color: '#FF9B61',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
});
