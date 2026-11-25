import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MessageState } from '../../../../shared/components/MessageState';
import { colors, spacing } from '../../../../shared/theme/theme';

interface TaskDetailFallbackProps {
  isLoading: boolean;
  missing: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

/** What the details and edit screens show while there is no task to show. */
export function TaskDetailFallback({
  isLoading,
  missing,
  error,
  onRetry,
  onBack,
}: TaskDetailFallbackProps) {
  if (isLoading) {
    return (
      <View style={styles.centered} testID="task-detail-loading">
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading task…</Text>
      </View>
    );
  }
  if (missing) {
    return (
      <MessageState
        testID="task-detail-missing"
        title="Task not found"
        message="It may have been deleted."
        actionLabel="Go back"
        onAction={onBack}
      />
    );
  }
  return (
    <MessageState
      testID="task-detail-error"
      title="Couldn't load the task"
      message={error ?? undefined}
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
});
