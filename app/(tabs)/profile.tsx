import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as StoreReview from 'expo-store-review';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { CURRENCIES } from '@/lib/currency';
import { formatDateIso } from '@/lib/format';
import { useToast } from '@/components/toast';
import {
  ADVANCE_DAY_OPTIONS,
  requestNotificationPermission,
  syncNotifications,
  type NotificationPrefs,
} from '@/lib/notifications';
import {
  canPurchase,
  getAvailablePlans,
  getManagementUrl,
  getSubscriptionDetails,
  isPremium,
  purchasePackage,
  restorePurchases,
  type AvailablePlans,
  type SubscriptionDetails,
} from '@/lib/purchases';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

export default function ProfileScreen() {
  const { palette, mode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, signOut, deleteAccount, updateName } = useAuth();
  const {
    transactions,
    snapshot,
    money,
    currency,
    setCurrency,
    resetOnboarding,
    notificationPrefs,
    setNotificationPrefs,
    recurring,
    hapticsEnabled,
    setHapticsEnabled,
    biometricEnabled,
    setBiometricEnabled,
  } = useBudget();
  const { showToast } = useToast();
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
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [plans, setPlans] = useState<AvailablePlans>({ monthly: null, annual: null });
  const [switchingPlan, setSwitchingPlan] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');

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
      if (isPro) {
        const available = await getAvailablePlans();
        if (mounted) setPlans(available);
      }
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
    await syncNotifications(next, recurring);
  };

  const changeAdvanceDays = async (days: number) => {
    const next: NotificationPrefs = { ...notificationPrefs, billAdvanceDays: days };
    setNotificationPrefs(next);
    await syncNotifications(next, recurring);
  };

  const handleRateApp = async () => {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      return;
    }
    const url = StoreReview.storeUrl();
    if (url) {
      await Linking.openURL(url);
      return;
    }
    showToast('Store review is not available on this device.', 'info');
  };

  const handleReferFriend = async () => {
    const message =
      'Come budget with me on Pico! 🐾 Your friendly money buddy that makes saving easy. Try it: https://pico.app';
    try {
      await Share.share({ message });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hardware || !enrolled) {
        showToast('Biometric unlock is not available on this device.', 'error');
        return;
      }
      setBiometricEnabled(true);
      showToast('Pico will lock behind Face ID or fingerprint.', 'ok');
      return;
    }
    setBiometricEnabled(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    setDeleteText('');
    setDeleteOpen(true);
  };

  const confirmDeleteAccount = () => {
    setDeleteOpen(false);
    setDeleteText('');
    void deleteAccount()
      .then(() => signOut())
      .catch(() => {
        Alert.alert('Could not delete account', 'Please try again later.');
      });
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

  const changePlan = async (period: 'monthly' | 'yearly') => {
    if (switchingPlan) return;
    const pkg = period === 'monthly' ? plans.monthly : plans.annual;
    if (!canPurchase || !pkg) {
      showToast(
        canPurchase ? 'This plan is not available right now.' : 'Purchases are unavailable on this device.',
        'error',
      );
      return;
    }
    setSwitchingPlan(true);
    setRestoredMsg(null);
    const outcome = await purchasePackage(pkg);
    setSwitchingPlan(false);
    if (outcome.status === 'purchased') {
      const [isPro, sub, url] = await Promise.all([
        isPremium(),
        getSubscriptionDetails(),
        getManagementUrl(),
      ]);
      setPremium(isPro);
      setDetails(sub);
      setManagementUrl(url);
      showToast('Subscription updated.', 'ok');
    } else if (outcome.status === 'error') {
      showToast(outcome.message, 'error');
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
                  placeholderTextColor={palette.inkFaint}
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
                  <IconSymbol name="pencil" size={16} color={palette.skyDeep} />
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

        <ThemedText style={styles.sectionLabel}>Subscription</ThemedText>

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
          {premium ? (
            <View style={styles.switchSection}>
              <ThemedText style={styles.switchLabel}>Change plan</ThemedText>
              <View style={styles.switchRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: details.planName === 'Monthly' }}
                  onPress={() => void changePlan('monthly')}
                  disabled={switchingPlan}
                  style={({ pressed }) => [
                    styles.switchOption,
                    pressed && styles.aboutPressed,
                  ]}>
                  <ThemedText style={styles.switchPrice}>
                    {plans.monthly?.product?.priceString ?? '$4.99'}
                  </ThemedText>
                  <ThemedText style={styles.switchPeriod}>per month</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: details.planName === 'Annual' }}
                  onPress={() => void changePlan('yearly')}
                  disabled={switchingPlan}
                  style={({ pressed }) => [
                    styles.switchOption,
                    pressed && styles.aboutPressed,
                  ]}>
                  <ThemedText style={styles.switchPrice}>
                    {plans.annual?.product?.priceString ?? '$29.99'}
                  </ThemedText>
                  <ThemedText style={styles.switchPeriod}>per year</ThemedText>
                </Pressable>
              </View>
              {switchingPlan ? (
                <ThemedText style={styles.switchHint}>Updating your subscription…</ThemedText>
              ) : (
                <ThemedText style={styles.switchHint}>
                  Switching plans applies store proration automatically.
                </ThemedText>
              )}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleRestore}
            style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutPressed]}>
            <IconSymbol name="arrow.counterclockwise" size={20} color={palette.inkSubtle} />
            <ThemedText style={styles.aboutText}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </ThemedText>
          </Pressable>
          {managementUrl ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(managementUrl)}
              style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutPressed]}>
              <IconSymbol name="creditcard.fill" size={20} color={palette.inkSubtle} />
              <ThemedText style={styles.aboutText}>Manage subscription</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={palette.inkFaint} />
            </Pressable>
          ) : null}
          {restoredMsg ? <ThemedText style={styles.restoreMsg}>{restoredMsg}</ThemedText> : null}
        </Card>

        <ThemedText style={styles.sectionLabel}>Settings</ThemedText>

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
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
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
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Investment reminders</ThemedText>
              <ThemedText style={styles.toggleHint}>For your recurring savings & investments</ThemedText>
            </View>
            <Switch
              value={notificationPrefs.investmentReminders}
              onValueChange={(v) => {
                void togglePref('investmentReminders')(v);
              }}
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
          <View style={styles.advanceRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Remind me</ThemedText>
              <ThemedText style={styles.toggleHint}>Days before a bill or investment is due</ThemedText>
            </View>
            <View style={styles.dayPills}>
              {ADVANCE_DAY_OPTIONS.map((d) => {
                const active = notificationPrefs.billAdvanceDays === d;
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityLabel={`${d} day${d === 1 ? '' : 's'} before`}
                    onPress={() => void changeAdvanceDays(d)}
                    style={({ pressed }) => [
                      styles.dayPill,
                      active && styles.dayPillActive,
                      pressed && styles.aboutPressed,
                    ]}>
                    <ThemedText style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                      {d}d
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <Card>
          <ThemedText type="subtitle">Currency</ThemedText>
          <ThemedText style={styles.currencyHint}>
            Display symbol only — amounts are never converted.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select currency, currently ${currency.label}`}
            onPress={() => setCurrencyOpen((o) => !o)}
            style={({ pressed }) => [
              styles.currencySelect,
              currencyOpen && styles.currencySelectOpen,
              pressed && styles.currencyRowPressed,
            ]}>
            <View style={styles.currencySelectLeft}>
              <ThemedText style={styles.currencySymbol}>{currency.symbol}</ThemedText>
              <ThemedText style={styles.currencyLabel} numberOfLines={1}>
                {currency.label}
              </ThemedText>
            </View>
            <ThemedText style={[styles.currencyChevron, currencyOpen && styles.currencyChevronOpen]}>
              ▾
            </ThemedText>
          </Pressable>
          {currencyOpen ? (
            <View style={styles.currencyList}>
              {CURRENCIES.map((c) => {
                const active = c.code === currency.code;
                return (
                  <Pressable
                    key={c.code}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                    onPress={() => {
                      setCurrency(c.code);
                      setCurrencyOpen(false);
                    }}
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
          ) : null}
        </Card>

        <Card>
          <ThemedText type="subtitle">Appearance</ThemedText>
          <ThemedText style={styles.currencyHint}>
            {mode === 'dark' ? 'Dark mode is on.' : 'Choose between light and dark.'}
          </ThemedText>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Dark mode</ThemedText>
              <ThemedText style={styles.toggleHint}>Easier on the eyes at night</ThemedText>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
        </Card>

        <Card>
          <ThemedText type="subtitle">Security</ThemedText>
          <ThemedText style={styles.currencyHint}>
            Keep your budget private from prying eyes.
          </ThemedText>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Biometric lock</ThemedText>
              <ThemedText style={styles.toggleHint}>Unlock with Face ID or fingerprint</ThemedText>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={(v) => {
                void toggleBiometric(v);
              }}
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
        </Card>

        <Card>
          <ThemedText type="subtitle">Feedback</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleRateApp()}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.aboutPressed]}>
            <IconSymbol name="star.fill" size={20} color={palette.sun} />
            <ThemedText style={styles.aboutText}>Rate the app</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={palette.inkFaint} />
          </Pressable>
          <View style={styles.settingsDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleReferFriend()}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.aboutPressed]}>
            <IconSymbol name="person.2.fill" size={20} color={palette.berry} />
            <ThemedText style={styles.aboutText}>Refer a friend</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={palette.inkFaint} />
          </Pressable>
        </Card>

        <Card>
          <ThemedText type="subtitle">General</ThemedText>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Haptics</ThemedText>
              <ThemedText style={styles.toggleHint}>Tactile feedback on taps</ThemedText>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
        </Card>

        <Card>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              resetOnboarding();
              router.replace('/onboarding');
            }}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.aboutPressed]}>
            <IconSymbol name="arrow.counterclockwise" size={20} color={palette.inkSubtle} />
            <ThemedText style={styles.aboutText}>Restart onboarding</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={palette.inkFaint} />
          </Pressable>

          <View style={styles.settingsDivider} />

          <Pressable
            accessibilityRole="button"
            onPress={handleDeleteAccount}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.aboutPressed]}>
            <IconSymbol name="trash.fill" size={20} color={palette.coral} />
            <ThemedText style={[styles.aboutText, styles.signOutText]}>Delete account</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={palette.inkFaint} />
          </Pressable>
        </Card>

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.aboutPressed]}>
          <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
          <ThemedText style={styles.signOutButtonText}>Sign out</ThemedText>
        </Pressable>

        <Modal
          visible={deleteOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <ThemedText type="subtitle">Delete your account?</ThemedText>
              <ThemedText style={styles.modalBody}>
                This permanently deletes your account and all your data. This cannot be undone.
              </ThemedText>
              <ThemedText style={styles.modalBody}>
                Type{' '}
                <ThemedText style={styles.modalCode}>DELETE</ThemedText>{' '}
                below to confirm.
              </ThemedText>
              <TextField
                value={deleteText}
                onChangeText={setDeleteText}
                placeholder="DELETE"
                placeholderTextColor={palette.inkFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (deleteText.trim().toUpperCase() === 'DELETE') confirmDeleteAccount();
                }}
              />
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeleteOpen(false)}
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.modalCancel,
                    pressed && styles.aboutPressed,
                  ]}>
                  <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={deleteText.trim().toUpperCase() !== 'DELETE'}
                  onPress={confirmDeleteAccount}
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.modalDelete,
                    deleteText.trim().toUpperCase() !== 'DELETE' && styles.modalDeleteDisabled,
                    pressed && styles.aboutPressed,
                  ]}>
                  <ThemedText style={styles.modalDeleteText}>DELETE</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
      padding: 20,
      paddingBottom: 40,
      gap: 20,
    },
    sectionLabel: {
      fontFamily: Fonts.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: palette.inkSubtle,
      marginTop: 4,
      marginBottom: -8,
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
      backgroundColor: palette.skySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontFamily: Fonts.display,
      fontSize: 28,
      lineHeight: 36,
      color: palette.skyDeep,
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
      color: palette.skyDeep,
      fontSize: 14,
      lineHeight: 18,
      fontFamily: 'Inter_600SemiBold',
    },
    nameEditor: {
      gap: 8,
    },
    nameError: {
      color: palette.coral,
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
      color: palette.inkMuted,
      fontSize: 15,
      lineHeight: 20,
    },
    email: {
      color: palette.inkMuted,
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
      color: palette.ink,
    },
    statLabel: {
      color: palette.inkSubtle,
      fontSize: 14,
      lineHeight: 18,
    },
    currencyHint: {
      color: palette.inkMuted,
      fontSize: 15,
      lineHeight: 20,
      marginTop: 2,
    },
    currencyList: {
      marginTop: 8,
      gap: 6,
    },
    currencySelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
    },
    currencySelectOpen: {
      borderColor: palette.sky,
      backgroundColor: palette.skySoft,
    },
    currencySelectLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    currencyChevron: {
      color: palette.inkSubtle,
      fontSize: 16,
      lineHeight: 20,
    },
    currencyChevronOpen: {
      color: palette.skyDeep,
      transform: [{ rotate: '180deg' }],
    },
    currencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
    },
    currencyRowActive: {
      borderColor: palette.sky,
      backgroundColor: palette.skySoft,
    },
    currencyRowPressed: {
      opacity: 0.7,
    },
    currencySymbol: {
      fontFamily: Fonts.monoBold,
      fontSize: 18,
      lineHeight: 24,
      color: palette.ink,
      width: 28,
      textAlign: 'center',
    },
    currencyLabel: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
    },
    currencyCheck: {
      color: palette.skyDeep,
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
      backgroundColor: palette.skyDeep,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    planBadgeText: {
      fontFamily: Fonts.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1,
      color: palette.surface,
    },
    planHint: {
      color: palette.inkMuted,
      fontSize: 15,
      lineHeight: 20,
    },
    planButton: {
      backgroundColor: palette.skyDeep,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 2,
    },
    planButtonText: {
      fontFamily: Fonts.bodyBold,
      fontSize: 16,
      color: palette.surface,
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
      color: palette.inkMuted,
    },
    subValue: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      color: palette.ink,
      textAlign: 'right',
      fontFamily: Fonts.mono,
    },
    restoreMsg: {
      color: palette.inkMuted,
      fontSize: 14,
      lineHeight: 18,
    },
    switchSection: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.outline,
      gap: 8,
    },
    switchLabel: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
      fontFamily: Fonts.bodyBold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    switchRow: {
      flexDirection: 'row',
      gap: 10,
    },
    switchOption: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.outline,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    switchPrice: {
      fontSize: 17,
      lineHeight: 22,
      color: palette.ink,
      fontFamily: Fonts.mono,
    },
    switchPeriod: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    switchHint: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.outline,
    },
    toggleText: {
      flex: 1,
      gap: 2,
    },
    toggleLabel: {
      fontFamily: Fonts.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
    },
    toggleHint: {
      color: palette.inkSubtle,
      fontSize: 14,
      lineHeight: 18,
    },
    advanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
    },
    dayPills: {
      flexDirection: 'row',
      gap: 6,
    },
    dayPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
    },
    dayPillActive: {
      borderColor: palette.sky,
      backgroundColor: palette.skySoft,
    },
    dayPillText: {
      fontFamily: Fonts.monoBold,
      fontSize: 14,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    dayPillTextActive: {
      color: palette.skyDeep,
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    settingsDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.outline,
    },
    signOutText: {
      color: palette.coral,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: palette.coral,
    },
    signOutButtonText: {
      fontSize: 16,
      fontFamily: Fonts.bodyBold,
      color: '#FFFFFF',
    },
    aboutPressed: {
      opacity: 0.6,
    },
    aboutText: {
      flex: 1,
      fontSize: 16,
      color: palette.inkMuted,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: palette.surface,
      borderRadius: 20,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: palette.outline,
    },
    modalBody: {
      fontSize: 15,
      lineHeight: 21,
      color: palette.inkMuted,
    },
    modalCode: {
      fontFamily: Fonts.monoBold,
      color: palette.coral,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    modalButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
    },
    modalCancel: {
      backgroundColor: palette.surfaceSunken,
    },
    modalCancelText: {
      fontSize: 16,
      fontFamily: Fonts.bodyBold,
      color: palette.ink,
    },
    modalDelete: {
      backgroundColor: palette.coral,
    },
    modalDeleteDisabled: {
      opacity: 0.4,
    },
    modalDeleteText: {
      fontSize: 16,
      fontFamily: Fonts.bodyBold,
      color: '#FFFFFF',
    },
  });
}
