import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function StartupLoading() {
  return (
    <View style={styles.container} testID="startup-loading">
      <ActivityIndicator size="large" />
      <Text style={styles.message}>Starting up…</Text>
    </View>
  );
}

export function StartupError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container} testID="startup-error">
      <Text style={styles.title}>Couldn't start the app</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.button}
        testID="startup-retry"
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#111111', marginBottom: 8 },
  message: {
    fontSize: 16,
    color: '#444444',
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#1f6feb',
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
