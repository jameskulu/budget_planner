import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, Palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CURRENCIES } from '@/lib/currency';
import { formatDateIso } from '@/lib/format';
import {
  requestNotificationPermission,
  syncNotifications,
  type NotificationPrefs,
} from '@/lib/notifications';
import {
  getManagementUrl,
  getSubscriptionDetails,
  isPremium,
  restorePurchases,
  type SubscriptionDetails,
} from '@/lib/purchases';
import { useBudget } from '@/lib/store';

export default function ProfileScreen() {
  const { user, signOut, updateName } = useAuth();
  const {
    transactions,
    snapshot,
    money,
    currency,
    setCurrency,
    resetOnboarding,
    notificationPrefs,
    setNotificationPrefs,
  } = useBudget();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [details, setDetails] = useState<SubscriptionDetails>({
    active: false,
    productId: null,
    planName: null,
    expiresAt: null,
    willRenew: false,
  });
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoredMsg, setRestoredMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [isPro, sub, url] = await Promise.all([
        isPremium(),
        getSubscriptionDetails(),
        getManagementUrl(),
      ]);
      if (!mounted) return;
      setPremium(isPro);
      setDetails(sub);
      setManagementUrl(url);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const email = user?.email ?? 'guest';
  const name = user?.user_metadata?.full_name ?? email.split('@')[0] ?? 'Guest';
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  const initial = (name[0] ?? 'G').toUpperCase();

  const startEditingName = () => {
    setNameDraft(name);
    setNameError(null);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Enter your name.');
      return;
    }
    await updateName(trimmed);
    setEditingName(false);
    setNameError(null);
  };

  const stats = [
    { label: 'Balance', value: money(snapshot.balance) },
    { label: 'Earned this month', value: money(snapshot.monthIncome) },
    { label: 'Spent this month', value: money(snapshot.monthSpent) },
    { label: 'Transactions', value: String(transactions.length) },
  ];

  const togglePref = (key: keyof NotificationPrefs) => async (value: boolean) => {
    const next: NotificationPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotificationPrefs({ ...next, [key]: false });
        return;
      }
    }
    await syncNotifications(next);
  };

  const handleRestore = async () => {
    setRestoring(true);
    setRestoredMsg(null);
    const active = await restorePurchases();
    setRestoring(false);
    if (active) {
      setPremium(true);
      setRestoredMsg('Purchases restored.');
    } else {
      setRestoredMsg('No previous purchase was found to restore.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Profile</ThemedText>

        <Card style={styles.headerCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <ThemedText style={styles.avatarInitial}>{initial}</ThemedText>
            </View>
          )}
          <View style={styles.identity}>
            {editingName ? (
              <View style={styles.nameEditor}>
                <TextField
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Your name"
                  placeholderTextColor={Palette.inkFaint}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => void saveName()}
                />
                {nameError ? <ThemedText style={styles.nameError}>{nameError}</ThemedText> : null}
                <View style={styles.nameActions}>
                  <PrimaryButton title="Save" onPress={() => void saveName()} style={styles.nameButton} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditingName(false)}
                    style={({ pressed }) => [styles.nameCancel, pressed && styles.aboutPressed]}>
                    <ThemedText style={styles.nameCancelText}>Cancel</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <ThemedText type="subtitle" numberOfLines={1}>
                  {name}
                </ThemedText>
                <ThemedText style={styles.email} numberOfLines={1}>
                  {email}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit name"
                  onPress={startEditingName}
                  style={({ pressed }) => [styles.editNameRow, pressed && styles.aboutPressed]}>
                  <IconSymbol name="pencil" size={16} color={Palette.skyDeep} />
                  <ThemedText style={styles.editNameText}>Edit name</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <ThemedText style={styles.statValue}>{s.value}</ThemedText>
                <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planBadge}>
              <ThemedText style={styles.planBadgeText}>{premium ? 'PREMIUM' : 'FREE'}</ThemedText>
            </View>
            <ThemedText type="subtitle">Subscription</ThemedText>
          </View>
          <ThemedText style={styles.planHint}>
            {premium
              ? 'You are on the premium plan. Enjoy every feature.'
              : 'Upgrade to premium for the full Pico experience.'}
          </ThemedText>
          {premium ? (
            <View style={styles.subDetails}>
              {details.planName ? (
                <View style={styles.subRow}>
                  <ThemedText style={styles.subKey}>Plan</ThemedText>
                  <ThemedText style={styles.subValue} numberOfLines={1}>
                    {details.planName}
                  </ThemedText>
                </View>
              ) : null}
              {details.expiresAt ? (
                <View style={styles.subRow}>
                  <ThemedText style={styles.subKey}>
                    {details.willRenew ? 'Renews' : 'Expires'}
                  </ThemedText>
                  <ThemedText style={styles.subValue}>
                    {formatDateIso(details.expiresAt)}
                  </ThemedText>
                </View>
              ) : null}
              {details.productId ? (
                <View style={styles.subRow}>
                  <ThemedText style={styles.subKey}>Product</ThemedText>
                  <ThemedText style={styles.subValue} numberOfLines={1}>
                    {details.productId}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/onboarding?step=14')}
              style={({ pressed }) => [styles.planButton, pressed && styles.aboutPressed]}>
              <ThemedText style={styles.planButtonText}>Upgrade to premium</ThemedText>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={handleRestore}
            style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutPressed]}>
            <IconSymbol name="arrow.counterclockwise" size={20} color={Palette.inkSubtle} />
            <ThemedText style={styles.aboutText}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </ThemedText>
          </Pressable>
          {managementUrl ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(managementUrl)}
              style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutPressed]}>
              <IconSymbol name="creditcard.fill" size={20} color={Palette.inkSubtle} />
              <ThemedText style={styles.aboutText}>Manage subscription</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={Palette.inkFaint} />
            </Pressable>
          ) : null}
          {restoredMsg ? <ThemedText style={styles.restoreMsg}>{restoredMsg}</ThemedText> : null}
        </Card>

        <Card>
          <ThemedText type="subtitle">Notifications</ThemedText>
          <ThemedText style={styles.currencyHint}>
            Pico reminds you when it matters.
          </ThemedText>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Daily reminder</ThemedText>
              <ThemedText style={styles.toggleHint}>Your safe-to-spend each morning</ThemedText>
            </View>
            <Switch
              value={notificationPrefs.dailyReminder}
              onValueChange={(v) => {
                void togglePref('dailyReminder')(v);
              }}
              trackColor={{ true: Palette.skyDeep, false: Palette.outline }}
              thumbColor={Palette.surface}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Bill reminders</ThemedText>
              <ThemedText style={styles.toggleHint}>A nudge before bills are due</ThemedText>
            </View>
            <Switch
              value={notificationPrefs.billReminders}
              onValueChange={(v) => {
                void togglePref('billReminders')(v);
              }}
              trackColor={{ true: Palette.skyDeep, false: Palette.outline }}
              thumbColor={Palette.surface}
            />
          </View>
        </Card>

        <Card>
          <ThemedText type="subtitle">Currency</ThemedText>
          <ThemedText style={styles.currencyHint}>
            Display symbol only — amounts are never converted.
          </ThemedText>
          <View style={styles.currencyList}>
            {CURRENCIES.map((c) => {
              const active = c.code === currency.code;
              return (
                <Pressable
                  key={c.code}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  onPress={() => setCurrency(c.code)}
                  style={({ pressed }) => [
                    styles.currencyRow,
                    active && styles.currencyRowActive,
                    pressed && styles.currencyRowPressed,
                  ]}>
                  <ThemedText style={styles.currencySymbol}>{c.symbol}</ThemedText>
                  <ThemedText style={styles.currencyLabel} numberOfLines={1}>
                    {c.label}
                  </ThemedText>
                  {active ? <ThemedText style={styles.currencyCheck}>✓</ThemedText> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutPressed]}>
          <IconSymbol name="person.fill" size={20} color={Palette.inkSubtle} />
          <ThemedText style={styles.aboutText}>About Budget Planner</ThemedText>
          <IconSymbol name="chevron.right" size={20} color={Palette.inkFaint} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding');
          }}
          style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutPressed]}>
          <IconSymbol name="arrow.counterclockwise" size={20} color={Palette.inkSubtle} />
          <ThemedText style={styles.aboutText}>Restart onboarding</ThemedText>
          <IconSymbol name="chevron.right" size={20} color={Palette.inkFaint} />
        </Pressable>

        <PrimaryButton title="Sign out" variant="coral" onPress={signOut} />
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
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
    color: Palette.skyDeep,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  editNameText: {
    color: Palette.skyDeep,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  nameEditor: {
    gap: 8,
  },
  nameError: {
    color: Palette.coral,
    fontSize: 14,
    lineHeight: 18,
  },
  nameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameButton: {
    minHeight: 40,
    paddingHorizontal: 18,
  },
  nameCancel: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  nameCancelText: {
    color: Palette.inkMuted,
    fontSize: 15,
    lineHeight: 20,
  },
  email: {
    color: Palette.inkMuted,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  stat: {
    width: '50%',
    gap: 2,
  },
  statValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 20,
    lineHeight: 26,
    color: Palette.ink,
  },
  statLabel: {
    color: Palette.inkSubtle,
    fontSize: 14,
    lineHeight: 18,
  },
  currencyHint: {
    color: Palette.inkMuted,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  currencyList: {
    marginTop: 8,
    gap: 6,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
  },
  currencyRowActive: {
    borderColor: Palette.sky,
    backgroundColor: Palette.skySoft,
  },
  currencyRowPressed: {
    opacity: 0.7,
  },
  currencySymbol: {
    fontFamily: Fonts.monoBold,
    fontSize: 18,
    lineHeight: 24,
    color: Palette.ink,
    width: 28,
    textAlign: 'center',
  },
  currencyLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: Palette.ink,
  },
  currencyCheck: {
    color: Palette.skyDeep,
    fontSize: 18,
    lineHeight: 22,
  },
  planCard: {
    gap: 10,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planBadge: {
    backgroundColor: Palette.skyDeep,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    color: Palette.surface,
  },
  planHint: {
    color: Palette.inkMuted,
    fontSize: 15,
    lineHeight: 20,
  },
  planButton: {
    backgroundColor: Palette.skyDeep,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  planButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Palette.surface,
  },
  subDetails: {
    gap: 8,
    marginTop: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subKey: {
    fontSize: 15,
    lineHeight: 20,
    color: Palette.inkMuted,
  },
  subValue: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: Palette.ink,
    textAlign: 'right',
    fontFamily: Fonts.mono,
  },
  restoreMsg: {
    color: Palette.inkMuted,
    fontSize: 14,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.outline,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    color: Palette.ink,
  },
  toggleHint: {
    color: Palette.inkSubtle,
    fontSize: 14,
    lineHeight: 18,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  aboutPressed: {
    opacity: 0.6,
  },
  aboutText: {
    flex: 1,
    fontSize: 16,
    color: Palette.inkMuted,
  },
});
