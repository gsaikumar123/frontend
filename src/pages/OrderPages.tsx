import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, money } from '../api';
import { Empty, ErrorMsg, Spinner, useAction, useFetch } from '../components/Shared';
import type { OrderDetail, OrderStatus, OrderSummary, Paged, Product } from '../types';

/** Shared list for "My Orders" and admin "All Orders". */
export function OrdersList({ admin }: { admin: boolean }) {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ search: '', status: '', employee: '' });
  const [applied, setApplied] = useState(draft);
  const { data, loading, error } = useFetch(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '10' });
    if (applied.search) p.set('search', applied.search);
    if (applied.status) p.set('status', applied.status);
    if (admin && applied.employee) p.set('employee', applied.employee);
    return api<Paged<OrderSummary>>(`/orders?${p}`);
  }, [page, applied, admin]);

  const apply = (e: FormEvent) => { e.preventDefault(); setPage(1); setApplied(draft); };
  return (
    <div>
      <h2>{admin ? 'All Orders' : 'My Orders'}</h2>
      <form className="row" onSubmit={apply}>
        <input placeholder="Order number" value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} />
        {admin && <input placeholder="Employee name" value={draft.employee} onChange={e => setDraft({ ...draft, employee: e.target.value })} />}
        <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
          <option value="">All statuses</option><option>Active</option><option>Cancelled</option>
        </select>
        <button>Search</button>
      </form>
      <ErrorMsg text={error} />
      {loading ? <Spinner /> : !data || data.items.length === 0 ? <Empty>No orders found. <Link to="/orders/new">Create one</Link>.</Empty> : (
        <>
          <div className="scroll"><table>
            <thead><tr><th>Order #</th>{admin && <th>Employee</th>}<th>Created</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>{data.items.map(o => (
              <tr key={o.id}>
                <td><Link to={`/orders/${o.id}`}>{o.orderNumber}</Link></td>
                {admin && <td>{o.employeeName}</td>}
                <td>{new Date(o.createdAt).toLocaleString()}</td><td className="num">{money(o.total)}</td><td><Badge s={o.status} /></td>
              </tr>))}</tbody>
          </table></div>
          <div className="row">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {data.page} of {Math.max(data.totalPages, 1)} ({data.totalCount} orders)</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

const Badge = ({ s }: { s: OrderStatus }) => <span className={`badge ${s.toLowerCase()}`}>{s}</span>;

interface Line { productId: number | ''; quantity: number }

export function CreateOrder() {
  const nav = useNavigate();
  const { data: products, loading, error: loadErr } = useFetch(() => api<Product[]>('/products'), []);
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1 }]);
  const { busy, error, run } = useAction();

  const byId = new Map((products ?? []).map(p => [p.id, p]));
  const total = lines.reduce((s, l) => s + (l.productId ? (byId.get(l.productId)?.price ?? 0) * l.quantity : 0), 0);
  const valid = lines.length > 0 && lines.every(l => l.productId !== '' && Number.isInteger(l.quantity) && l.quantity > 0);
  const set = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const order = await run(() => api<OrderDetail>('/orders', { body: { items: lines.map(l => ({ productId: l.productId, quantity: l.quantity })) } }));
    if (order) nav(`/orders/${order.id}`);
  };
  if (loading) return <Spinner />;
  return (
    <form onSubmit={submit}>
      <h2>Create Order</h2>
      <ErrorMsg text={loadErr} />
      <div className="scroll"><table>
        <thead><tr><th>Product</th><th className="num">Unit price</th><th>Qty</th><th className="num">Line total</th><th /></tr></thead>
        <tbody>{lines.map((l, i) => {
          const p = l.productId ? byId.get(l.productId) : undefined;
          return (
            <tr key={i}>
              <td><select required value={l.productId} onChange={e => set(i, { productId: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">Select…</option>
                {(products ?? []).filter(x => x.id === l.productId || !lines.some(o => o.productId === x.id)).map(x =>
                  <option key={x.id} value={x.id} disabled={x.stock === 0}>{x.name} ({x.stock} in stock)</option>)}
              </select></td>
              <td className="num">{p ? money(p.price) : '—'}</td>
              <td><input type="number" min={1} max={p?.stock ?? 10000} step={1} value={l.quantity} onChange={e => set(i, { quantity: Number(e.target.value) })} /></td>
              <td className="num">{p ? money(p.price * l.quantity) : '—'}</td>
              <td><button type="button" disabled={lines.length === 1} onClick={() => setLines(ls => ls.filter((_, j) => j !== i))}>Remove</button></td>
            </tr>);
        })}</tbody>
        <tfoot><tr><td colSpan={3}><strong>Total (estimate; server recalculates)</strong></td><td className="num"><strong>{money(total)}</strong></td><td /></tr></tfoot>
      </table></div>
      <div className="row">
        <button type="button" onClick={() => setLines(ls => [...ls, { productId: '', quantity: 1 }])}>Add item</button>
        <button disabled={busy || !valid}>{busy ? 'Placing order…' : 'Place order'}</button>
      </div>
      <ErrorMsg text={error} />
    </form>
  );
}

export function OrderDetails() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch(() => api<OrderDetail>(`/orders/${id}`), [id]);
  const { busy, error: cancelErr, run } = useAction();
  const cancel = async () => {
    if (!window.confirm('Cancel this order? Stock will be restored.')) return;
    await run(() => api<OrderDetail>(`/orders/${id}/cancel`, { method: 'POST', body: {} }));
    reload();
  };
  if (loading) return <Spinner />;
  if (error || !o) return <><ErrorMsg text={error ?? 'Order not found.'} /><Link to="/orders">Back</Link></>;
  return (
    <div>
      <h2>Order {o.orderNumber} <Badge s={o.status} /></h2>
      <p>Created {new Date(o.createdAt).toLocaleString()}{o.employeeName && <> by <strong>{o.employeeName}</strong></>}
        {o.cancelledAt && <> · Cancelled {new Date(o.cancelledAt).toLocaleString()}</>}</p>
      <div className="scroll"><table>
        <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Line total</th></tr></thead>
        <tbody>{o.items.map(i => <tr key={i.productId}><td>{i.productName}</td><td className="num">{i.quantity}</td><td className="num">{money(i.unitPrice)}</td><td className="num">{money(i.lineTotal)}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={3}><strong>Total</strong></td><td className="num"><strong>{money(o.total)}</strong></td></tr></tfoot>
      </table></div>
      <ErrorMsg text={cancelErr} />
      <div className="row">
        {o.status === 'Active' && <button className="danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel order'}</button>}
        <Link to="/orders">Back to orders</Link>
      </div>
    </div>
  );
}
