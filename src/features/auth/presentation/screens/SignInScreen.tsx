import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { InlineBanner } from '../../../../shared/components/InlineBanner';
import { TextField } from '../../../../shared/components/TextField';
import { colors, radius, spacing } from '../../../../shared/theme/theme';
import type { SignInCredentials } from '../../domain/entities/Auth';
import { validateSignIn } from '../../domain/rules/authValidation';
import { AuthLayout } from '../components/AuthLayout';
import { toFieldErrors, type FieldErrors } from '../components/fieldErrors';
import { authErrorCleared, selectAuthState } from '../state/authSlice';
import { signIn } from '../state/authThunks';
import { useAuthDispatch, useAuthSelector } from '../state/hooks';

interface SignInScreenProps {
  /** Opens the Sign Up screen. */
  onGoToSignUp: () => void;
  /**
   * When given, a demonstration hint with these credentials and a button to
   * fill them in is shown. The screen doesn't know where they come from, so a
   * real backend needs no change here: just stop passing them.
   */
  demoCredentials?: Readonly<SignInCredentials>;
}

/**
 * Sign-in form. It validates with the domain rules for instant feedback, then
 * dispatches the `signIn` thunk. It never navigates: when the session is set
 * the navigator swaps to the signed-in screens.
 */
export function SignInScreen({
  onGoToSignUp,
  demoCredentials,
}: SignInScreenProps) {
  const dispatch = useAuthDispatch();
  const { status, error } = useAuthSelector(selectAuthState);
  const isPending = status === 'pending';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // A ref, not state, so two quick presses can't both pass before a re-render.
  const inFlight = useRef(false);

  useEffect(() => {
    // Hide an error left over from another screen, and don't leave ours behind.
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

  const fillDemo = () => {
    if (!demoCredentials) {
      return;
    }
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setFieldErrors({});
    if (error) {
      dispatch(authErrorCleared());
    }
  };

  const submit = async () => {
    if (inFlight.current || isPending) {
      return;
    }
    const credentials = { email, password };
    const errors = validateSignIn(credentials);
    if (errors.length > 0) {
      setFieldErrors(toFieldErrors(errors));
      return;
    }

    setFieldErrors({});
    inFlight.current = true;
    try {
      await dispatch(signIn(credentials));
    } finally {
      inFlight.current = false;
    }
  };

  const serverFieldErrors = toFieldErrors(error?.fieldErrors);
  const showBanner = error !== null && !error.fieldErrors?.length;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to manage your tasks."
      testID="sign-in-screen"
    >
      {demoCredentials ? (
        <View style={styles.demo} testID="demo-credentials">
          <Text style={styles.demoTitle}>Demo mode</Text>
          <Text style={styles.demoText}>
            This is a demonstration. Use these credentials; nothing here is
            secure.
          </Text>
          <Text style={styles.demoValue} testID="demo-email">
            Email: {demoCredentials.email}
          </Text>
          <Text style={styles.demoValue} testID="demo-password">
            Password: {demoCredentials.password}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use demo credentials"
            disabled={isPending}
            onPress={fillDemo}
            style={styles.demoButton}
            testID="use-demo-credentials"
          >
            <Text style={styles.demoButtonText}>Use demo credentials</Text>
          </Pressable>
        </View>
      ) : null}

      {showBanner ? (
        <InlineBanner message={error.message} testID="sign-in-error" />
      ) : null}

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
        testID="signin-email"
      />
      <TextField
        label="Password"
        required
        value={password}
        onChangeText={text => {
          setPassword(text);
          edited('password');
        }}
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        returnKeyType="done"
        editable={!isPending}
        error={fieldErrors.password ?? serverFieldErrors.password}
        testID="signin-password"
      />

      <Button
        label={isPending ? 'Signing in…' : 'Sign in'}
        onPress={submit}
        loading={isPending}
        testID="signin-submit"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Don't have an account?</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={onGoToSignUp}
          hitSlop={8}
          testID="go-to-signup"
        >
          <Text style={styles.switchLink}> Sign up</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  demo: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  demoTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  demoText: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  demoValue: {
    marginTop: spacing.xs,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  demoButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  demoButtonText: { fontSize: 15, fontWeight: '700', color: colors.primary },
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
