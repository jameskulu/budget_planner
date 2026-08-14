import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, Palette } from '@/constants/theme';
import { parseNote } from '@/lib/parser';
import { useBudget } from '@/lib/store';

type SRModule = (typeof import('expo-speech-recognition'))['ExpoSpeechRecognitionModule'];

let cachedModule: SRModule | null | undefined;

async function loadModule(): Promise<SRModule | null> {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    cachedModule = null;
    return null;
  }
  try {
    const mod = await import('expo-speech-recognition');
    cachedModule = mod.ExpoSpeechRecognitionModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/**
 * Raised, centered record button in the tab bar. It listens for a spoken
 * money note ("spent 45 on groceries") and logs the parsed transactions
 * straight into the budget — no text field needed.
 */
export function RecordFab() {
  const { addTransaction, addNote, money } = useBudget();
  const { showToast } = useToast();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<{ message: string; tone: 'ok' | 'error' | 'info' } | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const showStatus = useCallback(
    (message: string, tone: 'ok' | 'error' | 'info') => {
      // Errors surface as a global toast; success/info keep the inline bubble.
      if (tone === 'error') {
        setStatus(null);
        showToast(message, 'error');
        return;
      }
      setStatus({ message, tone });
    },
    [showToast],
  );

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );
    if (listening) {
      pulse.setValue(0);
      anim.start();
    }
    return () => anim.stop();
  }, [listening, pulse]);

  const handleTranscript = useCallback(
    (transcript: string) => {
      if (!transcript.trim()) return;
      const result = parseNote(transcript);
      if (!result.ok) {
        showStatus(result.error, 'error');
        return;
      }
      const count = result.parsed.length;
      const added = result.parsed.filter((p) => addTransaction(p)).length;
      if (added === 0) {
        // Guest (pre-auth) fallback: addNote keeps the app usable.
        addNote(transcript);
        showStatus(count > 1 ? `Logged ${count} transactions!` : 'Got it! Added to your log.', 'ok');
        return;
      }
      const first = result.parsed[0];
      const sign = first.type === 'income' ? '+' : '-';
      showStatus(
        added > 1
          ? `Logged ${added} transactions!`
          : `${sign}${money(first.amount)} · ${first.category}`,
        'ok',
      );
    },
    [addNote, addTransaction, money, showStatus],
  );

  useEffect(() => {
    let disposed = false;
    let subs: { remove(): void }[] = [];

    (async () => {
      const module = await loadModule();
      if (disposed || !module) return;

      const onResult = (ev: { isFinal?: boolean; results?: { transcript?: string }[] }) => {
        if (!ev.isFinal) return;
        const transcript = ev.results?.[0]?.transcript ?? '';
        setListening(false);
        if (transcript.trim()) handleTranscript(transcript);
      };
      const onError = (ev: { error?: string }) => {
        setListening(false);
        let message = 'Dictation stopped.';
        if (ev.error === 'not-allowed') message = 'Microphone permission is off.';
        else if (ev.error === 'no-speech') message = "I didn't hear anything — try again.";
        else if (ev.error === 'network') message = 'Dictation needs the network (or localhost).';
        showStatus(message, 'error');
      };
      const onEnd = () => setListening(false);

      subs.push(module.addListener('result', onResult));
      subs.push(module.addListener('error', onError));
      subs.push(module.addListener('end', onEnd));
    })();

    return () => {
      disposed = true;
      subs.forEach((s) => s.remove());
    };
  }, [handleTranscript, showStatus]);

  const toggle = async () => {
    const module = await loadModule();
    if (!module) {
      showStatus('Dictation is not available here.', 'error');
      return;
    }
    if (listening) {
      try {
        module.stop();
      } catch {}
      setListening(false);
      return;
    }
    setStatus(null);
    setListening(true);
    showStatus('Listening… say it!', 'info');
    try {
      const perm = await module.requestPermissionsAsync();
      if (perm && !perm.granted) {
        setListening(false);
        showStatus('Microphone permission is off.', 'error');
        return;
      }
    } catch {}
    try {
      module.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        contextualStrings: [
          'spent',
          'bought',
          'paid',
          'salary',
          'received',
          'got paid',
          'groceries',
          'coffee',
          'rent',
        ],
      });
    } catch {
      setListening(false);
      showStatus('Could not start dictation.', 'error');
    }
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const statusColor =
    status?.tone === 'ok'
      ? Palette.leafDeep
      : status?.tone === 'error'
        ? Palette.coral
        : Palette.skyDeep;

  return (
    <View style={styles.wrap}>
      <View style={styles.fabArea}>
        {listening ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Stop listening' : 'Record spending or income'}
          onPress={toggle}
          style={({ pressed }) => [
            styles.fab,
            listening && styles.fabListening,
            pressed && styles.pressed,
          ]}>
          <IconSymbol name="mic.fill" size={30} color={listening ? '#FFFFFF' : Palette.surface} />
        </Pressable>
      </View>
      {status ? (
        <View style={styles.statusBubble}>
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {status.message}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fabArea: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabListening: {
    backgroundColor: Palette.coral,
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.coral,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  statusBubble: {
    position: 'absolute',
    bottom: 4,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statusText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});