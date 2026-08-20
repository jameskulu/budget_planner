import { DefaultTheme, DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, TextInput, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth';
import { setAnalyticsUserId, trackAppOpen, trackScreenView } from '@/lib/analytics';
import { setupNotificationHandler } from '@/lib/notifications';
import { configurePurchases, identifyPurchasesUser, resetPurchasesUser } from '@/lib/purchases';
import { BudgetProvider } from '@/lib/store';
import { ThemeProvider, useAppTheme } from '@/lib/theme';
import { ToastProvider } from '@/components/toast';
import { BiometricLock } from '@/components/biometric-lock';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Cap how much the device's system font-size setting can inflate the app's
// text (Android's default scaling can make layouts feel oversized). Setting
// a multiplier keeps the design consistent for every user.
const MAX_FONT_SCALE = 1.0;
const withFontCap = <T extends object>(comp: T): T => {
  (comp as T & { defaultProps?: Record<string, unknown> }).defaultProps = {
    ...(comp as T & { defaultProps?: Record<string, unknown> }).defaultProps,
    maxFontSizeMultiplier: MAX_FONT_SCALE,
  };
  return comp;
};
withFontCap(Text);
withFontCap(TextInput);

SplashScreen.preventAutoHideAsync();

/** Maps a route path to a stable analytics screen name. */
function screenNameFor(pathname: string): string {
  const p = pathname.replace(/\/\(.*?\)/g, '').replace(/\/+$/, '') || '/';
  switch (p) {
    case '/':
      return 'home';
    case '/ask':
      return 'ask';
    case '/record':
      return 'record';
    case '/transactions':
      return 'history';
    case '/profile':
      return 'profile';
    case '/plan':
      return 'plan';
    case '/insights':
      return 'insights';
    case '/notification-center':
      return 'notification_center';
    case '/notifications':
      return 'notifications';
    case '/onboarding':
      return 'onboarding';
    case '/login':
    case '/email':
      return 'auth';
    default:
      return p.replace(/\//g, '_').replace(/^_/, '') || 'unknown';
  }
}

/** Fires a screen_view analytics event whenever the route changes. */
function ScreenTracker() {
  const pathname = usePathname();
  useEffect(() => {
    void trackScreenView(screenNameFor(pathname));
  }, [pathname]);
  return null;
}

function RootNavigator() {
  const { loading, user } = useAuth();
  const { palette } = useAppTheme();

  useEffect(() => {
    configurePurchases();
  }, []);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    trackAppOpen();
  }, []);

  useEffect(() => {
    if (user?.id) {
      void identifyPurchasesUser(user.id);
      void setAnalyticsUserId(user.id);
    } else {
      void resetPurchasesUser();
      void setAnalyticsUserId(null);
    }
  }, [user?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.sky} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="notification-center" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/email" />
      </Stack>
      <ScreenTracker />
      <BiometricLock />
    </View>
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
    <ThemeProvider>
      <NavThemeBridge>
        <AuthProvider>
          <BudgetProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </BudgetProvider>
        </AuthProvider>
        <StatusBar style="auto" />
      </NavThemeBridge>
    </ThemeProvider>
  );
}

/** Keeps react-navigation's theme in sync with the app theme. */
function NavThemeBridge({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>{children}</NavThemeProvider>
  );
}
