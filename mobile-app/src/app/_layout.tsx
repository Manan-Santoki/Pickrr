import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useThemeConfig } from '@/components/ui/use-theme-config';
import { APIProvider } from '@/lib/api';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import '../global.css';

export { ErrorBoundary } from 'expo-router';

loadSelectedTheme();
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 450,
  fade: true,
});

export default function RootLayout() {
  return (
    <Providers>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: '#070A14' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="media/[type]/[id]"
          options={{
            headerShown: true,
            title: 'Media Detail',
            headerStyle: { backgroundColor: '#070A14' },
            headerTintColor: '#F7FBFF',
          }}
        />
        <Stack.Screen
          name="discover/category/[section]"
          options={{
            headerShown: true,
            title: 'Discover Category',
            headerStyle: { backgroundColor: '#070A14' },
            headerTintColor: '#F7FBFF',
          }}
        />
        <Stack.Screen
          name="downloads/[id]"
          options={{
            headerShown: true,
            title: 'Download Detail',
            headerStyle: { backgroundColor: '#070A14' },
            headerTintColor: '#F7FBFF',
          }}
        />
      </Stack>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();

  return (
    <GestureHandlerRootView
      style={styles.container}
      className={theme.dark ? 'dark' : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
            </BottomSheetModalProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
