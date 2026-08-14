import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { RecordFab } from '@/components/record-fab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useBudget } from '@/lib/store';

export default function TabLayout() {
  const { user } = useAuth();
  const { onboarding, onboardingLoaded } = useBudget();

  if (!onboardingLoaded) {
    return null;
  }

  if (!onboarding.completed) {
    return <Redirect href="/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.sky,
        tabBarInactiveTintColor: Palette.inkSubtle,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: Palette.background, height: 64, paddingBottom: 8 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="questionmark.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: '',
          tabBarButton: () => <RecordFab />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}