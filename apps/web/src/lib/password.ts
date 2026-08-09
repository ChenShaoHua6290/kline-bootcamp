export const PASSWORD_MIN_LENGTH = 8;

export function isPasswordStrong(password: string) {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export const PASSWORD_STRENGTH_HINT = `密码长度至少 ${PASSWORD_MIN_LENGTH} 位，且必须包含字母和数字`;
