import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth';
import { setupNotificationHandler } from '@/lib/notifications';
import { configurePurchases, identifyPurchasesUser, resetPurchasesUser } from '@/lib/purchases';
import { BudgetProvider } from '@/lib/store';
import { ToastProvider } from '@/components/toast';
import { Palette } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, user } = useAuth();

  useEffect(() => {
    configurePurchases();
  }, []);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    if (user?.id) {
      void identifyPurchasesUser(user.id);
    } else {
      void resetPurchasesUser();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.background }}>
        <ActivityIndicator color={Palette.sky} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="(auth)/login" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Inter_400Regular': Inter_400Regular,
    'Inter_500Medium': Inter_500Medium,
    'Inter_600SemiBold': Inter_600SemiBold,
    'Inter_700Bold': Inter_700Bold,
    'JetBrainsMono_400Regular': JetBrainsMono_400Regular,
    'JetBrainsMono_700Bold': JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error && Platform.OS !== 'web') {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <BudgetProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </BudgetProvider>
      </AuthProvider>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
