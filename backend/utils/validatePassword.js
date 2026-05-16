const MIN_LENGTH = 12;

/**
 * Validates password strength. Returns an error message string, or null if valid.
 * Uses lookaheads only — any printable characters allowed (not a restrictive charset).
 */
export const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters long.`;
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/\d/.test(password)) {
    return 'Password must include at least one number.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special character (e.g. ! @ # $ _ -).';
  }
  return null;
};
