import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { InlineBanner } from '../../../../shared/components/InlineBanner';
import { TextField } from '../../../../shared/components/TextField';
import { colors, spacing } from '../../../../shared/theme/theme';
import { validateSignUp } from '../../domain/rules/authValidation';
import { AuthLayout } from '../components/AuthLayout';
import { toFieldErrors, type FieldErrors } from '../components/fieldErrors';
import { authErrorCleared, selectAuthState } from '../state/authSlice';
import { signUp } from '../state/authThunks';
import { useAuthDispatch, useAuthSelector } from '../state/hooks';

interface SignUpScreenProps {
  /** Goes back to the Sign In screen. */
  onGoToSignIn: () => void;
}

/**
 * Sign-up form: name, email, password and password confirmation. It validates
 * with the domain rules, then dispatches `signUp`; a successful sign-up also
 * signs the new user in, and the navigator swaps to the signed-in screens.
 */
export function SignUpScreen({ onGoToSignIn }: SignUpScreenProps) {
  const dispatch = useAuthDispatch();
  const { status, error } = useAuthSelector(selectAuthState);
  const isPending = status === 'pending';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // A ref, not state, so two quick presses can't both pass before a re-render.
  const inFlight = useRef(false);

  useEffect(() => {
    // Sign In stays mounted underneath, so don't leave our error for it to show.
    dispatch(authErrorCleared());
    return () => {
      dispatch(authErrorCleared());
    };
  }, [dispatch]);

  const edited = (field: keyof FieldErrors) => {
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    if (error) {
      dispatch(authErrorCleared());
    }
  };

  const submit = async () => {
    if (inFlight.current || isPending) {
      return;
    }
    const errors = validateSignUp({ name, email, password, confirmPassword });
    if (errors.length > 0) {
      setFieldErrors(toFieldErrors(errors));
      return;
    }

    setFieldErrors({});
    inFlight.current = true;
    try {
      await dispatch(signUp({ name, email, password }));
    } finally {
      inFlight.current = false;
    }
  };

  const serverFieldErrors = toFieldErrors(error?.fieldErrors);
  const showBanner = error !== null && !error.fieldErrors?.length;

  return (
    <AuthLayout
      title="Create account"
      subtitle="Demo sign-up: the account only exists until the app restarts."
      testID="sign-up-screen"
    >
      {showBanner ? (
        <InlineBanner message={error.message} testID="sign-up-error" />
      ) : null}

      <TextField
        label="Name"
        required
        value={name}
        onChangeText={text => {
          setName(text);
          edited('name');
        }}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        editable={!isPending}
        error={fieldErrors.name ?? serverFieldErrors.name}
        testID="signup-name"
      />
      <TextField
        label="Email"
        required
        value={email}
        onChangeText={text => {
          setEmail(text);
          edited('email');
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        editable={!isPending}
        error={fieldErrors.email ?? serverFieldErrors.email}
        testID="signup-email"
      />
      <TextField
        label="Password"
        required
        value={password}
        onChangeText={text => {
          setPassword(text);
          edited('password');
        }}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        returnKeyType="next"
        editable={!isPending}
        error={fieldErrors.password ?? serverFieldErrors.password}
        testID="signup-password"
      />
      <TextField
        label="Confirm password"
        required
        value={confirmPassword}
        onChangeText={text => {
          setConfirmPassword(text);
          edited('confirmPassword');
        }}
        placeholder="Repeat your password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        returnKeyType="done"
        editable={!isPending}
        error={fieldErrors.confirmPassword ?? serverFieldErrors.confirmPassword}
        testID="signup-confirmPassword"
      />

      <Button
        label={isPending ? 'Creating account…' : 'Create account'}
        onPress={submit}
        loading={isPending}
        testID="signup-submit"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={onGoToSignIn}
          hitSlop={8}
          testID="go-to-signin"
        >
          <Text style={styles.switchLink}> Sign in</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  switchText: { fontSize: 15, color: colors.textSecondary },
  switchLink: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
