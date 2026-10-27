import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorMsg, useAction } from '../components/Shared';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const { busy, error, run } = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(async () => { await login(email, password); return true; });
    if (ok) nav((loc.state as { from?: string } | null)?.from ?? '/orders', { replace: true });
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>Login</h2>
      <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <ErrorMsg text={error} />
      <button disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
      <p>No account? <Link to="/register">Register</Link></p>
    </form>
  );
}

export function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [done, setDone] = useState<string | null>(null);
  const { busy, error, run } = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await run(() => api<{ message: string }>('/auth/register', { body: f }));
    if (r) setDone(r.message);
  };
  if (done) return <div className="card"><h2>Thanks!</h2><p>{done}</p><Link to="/login">Back to login</Link></div>;
  return (
    <form className="card" onSubmit={submit}>
      <h2>Register</h2>
      <label>Name<input required maxLength={100} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" required minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
      <small className="muted">Min 8 characters with upper-case, lower-case and a digit.</small>
      <ErrorMsg text={error} />
      <button disabled={busy}>{busy ? 'Submitting…' : 'Register'}</button>
    </form>
  );
}
