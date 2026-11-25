import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Base id: each option is `${testID}-${value}`. */
  testID: string;
}

/** A single-choice group shown as selectable chips (a radio group for screen readers). */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  testID,
}: ChoiceGroupProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`${testID}-${option.value}`}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: {
    marginBottom: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: '#DBEAFE' },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextSelected: { color: '#1D4ED8', fontWeight: '600' },
});
