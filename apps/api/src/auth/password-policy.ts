export const PASSWORD_MIN_LENGTH = 8;

export function isPasswordStrong(password: string) {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

export function passwordStrengthMessage() {
  return `密码长度至少 ${PASSWORD_MIN_LENGTH} 位，且必须包含字母和数字`;
}
