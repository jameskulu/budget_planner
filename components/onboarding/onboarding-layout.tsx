import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/onboarding/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/theme';

type OnboardingLayoutProps = {
  title?: string;
  subtitle?: string;
  /** 0..1 — shown as the progress bar when provided. */
  progress?: number;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
};

/**
 * Shared onboarding screen chrome: safe area, optional back button, progress
 * bar, scrollable body, and a sticky footer for primary actions.
 */
export function OnboardingLayout({
  title,
  subtitle,
  progress,
  children,
  footer,
  onBack,
}: OnboardingLayoutProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.chrome}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={onBack}>
            <IconSymbol name="chevron.left" size={24} color={Palette.ink} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {progress !== undefined ? (
          <View style={styles.progressWrap}>
            <ProgressBar progress={progress} />
          </View>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {title ? <ThemedText type="title" style={styles.title}>{title}</ThemedText> : null}
          {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backPlaceholder: {
    width: 24,
  },
  progressWrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
  },
  title: {
    fontSize: 30,
  },
  subtitle: {
    color: Palette.inkMuted,
    fontSize: 17,
    lineHeight: 26,
    marginTop: -12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.outline,
    backgroundColor: Palette.background,
    gap: 8,
  },
});
