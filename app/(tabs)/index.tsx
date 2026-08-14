import { router } from 'expo-router';
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
import { DictationButton } from '@/components/dictation-button';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/transaction-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextField } from '@/components/ui/text-field';
import { Fonts, Palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CATEGORY_MAP } from '@/lib/categories';
import { formatDateIso } from '@/lib/format';
import { parseNote } from '@/lib/parser';
import { useBudget } from '@/lib/store';

export default function OverviewScreen() {
  const { user } = useAuth();
  const { snapshot, transactions, monthly, addNote, deleteTransaction, money } = useBudget();

  const userName =
    user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? null;

  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dictState, setDictState] = useState<{ listening: boolean; message: string | null }>({
    listening: false,
    message: null,
  });

  const preview = useMemo(() => (note.trim() ? parseNote(note) : null), [note]);
  const recent = useMemo(() => transactions.slice(0, 6), [transactions]);

  const safeSpendAmount = snapshot.safeToSpend ?? Math.max(0, snapshot.balance);
  const spentRatio = snapshot.monthIncome > 0
    ? Math.min(1, snapshot.monthSpent / snapshot.monthIncome)
    : 0.45;
  const progressPercent = `${Math.min(100, Math.max(10, Math.round((1 - spentRatio) * 100)))}%` as const;

  const handleAddNote = () => {
    if (!note.trim()) return;
    const result = addNote(note);
    if (result.ok) {
      setNote('');
      setFeedback(result.parsed.length > 1 ? `Logged ${result.parsed.length} transactions!` : 'Got it! Added to your log.');
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          {/* Top Navigation Row */}
          <View style={styles.topNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menu"
              onPress={() => router.push('/profile')}
              style={styles.navButton}>
              <IconSymbol name="line.3.horizontal" size={22} color={Palette.ink} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => router.push('/notifications')}
              style={styles.navButton}>
              <IconSymbol name="bell.fill" size={20} color={Palette.ink} />
            </Pressable>
          </View>

          {/* Hero Greeting Section with Pico */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextGroup}>
              <ThemedText style={styles.greetingSub}>
                {userName ? `Hey there, ${userName}! 👋` : 'Hey there! 👋'}
              </ThemedText>
              <ThemedText style={styles.greetingTitle}>You&apos;re on track!</ThemedText>
            </View>
            <View style={styles.peekingWrapper}>
              <Pico size={170} pose="peeking" />
            </View>
          </View>

          {/* "You can safely spend" Card */}
          <View style={styles.safeSpendCard}>
            <ThemedText style={styles.safeSpendLabel}>You can safely spend</ThemedText>
            <ThemedText style={styles.safeSpendAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {money(safeSpendAmount)}
            </ThemedText>
            <ThemedText style={styles.safeSpendUnit}>today</ThemedText>
            {snapshot.reservedForBills > 0 ? (
              <ThemedText style={styles.safeSpendReserved}>
                {money(snapshot.reservedForBills)} set aside for bills & investments
              </ThemedText>
            ) : null}

            {/* Progress Track & Smiley Emoji */}
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressPercent }]} />
              </View>
              <ThemedText style={styles.smileyEmoji}>😃</ThemedText>
            </View>
          </View>

          {/* "This Month" Breakdown Card */}
          <View style={styles.thisMonthCard}>
            <ThemedText style={styles.thisMonthTitle}>This month</ThemedText>

            <View style={styles.summaryRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#E2F3E5' }]}>
                  <ThemedText style={{ fontSize: 18 }}>👛</ThemedText>
                </View>
                <ThemedText style={styles.rowLabel}>Income</ThemedText>
              </View>
              <ThemedText style={[styles.rowValue, { color: '#2D7A41' }]}>
                {money(snapshot.monthIncome)}
              </ThemedText>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FDEAE8' }]}>
                  <ThemedText style={{ fontSize: 18 }}>📕</ThemedText>
                </View>
                <ThemedText style={styles.rowLabel}>Spent</ThemedText>
              </View>
              <ThemedText style={[styles.rowValue, { color: '#2B303A' }]}>
                {money(snapshot.monthSpent)}
              </ThemedText>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                  <ThemedText style={{ fontSize: 18 }}>📈</ThemedText>
                </View>
                <ThemedText style={styles.rowLabel}>Invested</ThemedText>
              </View>
              <ThemedText style={[styles.rowValue, { color: '#7C3AED' }]}>
                {money(snapshot.monthInvested)}
              </ThemedText>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#FDEAE8' }]}>
                  <ThemedText style={{ fontSize: 18 }}>🐷</ThemedText>
                </View>
                <ThemedText style={styles.rowLabel}>Saved</ThemedText>
              </View>
              <ThemedText style={[styles.rowValue, { color: '#2D7A41' }]}>
                {money(Math.max(0, snapshot.monthIncome - snapshot.monthSpent - snapshot.monthInvested))}
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/plan')}
              style={({ pressed }) => [styles.planLink, pressed && styles.planLinkPressed]}>
              <ThemedText style={styles.planLinkText}>
                Monthly recurring income & bills
              </ThemedText>
              <IconSymbol name="chevron.right" size={18} color={Palette.inkSubtle} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/insights')}
              style={({ pressed }) => [styles.planLink, pressed && styles.planLinkPressed]}>
              <ThemedText style={styles.planLinkText}>View all insights</ThemedText>
              <IconSymbol name="chevron.right" size={18} color={Palette.inkSubtle} />
            </Pressable>
          </View>

          {/* Natural Language Logging */}
          <Card>
            <ThemedText type="subtitle">What happened?</ThemedText>
            <ThemedText style={{ color: Palette.inkMuted, fontSize: 16, lineHeight: 22 }}>
              Write it in plain words — Pico sorts out the rest.
            </ThemedText>
            <TextField
              big
              value={note}
              onChangeText={setNote}
              placeholder="e.g. spent 45 on groceries, got paid 500 salary"
              placeholderTextColor={Palette.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleAddNote}
              right={
                <DictationButton
                  existingText={note}
                  onTranscript={setNote}
                  onState={setDictState}
                />
              }
            />
            {dictState.listening ? (
              <ThemedText style={styles.dictHint}>Listening… say it. Tap the mic to stop.</ThemedText>
            ) : dictState.message ? (
              <ThemedText style={[styles.dictHint, { color: Palette.coral }]}>
                {dictState.message}
              </ThemedText>
            ) : null}
            {preview ? (
              <View style={styles.previewList}>
                {preview.ok ? (
                  preview.parsed.map((p, i) => (
                    <View key={i} style={styles.preview}>
                      <View
                        style={[
                          styles.previewDot,
                          { backgroundColor: CATEGORY_MAP[p.category]?.color ?? Palette.inkSubtle },
                        ]}
                      />
                      <ThemedText style={{ flex: 1, fontSize: 16, lineHeight: 22 }}>
                        <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
                          {p.type === 'income' ? '+' : '-'}
                          {money(p.amount)}
                        </ThemedText>{' '}
                        {CATEGORY_MAP[p.category]?.label} · {formatDateIso(p.date)}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <ThemedText style={{ color: Palette.coral, fontSize: 16 }}>
                    {preview.error}
                  </ThemedText>
                )}
              </View>
            ) : null}
            {feedback ? (
              <ThemedText style={{ color: Palette.sky, fontSize: 16 }}>{feedback}</ThemedText>
            ) : null}
            <PrimaryButton title="Add" onPress={handleAddNote} />
          </Card>

          {/* Recent Activity */}
          <Card>
            <ThemedText type="subtitle">Recent</ThemedText>
            {recent.length === 0 ? (
              <ThemedText style={{ color: Palette.inkSubtle }}>
                Nothing yet — write your first note above.
              </ThemedText>
            ) : (
              recent.map((t) => (
                <TransactionRow key={t.id} transaction={t} onDelete={deleteTransaction} />
              ))
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  content: {
    padding: 20,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 16,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -30,
    marginBottom: -8,
    zIndex: 10,
  },
  heroTextGroup: {
    gap: 4,
    paddingBottom: 8,
  },
  greetingSub: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2B303A',
    fontFamily: 'Inter_600SemiBold',
  },
  greetingTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: Fonts.display,
    color: '#1B1F28',
  },
  peekingWrapper: {
    marginRight: 8,
    marginBottom: -46,
  },
  safeSpendCard: {
    backgroundColor: '#E5F1E8',
    borderRadius: 24,
    padding: 22,
    gap: 6,
  },
  safeSpendLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: '#3B684A',
    fontFamily: 'Inter_600SemiBold',
  },
  safeSpendAmount: {
    fontSize: 52,
    lineHeight: 60,
    fontFamily: Fonts.monoBold,
    color: '#226035',
    letterSpacing: -1,
  },
  safeSpendUnit: {
    fontSize: 15,
    lineHeight: 20,
    color: '#3B684A',
    fontFamily: 'Inter_600SemiBold',
  },
  safeSpendReserved: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3B684A',
    fontFamily: 'Inter_500Medium',
    opacity: 0.85,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8E2CF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#226035',
    borderRadius: 4,
  },
  smileyEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  thisMonthCard: {
    backgroundColor: '#FFFBF6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFE8DE',
    padding: 20,
    gap: 14,
  },
  thisMonthTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts.display,
    color: '#1B1F28',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#1B1F28',
  },
  rowValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 17,
    lineHeight: 22,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EFE8DE',
  },
  planLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EFE8DE',
  },
  planLinkPressed: {
    opacity: 0.6,
  },
  planLinkText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#3B684A',
  },
  previewList: {
    gap: 8,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dictHint: {
    fontSize: 15,
    lineHeight: 20,
    color: Palette.inkMuted,
  },
});