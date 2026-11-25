import type {
  AuthField,
  AuthFieldError,
} from '../../domain/rules/authValidation';

export type FieldErrors = Partial<Record<AuthField, string>>;

/** Keeps the first message per field. */
export function toFieldErrors(errors: AuthFieldError[] = []): FieldErrors {
  const result: FieldErrors = {};
  for (const { field, message } of errors) {
    result[field] ??= message;
  }
  return result;
}
