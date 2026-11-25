import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'multiline'
    | 'editable'
    | 'placeholder'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'autoComplete'
    | 'keyboardType'
    | 'secureTextEntry'
    | 'returnKeyType'
  > {
  label: string;
  required?: boolean;
  /** Message shown under the field; also turns the border red. */
  error?: string;
  /** Shows "current/max" under the field, red when over the limit. */
  counter?: { current: number; max: number };
  /** Base id: the input is `${testID}-input`, the error `${testID}-error`. */
  testID: string;
}

/** A labeled text input with an inline error message and optional character counter. */
export function TextField({
  label,
  required = false,
  error,
  counter,
  testID,
  multiline,
  editable = true,
  ...inputProps
}: TextFieldProps) {
  const overLimit = counter ? counter.current > counter.max : false;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        editable={editable}
        accessibilityLabel={required ? `${label}, required` : label}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline && styles.multiline,
          !!error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
        testID={`${testID}-input`}
      />
      <View style={styles.meta}>
        {error ? (
          <Text
            style={styles.error}
            accessibilityRole="alert"
            testID={`${testID}-error`}
          >
            {error}
          </Text>
        ) : (
          <View style={styles.flex} />
        )}
        {counter ? (
          <Text
            style={[styles.counter, overLimit && styles.counterOver]}
            testID={`${testID}-counter`}
          >
            {counter.current}/{counter.max}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  flex: { flex: 1 },
  label: {
    marginBottom: spacing.xs,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  required: { color: colors.danger },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: radius.md - 4,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: colors.background, opacity: 0.7 },
  meta: { flexDirection: 'row', marginTop: spacing.xs, minHeight: 16 },
  error: { flex: 1, fontSize: 13, color: colors.danger },
  counter: { fontSize: 12, color: colors.textMuted },
  counterOver: { color: colors.danger, fontWeight: '600' },
});
