import * as Haptics from 'expo-haptics';

/** Wraps a haptic feedback call so it respects the user's setting. */
export function haptic(
  type: 'selection' | 'light' | 'medium' | 'success' | 'warning',
  enabled: boolean,
): void {
  if (!enabled) return;
  switch (type) {
    case 'selection':
      void Haptics.selectionAsync();
      break;
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}
