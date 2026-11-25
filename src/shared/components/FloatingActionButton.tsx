import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

interface FloatingActionButtonProps {
  label: string;
  onPress: () => void;
  /** Extra space under the button, e.g. the bottom safe-area inset. */
  bottomOffset?: number;
  testID?: string;
}

/** An extended button pinned to the bottom-right of its (positioned) parent. */
export function FloatingActionButton({
  label,
  onPress,
  bottomOffset = 0,
  testID,
}: FloatingActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: spacing.lg + bottomOffset },
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Text style={styles.plus}>+</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl - 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: { opacity: 0.9 },
  plus: {
    color: colors.onPrimary,
    fontSize: 24,
    lineHeight: 26,
    marginRight: spacing.sm,
  },
  label: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
