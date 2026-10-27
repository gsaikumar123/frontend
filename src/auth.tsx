import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, loadSession, saveSession } from './api';
import type { Session } from './types';

interface AuthCtx { session: Session | null; login: (email: string, password: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const logout = useCallback(() => { saveSession(null); setSession(null); }, []);
  const login = useCallback(async (email: string, password: string) => {
    const s = await api<Session>('/auth/login', { body: { email, password } });
    saveSession(s); setSession(s);
  }, []);

  useEffect(() => {
    const onExpired = () => setSession(null);
    window.addEventListener('auth:expired', onExpired);
    // also log out when the token's own expiry passes
    const ms = session ? new Date(session.expiresAt).getTime() - Date.now() : 0;
    const t = session && ms > 0 ? window.setTimeout(logout, Math.min(ms, 2 ** 31 - 1)) : undefined;
    return () => { window.removeEventListener('auth:expired', onExpired); if (t) clearTimeout(t); };
  }, [session, logout]);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
