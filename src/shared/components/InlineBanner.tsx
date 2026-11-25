import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/theme';

interface InlineBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** The action is `${testID}-action`. */
  testID?: string;
}

/** A compact error strip with an optional action, shown above content that is still usable. */
export function InlineBanner({
  message,
  actionLabel,
  onAction,
  testID,
}: InlineBannerProps) {
  return (
    <View style={styles.banner} accessibilityRole="alert" testID={testID}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          testID={testID ? `${testID}-action` : undefined}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.dangerSurface,
  },
  message: { flex: 1, fontSize: 14, color: colors.danger },
  action: { fontSize: 14, fontWeight: '700', color: colors.danger },
});
