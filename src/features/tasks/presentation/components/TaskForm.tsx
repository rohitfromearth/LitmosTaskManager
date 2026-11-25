import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import {
  ChoiceGroup,
  type ChoiceOption,
} from '../../../../shared/components/ChoiceGroup';
import { TextField } from '../../../../shared/components/TextField';
import {
  colors,
  MAX_CONTENT_WIDTH,
  spacing,
} from '../../../../shared/theme/theme';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '../../domain/entities/Task';
import type { NewTask } from '../../domain/repositories/TaskRepository';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateNewTask,
  type FieldError,
} from '../../domain/rules/taskValidation';
import type { ThunkError } from '../state/tasksState';
import { PRIORITY_LABELS, STATUS_LABELS } from '../taskLabels';

export type TaskFormValues = NewTask;

export type SubmitOutcome = { ok: true } | { ok: false; error: ThunkError };

export const DEFAULT_TASK_FORM_VALUES: TaskFormValues = {
  title: '',
  description: '',
  assignedTo: '',
  status: 'todo',
  priority: 'medium',
};

/** The editable fields of a task, for prefilling the form. */
export function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    status: task.status,
    priority: task.priority,
  };
}

/** Converts a finished create/update thunk action into what the form needs. */
export function toSubmitOutcome(result: {
  meta: { requestStatus: string };
  payload?: unknown;
  error?: { message?: string };
}): SubmitOutcome {
  if (result.meta.requestStatus === 'fulfilled') {
    return { ok: true };
  }
  return {
    ok: false,
    error: (result.payload as ThunkError | undefined) ?? {
      message: result.error?.message ?? 'Something went wrong',
    },
  };
}

type FieldErrors = Partial<Record<keyof NewTask, string>>;

const STATUS_OPTIONS: ChoiceOption<TaskStatus>[] = TASK_STATUSES.map(value => ({
  value,
  label: STATUS_LABELS[value],
}));
const PRIORITY_OPTIONS: ChoiceOption<TaskPriority>[] = TASK_PRIORITIES.map(
  value => ({ value, label: PRIORITY_LABELS[value] }),
);

/** Keeps the first message per field. */
function toFieldErrors(errors: FieldError[]): FieldErrors {
  const result: FieldErrors = {};
  for (const { field, message } of errors) {
    result[field] ??= message;
  }
  return result;
}

interface TaskFormProps {
  /** Values shown when the form first appears; later changes are ignored. */
  initialValues?: TaskFormValues;
  submitLabel: string;
  savingLabel: string;
  /** True while a save is running: inputs and the button are locked. */
  isSaving: boolean;
  /** Saves the validated input; must resolve (not throw) with the outcome. */
  onSubmit: (input: NewTask) => Promise<SubmitOutcome>;
  /** Called once after a successful save, unless the form was closed meanwhile. */
  onSuccess: () => void;
}

/**
 * The form shared by Create and Edit. Rules live in the domain: it only calls
 * `validateNewTask` for instant feedback, then hands valid input to `onSubmit`
 * (a thunk), whose repository validates again.
 */
export function TaskForm({
  initialValues = DEFAULT_TASK_FORM_VALUES,
  submitLabel,
  savingLabel,
  isSaving,
  onSubmit,
  onSuccess,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setField = <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => {
    setValues(current => ({ ...current, [field]: value }));
    // Editing a field clears its own error.
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (isSaving) {
      return;
    }
    const input: NewTask = { ...values };

    const errors = validateNewTask(input);
    if (errors.length > 0) {
      setFieldErrors(toFieldErrors(errors));
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    const outcome = await onSubmit(input);
    if (!mounted.current) {
      // Left the screen mid-save: the save went through, but don't navigate again.
      return;
    }

    if (outcome.ok) {
      onSuccess();
      return;
    }
    if (outcome.error.fieldErrors && outcome.error.fieldErrors.length > 0) {
      setFieldErrors(toFieldErrors(outcome.error.fieldErrors));
    } else {
      setSubmitError(outcome.error.message);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      testID="task-form"
    >
      <View style={styles.content}>
        {submitError ? (
          <View
            style={styles.banner}
            accessibilityRole="alert"
            testID="task-form-error"
          >
            <Text style={styles.bannerTitle}>Couldn't save the task</Text>
            <Text style={styles.bannerText}>
              {submitError} Your input is still here; try again.
            </Text>
          </View>
        ) : null}

        <TextField
          label="Title"
          required
          value={values.title}
          onChangeText={text => setField('title', text)}
          placeholder="e.g. Prepare sprint demo"
          autoCapitalize="sentences"
          returnKeyType="next"
          editable={!isSaving}
          error={fieldErrors.title}
          counter={{ current: values.title.length, max: TITLE_MAX_LENGTH }}
          testID="field-title"
        />
        <TextField
          label="Description"
          value={values.description}
          onChangeText={text => setField('description', text)}
          placeholder="Optional details"
          autoCapitalize="sentences"
          multiline
          editable={!isSaving}
          error={fieldErrors.description}
          counter={{
            current: values.description.length,
            max: DESCRIPTION_MAX_LENGTH,
          }}
          testID="field-description"
        />
        <TextField
          label="Assigned to"
          required
          value={values.assignedTo}
          onChangeText={text => setField('assignedTo', text)}
          placeholder="Person's name"
          autoCapitalize="words"
          returnKeyType="done"
          editable={!isSaving}
          error={fieldErrors.assignedTo}
          testID="field-assignedTo"
        />
        <ChoiceGroup
          label="Status"
          options={STATUS_OPTIONS}
          value={values.status}
          onChange={status => setField('status', status)}
          disabled={isSaving}
          testID="field-status"
        />
        <ChoiceGroup
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={values.priority}
          onChange={priority => setField('priority', priority)}
          disabled={isSaving}
          testID="field-priority"
        />

        <Button
          label={isSaving ? savingLabel : submitLabel}
          onPress={handleSubmit}
          loading={isSaving}
          testID="task-form-submit"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  // Width-limited and centered, like the task list.
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  banner: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.dangerSurface,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: colors.danger },
  bannerText: { marginTop: 2, fontSize: 14, color: colors.danger },
});
