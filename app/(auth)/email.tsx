import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';

export default function EmailAuthScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, signInWithEmail, signUpWithEmail, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('Enter your email and password.');
      return;
    }
    setBusy(true);
    if (mode === 'register') {
      const sessionCreated = await signUpWithEmail(name.trim(), email.trim(), password);
      setBusy(false);
      if (!sessionCreated) {
        setLocalError('Check your inbox — confirm your email to finish signing up.');
      }
      return;
    }
    await signInWithEmail(email.trim(), password);
    setBusy(false);
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setLocalError(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.chrome}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={palette.ink} />
          </Pressable>
          <ThemedText type="title">Email</ThemedText>
        </View>

        <View style={styles.hero}>
          <Pico size={160} pose="using_phone" />
          <ThemedText style={styles.heroAppName}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </ThemedText>
          <ThemedText style={styles.heroTagline}>
            {mode === 'login'
              ? 'Log in to sync your spending.'
              : 'It takes less than a minute.'}
          </ThemedText>
        </View>

        <View style={styles.form}>
          {mode === 'register' ? (
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              autoCorrect={false}
            />
          ) : null}
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => void submit()}
          />
        </View>

        {(localError ?? error) ? (
          <ThemedText style={styles.error}>{localError ?? error}</ThemedText>
        ) : null}

        <PrimaryButton
          title={mode === 'login' ? 'Log in' : 'Register'}
          onPress={() => void submit()}
          loading={busy}
          style={styles.submit}
        />

        <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switchRow}>
          <ThemedText style={styles.switchText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <ThemedText style={styles.switchLink}>
              {mode === 'login' ? 'Register' : 'Log in'}
            </ThemedText>
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      flexGrow: 1,
      padding: 24,
      gap: 20,
    },
    chrome: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    hero: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    heroAppName: {
      fontFamily: Fonts.displaySemibold,
      fontSize: 24,
      lineHeight: 32,
      marginTop: 8,
    },
    heroTagline: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'center',
    },
    form: {
      gap: 12,
    },
    error: {
      color: palette.coral,
      fontSize: 15,
      lineHeight: 22,
    },
    submit: {
      marginTop: 4,
    },
    switchRow: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    switchText: {
      color: palette.inkMuted,
      fontSize: 15,
    },
    switchLink: {
      color: palette.sky,
      fontFamily: Fonts.bodyBold,
    },
  });
}