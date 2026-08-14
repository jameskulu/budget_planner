import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/google-logo';
import { Pico } from '@/components/pico';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { configured, user, signInWithGoogle, signInAsTestUser, error } = useAuth();

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.heroStage}>
          <View style={styles.heroGlow} />
          <View style={styles.heroBadge}>
            <ThemedText style={styles.heroBadgeText}>👋 Welcome back</ThemedText>
          </View>
          <View style={styles.heroMascot}>
            <Pico
              size={230}
              pose="showing_phone"
              speech="Let's manage your money together 💜"
              speechPosition="bottom"
              interactive
            />
          </View>
          <ThemedText style={styles.heroAppName}>Pico</ThemedText>
          <ThemedText style={styles.heroTagline}>Your money buddy</ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <ThemedText style={styles.cardIconText}>🔐</ThemedText>
            </View>
            <View style={styles.cardHeaderText}>
              <ThemedText style={styles.cardTitle}>Sign in to continue</ThemedText>
              <ThemedText style={styles.cardSub}>
                Sync your spending and keep it safe in the cloud.
              </ThemedText>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={signInWithGoogle}
            style={({ pressed }) => [styles.googleButton, pressed && styles.googlePressed]}>
            <GoogleLogo size={22} />
            <ThemedText style={styles.googleLabel}>Continue with Google</ThemedText>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={styles.divider} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={signInAsTestUser}
            style={({ pressed }) => [styles.testButton, pressed && styles.googlePressed]}>
            <ThemedText style={styles.testLabel}>Continue as guest</ThemedText>
          </Pressable>

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        </View>

        {!configured ? (
          <View style={styles.hint}>
            <ThemedText style={styles.hintTitle}>Almost ready</ThemedText>
            <ThemedText style={styles.hintBody}>
              Add your Supabase project URL and anon key to a .env file as
              EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, enable
              the Google provider, and run the schema in supabase/schema.sql.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  heroStage: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: Palette.berrySoft,
    paddingTop: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: Palette.berry,
    opacity: 0.12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 4,
    backgroundColor: Palette.berry,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  heroMascot: {
    alignItems: 'center',
    marginTop: 2,
  },
  heroAppName: {
    fontSize: 30,
    lineHeight: 38,
    marginTop: 2,
  },
  heroTagline: {
    color: Palette.inkMuted,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.outline,
    padding: 24,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Palette.berrySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    fontSize: 22,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    lineHeight: 28,
  },
  cardSub: {
    color: Palette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.outlineStrong,
    backgroundColor: Palette.background,
    paddingHorizontal: 20,
  },
  googlePressed: {
    backgroundColor: Palette.surfaceSunken,
  },
  googleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.outline,
  },
  dividerText: {
    color: Palette.inkSubtle,
    fontSize: 14,
  },
  testButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.background,
  },
  testLabel: {
    color: Palette.inkMuted,
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
  },
  error: {
    color: Palette.coral,
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
    padding: 16,
    gap: 6,
  },
  hintTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },
  hintBody: {
    color: Palette.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
