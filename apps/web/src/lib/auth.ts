export type AuthUser = {
  id: string;
  email: string;
  nickname?: string | null;
  role?: 'USER' | 'ADMIN';
};

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';
export const AUTH_SESSION_EVENT = 'kline-auth-session-change';

export type AuthSessionChangeDetail = {
  previousUserId: string | null;
  userId: string | null;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return { id: parsed.id, email: parsed.email, nickname: parsed.nickname, role: parsed.role };
    }
    return null;
  } catch {
    return null;
  }
}

function emitAuthSessionChange(detail: AuthSessionChangeDetail) {
  if (typeof window === 'undefined') return;
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent<AuthSessionChangeDetail>(AUTH_SESSION_EVENT, { detail }));
  });
}

export function setAuthSession(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return;
  const previousUserId = getAuthUser()?.id ?? null;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (previousUserId !== user.id) {
    emitAuthSessionChange({ previousUserId, userId: user.id });
  }
}

export function setRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  const previousUserId = getAuthUser()?.id ?? null;
  const hadSession = Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY) || previousUserId);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (hadSession) {
    emitAuthSessionChange({ previousUserId, userId: null });
  }
}
