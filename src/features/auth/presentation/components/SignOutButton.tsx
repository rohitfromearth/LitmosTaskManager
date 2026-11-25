import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../../../../shared/theme/theme';
import { selectAuthState } from '../state/authSlice';
import { signOut } from '../state/authThunks';
import { useAuthDispatch, useAuthSelector } from '../state/hooks';

/** A text button for a screen header: ends the session and clears the auth state. */
export function SignOutButton() {
  const dispatch = useAuthDispatch();
  const pending = useAuthSelector(selectAuthState).status === 'pending';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      accessibilityState={{ disabled: pending, busy: pending }}
      disabled={pending}
      onPress={() => dispatch(signOut())}
      hitSlop={8}
      style={styles.button}
      testID="sign-out-button"
    >
      <Text style={[styles.label, pending && styles.pending]}>
        {pending ? 'Signing out…' : 'Sign out'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  label: { fontSize: 16, fontWeight: '600', color: colors.primary },
  pending: { opacity: 0.6 },
});
