import axios from 'axios';
import { clearAuthSession, getRefreshToken, getToken, setAuthSession, setRefreshToken } from './auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
        const resp = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const accessToken = resp?.data?.accessToken as string | undefined;
        const nextRefreshToken = resp?.data?.refreshToken as string | undefined;
        const user = resp?.data?.user as { id: string; email: string; nickname?: string | null; role?: 'USER' | 'ADMIN' } | undefined;
        if (!accessToken || !user) {
          clearAuthSession();
          return null;
        }
        setAuthSession(accessToken, user);
        if (nextRefreshToken) setRefreshToken(nextRefreshToken);
        return accessToken;
      } catch {
        clearAuthSession();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

api.interceptors.request.use(async (config) => {
  if (typeof window === 'undefined') return config;
  const anonymousAuthEndpoints = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']);
  if (config.url && anonymousAuthEndpoints.has(config.url)) return config;
  let token = getToken();
  if (!token) {
    token = await refreshAccessToken();
  }
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error?.config ?? {};
    const goAuth = () => {
      clearAuthSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth?reason=expired';
      }
    };
    if (typeof window !== 'undefined' && error?.response?.status === 401 && !original?._retry) {
      const msg = error?.response?.data?.message;
      if (typeof msg === 'string' && msg.toLowerCase().includes('missing token')) {
        goAuth();
        return Promise.reject(error);
      }
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        original._retry = true;
        try {
          const refreshResp = await api.post('/auth/refresh', { refreshToken });
          const accessToken = refreshResp?.data?.accessToken as string | undefined;
          const nextRefreshToken = refreshResp?.data?.refreshToken as string | undefined;
          const user = refreshResp?.data?.user as { id: string; email: string; nickname?: string | null; role?: 'USER' | 'ADMIN' } | undefined;
          if (accessToken && user) {
            setAuthSession(accessToken, user);
            if (nextRefreshToken) setRefreshToken(nextRefreshToken);
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${accessToken}`;
            return api(original);
          }
        } catch {
          goAuth();
          return Promise.reject(error);
        }
      }
      goAuth();
    }
    if (typeof window !== 'undefined' && error?.response?.status === 403) {
      const msg = error?.response?.data?.message;
      if (typeof msg === 'string' && msg.includes('封禁')) {
        goAuth();
      }
    }
    return Promise.reject(error);
  },
);
