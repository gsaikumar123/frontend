import type { Session } from './types';

const KEY = 'om.session';
export const loadSession = (): Session | null => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
    return s && new Date(s.expiresAt).getTime() > Date.now() ? s : null;
  } catch { return null; }
};
export const saveSession = (s: Session | null) => (s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY));

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const session = loadSession();
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (res.status === 401 && session) {          // expired / invalid token: force logout
    saveSession(null);
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    let msg = res.status === 401 ? 'Please log in.' : res.status === 403 ? 'You are not allowed to do that.' : `Request failed (${res.status}).`;
    try {
      const b = await res.json();
      if (b?.errors) msg = Object.values(b.errors as Record<string, string[]>).flat().join(' ');
      else if (b?.message) msg = b.message;
    } catch { /* non-JSON body */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
