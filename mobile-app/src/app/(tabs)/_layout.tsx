import { Redirect, Tabs } from 'expo-router';
import * as React from 'react';
import { Platform, Text } from 'react-native';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { usePushRegistration } from '@/features/pickrr/hooks/use-push-registration';

function TabGlyph({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        color: focused ? '#FF9659' : '#7A8DAA',
        fontSize: 11,
        fontWeight: focused ? '800' : '600',
        letterSpacing: 0.6,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const status = useAuthStore.use.status();
  usePushRegistration();

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B1220',
          borderTopColor: 'rgba(255,255,255,0.08)',
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 86 : 70,
        },
        tabBarActiveTintColor: '#FF9659',
        tabBarInactiveTintColor: '#7A8DAA',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabGlyph label="SRCH" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabGlyph label="DISC" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => <TabGlyph label="LIB" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarIcon: ({ focused }) => <TabGlyph label="DL" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabGlyph label="ALRT" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabGlyph label="CFG" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
