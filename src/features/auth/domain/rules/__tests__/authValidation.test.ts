import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
  validateSignIn,
  validateSignUp,
  type SignUpInput,
} from '../authValidation';

const validSignUp: SignUpInput = {
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'Sup3rsecret',
  confirmPassword: 'Sup3rsecret',
};

const messages = (errors: { field: string; message: string }[]) =>
  Object.fromEntries(errors.map(e => [e.field, e.message]));

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Demo@Litmos.COM ')).toBe('demo@litmos.com');
  });
});

describe('validateSignIn', () => {
  it('accepts a filled-in email and password', () => {
    expect(validateSignIn({ email: 'demo@litmos.com', password: 'x' })).toEqual(
      [],
    );
  });

  it('requires both fields', () => {
    expect(messages(validateSignIn({ email: '', password: '' }))).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  it('treats a whitespace-only email as missing', () => {
    expect(messages(validateSignIn({ email: '   ', password: 'x' }))).toEqual({
      email: 'Email is required',
    });
  });

  it.each(['plain', 'a@b', 'a b@c.com', '@c.com', 'a@.com'])(
    'rejects the malformed email %p',
    email => {
      expect(messages(validateSignIn({ email, password: 'x' }))).toEqual({
        email: 'Enter a valid email address',
      });
    },
  );

  it("doesn't apply the password length rule, so it reveals no policy", () => {
    expect(validateSignIn({ email: 'a@b.co', password: 'x' })).toEqual([]);
  });
});

describe('validateSignUp', () => {
  it('accepts valid input', () => {
    expect(validateSignUp(validSignUp)).toEqual([]);
  });

  it('requires every field', () => {
    expect(
      messages(
        validateSignUp({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        }),
      ),
    ).toEqual({
      name: 'Name is required',
      email: 'Email is required',
      password: 'Password is required',
      confirmPassword: 'Confirm your password',
    });
  });

  it('treats a whitespace-only name as missing', () => {
    expect(messages(validateSignUp({ ...validSignUp, name: '   ' }))).toEqual({
      name: 'Name is required',
    });
  });

  it('rejects a name over the limit but accepts exactly the limit', () => {
    expect(
      messages(
        validateSignUp({
          ...validSignUp,
          name: 'a'.repeat(NAME_MAX_LENGTH + 1),
        }),
      ).name,
    ).toContain(`at most ${NAME_MAX_LENGTH}`);
    expect(
      validateSignUp({ ...validSignUp, name: 'a'.repeat(NAME_MAX_LENGTH) }),
    ).toEqual([]);
  });

  it('rejects a malformed email', () => {
    expect(
      messages(validateSignUp({ ...validSignUp, email: 'not-an-email' })),
    ).toEqual({ email: 'Enter a valid email address' });
  });

  it('enforces the minimum password length', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(
      messages(
        validateSignUp({
          ...validSignUp,
          password: short,
          confirmPassword: short,
        }),
      ),
    ).toEqual({
      password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    });

    const exact = 'a'.repeat(PASSWORD_MIN_LENGTH);
    expect(
      validateSignUp({
        ...validSignUp,
        password: exact,
        confirmPassword: exact,
      }),
    ).toEqual([]);
  });

  it('requires the confirmation to match the password exactly', () => {
    expect(
      messages(
        validateSignUp({ ...validSignUp, confirmPassword: 'sup3rsecret' }),
      ),
    ).toEqual({ confirmPassword: 'Passwords do not match' });
  });

  it("doesn't trim passwords", () => {
    expect(
      validateSignUp({
        ...validSignUp,
        password: '  spaced out  ',
        confirmPassword: '  spaced out  ',
      }),
    ).toEqual([]);
  });
});
