import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { Fonts, type PaletteType } from '@/constants/theme';
import { canAfford, type AffordVerdict } from '@/lib/budget';
import { categorize } from '@/lib/categories';
import { parseAmountOnly } from '@/lib/parser';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

const QUICK_CHECKS = [
  { label: 'Coffee', amount: 6 },
  { label: 'Headphones', amount: 120 },
  { label: 'Jacket', amount: 250 },
  { label: 'TV', amount: 600 },
  { label: 'Laptop', amount: 1200 },
];

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AskScreen() {
  const { snapshot, addTransaction, money, currency } = useBudget();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<AffordVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);
  const [category, setCategory] = useState('shopping');

  const runCheck = (raw?: string) => {
    const input = raw ?? text;
    if (!input.trim()) return;
    const amount = parseAmountOnly(input);
    if (amount === null) {
      setVerdict(null);
      setError("I couldn't find an amount. Try 'can I afford a 250 jacket?'");
      return;
    }
    setError(null);
    setLogged(false);
    setCategory(categorize(input, 'expense'));
    setVerdict(canAfford(snapshot, amount, currency.symbol));
  };

  const handleLogPurchase = () => {
    if (!verdict) return;
    addTransaction({
      type: 'expense',
      amount: verdict.cost,
      date: todayIso(),
      category,
      note: text.trim() || `Purchased for ${money(verdict.cost)}`,
    });
    setLogged(true);
    setText('');
    setVerdict(null);
  };

  const verdictBg = verdict?.affordable ? palette.leafSoft : palette.coralSoft;
  const verdictBorder = verdict?.affordable ? palette.leaf : palette.coral;
  const verdictColor = verdict?.affordable ? palette.leafDeep : palette.coral;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pico
              size={80}
              pose="can_i_afford_it"
              speech={
                error
                  ? "Pico: Enter an amount like '250 jacket' so I can calculate for you! 💡"
                  : "Ask Pico: Can I afford it? Type any item below!"
              }
              interactive
              speechPosition="right"
            />
          </View>

          <TextField
            big
            value={text}
            onChangeText={setText}
            placeholder="e.g. can I afford a 250 jacket?"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => runCheck()}
          />
          {error ? <ThemedText style={{ color: palette.coral }}>{error}</ThemedText> : null}
          <PrimaryButton title="Check with Pico" onPress={() => runCheck()} />

          <View style={styles.chips}>
            {QUICK_CHECKS.map((q) => (
              <Pressable
                key={q.label}
                onPress={() => {
                  const input = `can I afford a ${q.amount} ${q.label.toLowerCase()}?`;
                  setText(input);
                  runCheck(input);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.chipPressed,
                ]}>
                <ThemedText numberOfLines={1} style={styles.chipText}>
                  {q.label} · {money(q.amount)}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {verdict ? (
            <View style={[styles.verdictCard, { backgroundColor: verdictBg, borderColor: verdictBorder }]}>
              <View style={styles.verdictHeading}>
                <Pico
                  size={68}
                  pose={verdict.affordable ? 'thumbsup' : 'warning'}
                  speech={
                    verdict.affordable
                      ? "Pico says: You're good to go! Fits in your safe budget! 👍"
                      : "Pico says: A bit tight right now. Better save up! 💡"
                  }
                  speechPosition="right"
                />
              </View>
              <View style={styles.verdictDetails}>
                <ThemedText
                  type="title"
                  style={{ color: verdictColor, fontSize: 28, lineHeight: 36 }}>
                  {verdict.affordable ? 'Yes, you can!' : 'Not quite yet'}
                </ThemedText>
                <ThemedText style={[styles.verdictCost, { color: verdictColor }]}>
                  {money(verdict.cost)}
                </ThemedText>
                <ThemedText style={[styles.verdictMessage, { color: palette.inkMuted }]}>
                  {verdict.message}
                </ThemedText>
                <ThemedText style={[styles.haveLine, { color: palette.inkMuted }]}>
                  You have {money(verdict.safeToSpend)} safe to spend right now.
                </ThemedText>
              </View>
              {logged ? (
                <View style={styles.loggedPill}>
                  <ThemedText style={{ color: palette.leafDeep, fontSize: 16 }}>
                    ✓ Logged to your history by Pico!
                  </ThemedText>
                </View>
              ) : (
                <PrimaryButton
                  title="Log this purchase"
                  variant="leaf"
                  onPress={handleLogPurchase}
                />
              )}
            </View>
          ) : null}

          <Card>
            <ThemedText type="subtitle">How it works</ThemedText>
            <ThemedText style={[styles.howText, { color: palette.inkMuted }]}>
              Your money is everything you&apos;ve earned minus everything you&apos;ve
              spent. We check the purchase against that.
            </ThemedText>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
      maxWidth: 640,
      alignSelf: 'center',
      padding: 20,
      paddingBottom: 40,
      gap: 20,
    },
    header: {
      gap: 4,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexShrink: 0,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.skySoft,
    },
    chipPressed: {
      backgroundColor: palette.skyBright,
    },
    chipText: {
      color: palette.skyDeep,
      fontFamily: Fonts.bodyBold,
      fontSize: 16,
      lineHeight: 22,
    },
    verdictCard: {
      borderRadius: 20,
      borderWidth: 2,
      padding: 20,
      gap: 12,
    },
    verdictHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    verdictDetails: {
      gap: 6,
      marginTop: 4,
    },
    verdictIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verdictIconText: {
      color: '#FFFFFF',
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '700',
    },
    verdictCost: {
      fontFamily: Fonts.monoBold,
      fontSize: 24,
      lineHeight: 28,
    },
    verdictMessage: {
      fontSize: 17,
      lineHeight: 26,
    },
    haveLine: {
      fontSize: 16,
      lineHeight: 22,
    },
    loggedPill: {
      backgroundColor: palette.leafSoft,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignSelf: 'flex-start',
    },
    howText: {
      fontSize: 16,
      lineHeight: 24,
    },
  });
}