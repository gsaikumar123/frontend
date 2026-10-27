import { useState, type FormEvent } from 'react';
import { api, money } from '../api';
import { Empty, ErrorMsg, Spinner, useAction, useFetch } from '../components/Shared';
import type { Product, UserRow } from '../types';

export function Approvals() {
  const [status, setStatus] = useState('Pending');
  const { data, loading, error, reload } = useFetch(() => api<UserRow[]>(`/admin/registrations?status=${status}`), [status]);
  const { busy, error: actErr, run } = useAction();
  const decide = async (id: string, verb: 'approve' | 'reject') => {
    await run(() => api(`/admin/registrations/${id}/${verb}`, { method: 'POST', body: {} }));
    reload();
  };
  return (
    <div>
      <h2>Employee Approvals</h2>
      <div className="row">
        {['Pending', 'Approved', 'Rejected'].map(s => <button key={s} className={s === status ? 'active' : ''} onClick={() => setStatus(s)}>{s}</button>)}
      </div>
      <ErrorMsg text={error ?? actErr} />
      {loading ? <Spinner /> : !data?.length ? <Empty>No {status.toLowerCase()} registrations.</Empty> : (
        <div className="scroll"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Registered</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map(u => (
            <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{new Date(u.createdAt).toLocaleString()}</td><td>{u.status}</td>
              <td>{u.status === 'Pending' && <>
                <button disabled={busy} onClick={() => decide(u.id, 'approve')}>Approve</button>{' '}
                <button className="danger" disabled={busy} onClick={() => decide(u.id, 'reject')}>Reject</button></>}</td></tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}

export function CreateEmployee() {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [ok, setOk] = useState<string | null>(null);
  const { busy, error, run } = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setOk(null);
    const r = await run(() => api<UserRow>('/admin/employees', { body: f }));
    if (r) { setOk(`Employee ${r.email} created (approved).`); setF({ name: '', email: '', password: '' }); }
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>Create Employee</h2>
      <label>Name<input required maxLength={100} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" required minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
      <ErrorMsg text={error} />
      {ok && <p className="ok">{ok}</p>}
      <button disabled={busy}>{busy ? 'Creating…' : 'Create employee'}</button>
    </form>
  );
}

interface Draft { name: string; price: string; stock: string }
const blank: Draft = { name: '', price: '', stock: '' };

export function Products() {
  const { data, loading, error, reload } = useFetch(() => api<Product[]>('/products'), []);
  const [editId, setEditId] = useState<number | 'new' | null>(null);
  const [d, setD] = useState<Draft>(blank);
  const { busy, error: saveErr, setError, run } = useAction();

  const start = (p?: Product) => { setError(null); setEditId(p ? p.id : 'new'); setD(p ? { name: p.name, price: String(p.price), stock: String(p.stock) } : blank); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { name: d.name, price: Number(d.price), stock: Number(d.stock) };
    const r = await run(() => editId === 'new' ? api('/products', { body }) : api(`/products/${editId}`, { method: 'PUT', body }));
    if (r !== undefined) { setEditId(null); reload(); }
  };
  return (
    <div>
      <h2>Product Management</h2>
      <ErrorMsg text={error} />
      <button onClick={() => start()}>New product</button>
      {editId !== null && (
        <form className="card" onSubmit={save}>
          <h3>{editId === 'new' ? 'New product' : 'Edit product'}</h3>
          <label>Name<input required maxLength={200} value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></label>
          <label>Price (USD)<input type="number" required min={0.01} step={0.01} value={d.price} onChange={e => setD({ ...d, price: e.target.value })} /></label>
          <label>Stock<input type="number" required min={0} step={1} value={d.stock} onChange={e => setD({ ...d, stock: e.target.value })} /></label>
          <ErrorMsg text={saveErr} />
          <div className="row"><button disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setEditId(null)}>Cancel</button></div>
        </form>
      )}
      {loading ? <Spinner /> : !data?.length ? <Empty>No products yet.</Empty> : (
        <div className="scroll"><table>
          <thead><tr><th>Name</th><th className="num">Price</th><th className="num">Stock</th><th /></tr></thead>
          <tbody>{data.map(p => <tr key={p.id}><td>{p.name}</td><td className="num">{money(p.price)}</td><td className="num">{p.stock}</td><td><button onClick={() => start(p)}>Edit</button></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
