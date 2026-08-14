import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { useToast } from '@/components/toast';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/lib/theme';

type SRModule = (typeof import('expo-speech-recognition'))['ExpoSpeechRecognitionModule'];

let cachedModule: SRModule | null | undefined;

/**
 * Loaded lazily so Node static rendering and unsupported platforms
 * never execute the speech-recognition module.
 */
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

type Props = {
  existingText: string;
  onTranscript: (text: string) => void;
  onState?: (state: { listening: boolean; message: string | null }) => void;
};

/**
 * A round mic button that turns dictation into text in the note field.
 * Uses on-device / browser speech recognition via expo-speech-recognition.
 */
export function DictationButton({ existingText, onTranscript, onState }: Props) {
  const [listening, setListening] = useState(false);
  const { showToast } = useToast();
  const { palette } = useAppTheme();

  const existingRef = useRef(existingText);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const setState = useCallback(
    (state: { listening: boolean; message: string | null }) => {
      setListening(state.listening);
      onState?.(state);
    },
    [onState],
  );

  const fail = useCallback(
    (message: string) => {
      setListening(false);
      onState?.({ listening: false, message: null });
      showToast(message, 'error');
    },
    [onState, showToast],
  );

  useEffect(() => {
    existingRef.current = existingText;
  }, [existingText]);

  useEffect(() => {
    let disposed = false;
    let subs: { remove(): void }[] = [];

    (async () => {
      const module = await loadModule();
      if (disposed) return;
      if (!module) return;

      const onResult = (ev: {
        isFinal?: boolean;
        results?: { transcript?: string }[];
      }) => {
        // Interim results are partial and self-correcting — commit only the
        // final transcript so the field doesn't flicker with half-words.
        if (!ev.isFinal) return;
        const transcript = ev.results?.[0]?.transcript ?? '';
        if (!transcript.trim()) return;
        onTranscriptRef.current(`${existingRef.current} ${transcript}`.trim());
      };
      const onError = (ev: { error?: string }) => {
        let message = 'Dictation stopped.';
        if (ev.error === 'not-allowed') message = 'Microphone permission is off.';
        else if (ev.error === 'no-speech') message = "I didn't hear anything — try again.";
        else if (ev.error === 'network') message = 'Dictation needs the network (or localhost).';
        fail(message);
      };
      const onEnd = () => setState({ listening: false, message: null });

      subs.push(module.addListener('result', onResult));
      subs.push(module.addListener('error', onError));
      subs.push(module.addListener('end', onEnd));
    })();

    return () => {
      disposed = true;
      subs.forEach((s) => s.remove());
    };
  }, [setState, fail]);

  const toggle = async () => {
    const module = await loadModule();
    if (!module) {
      fail('Dictation is not available here.');
      return;
    }
    if (listening) {
      try {
        module.stop();
      } catch {}
      setState({ listening: false, message: null });
      return;
    }
    setState({ listening: true, message: null });
    try {
      const perm = await module.requestPermissionsAsync();
      if (perm && !perm.granted) {
        fail('Microphone permission is off.');
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
          'groceries',
          'coffee',
          'rent',
        ],
      });
    } catch {
      fail('Could not start dictation.');
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop listening' : 'Dictate'}
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <IconSymbol
        name="mic.fill"
        size={24}
        color={listening ? palette.coral : palette.inkMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});