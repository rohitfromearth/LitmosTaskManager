import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `primary` is filled; `secondary` and `danger` are outlined. */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Shows a spinner and ignores presses. */
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

/** A full-width button. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const textColor =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'danger'
      ? colors.danger
      : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={textColor} style={styles.spinner} />
      ) : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger },
  inactive: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  spinner: { marginRight: spacing.sm },
  label: { fontSize: 16, fontWeight: '600' },
});
