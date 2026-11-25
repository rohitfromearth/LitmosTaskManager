import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../theme/theme';

interface BadgeProps {
  label: string;
  textColor: string;
  backgroundColor: string;
  /** Shows a small colored dot before the label. */
  showDot?: boolean;
  testID?: string;
}

/** A small pill with a label, used for status and priority. */
export function Badge({
  label,
  textColor,
  backgroundColor,
  showDot = false,
  testID,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor }]} testID={testID}>
      {showDot && <View style={[styles.dot, { backgroundColor: textColor }]} />}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  label: { fontSize: 12, fontWeight: '600' },
});
