import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import type { Role } from '../types';

export const Spinner = () => <p className="muted" role="status">Loading…</p>;
export const ErrorMsg = ({ text }: { text?: string | null }) => (text ? <p className="error" role="alert">{text}</p> : null);
export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;

/** Route guard: backend remains authoritative, this only avoids showing pages that would 401/403. */
export function Protected({ role }: { role?: Role }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (role && session.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function Layout() {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <header className="nav">
        <strong>Order Management</strong>
        {session ? (
          <>
            <Link to="/orders">My Orders</Link>
            <Link to="/orders/new">Create Order</Link>
            {session.role === 'Admin' && (
              <>
                <Link to="/admin/orders">All Orders</Link>
                <Link to="/admin/approvals">Approvals</Link>
                <Link to="/admin/employees/new">Create Employee</Link>
                <Link to="/admin/products">Products</Link>
              </>
            )}
            <span className="spacer" />
            <span className="muted">{session.name} ({session.role})</span>
            <button onClick={() => { logout(); nav('/login'); }}>Logout</button>
          </>
        ) : (<><span className="spacer" /><Link to="/login">Login</Link><Link to="/register">Register</Link></>)}
      </header>
      <main><Outlet /></main>
    </>
  );
}

/** Small hook: run an async action once at a time (prevents duplicate submissions). */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (busy) return undefined;
    setBusy(true); setError(null);
    try { return await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); return undefined; }
    finally { setBusy(false); }
  };
  return { busy, error, setError, run };
}

/** Fetch helper with loading / error state and manual reload. */
export function useFetch<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(null);
    load().then(d => live && setData(d)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, loading, error, reload: () => setTick(t => t + 1) };
}
