import { Redirect, Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { RecordFab } from '@/components/record-fab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth';
import { isPremium } from '@/lib/purchases';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

export default function TabLayout() {
  const { user } = useAuth();
  const { onboarding, onboardingLoaded } = useBudget();
  const { palette } = useAppTheme();
  const [premium, setPremium] = useState(false);
  const [premiumChecked, setPremiumChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    isPremium().then((active) => {
      if (!mounted) return;
      setPremium(active);
      setPremiumChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  if (!onboardingLoaded) {
    return null;
  }

  if (!onboarding.completed) {
    return <Redirect href="/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Hard paywall: the app is unusable without an active subscription.
  if (!premiumChecked) {
    return null;
  }

  if (!premium) {
    return <Redirect href="/onboarding?step=14" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.sky,
        tabBarInactiveTintColor: palette.inkSubtle,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: palette.background,
          height: 64,
          paddingBottom: 8,
          width: '100%',
          maxWidth: 640,
          alignSelf: 'center',
        },
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