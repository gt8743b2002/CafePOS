import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../pricing';

const NEXT_STATUS = { RECEIVED: 'PREPARING', PREPARING: 'READY', READY: 'SERVED' };
const STATUS_LABEL = { RECEIVED: 'Received', PREPARING: 'Preparing', READY: 'Ready', SERVED: 'Served' };

export default function OrdersQueue() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.getOrders({ source: 'CUSTOMER' }).then(setOrders).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  async function advance(order) {
    const next = NEXT_STATUS[order.kitchen_status];
    if (!next) return;
    setBusyId(order.id);
    setError('');
    try {
      await api.updateOrderStatus(order.id, next);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const activeOrders = orders.filter((o) => o.kitchen_status !== 'SERVED');

  return (
    <div className="admin-section">
      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}
      <h2>Live Orders</h2>
      {activeOrders.length === 0 && <div className="empty-state">No active customer orders right now.</div>}
      <div className="orders-queue-grid">
        {activeOrders.map((o) => (
          <div key={o.id} className="order-card">
            <div className="order-card-header">
              <span className="order-card-table">Table {o.table_number}</span>
              <span className="order-card-id">#{o.id}</span>
            </div>
            {o.guest_name && <div className="order-card-guest">{o.guest_name}</div>}
            <ul className="order-card-items">
              {(o.items || []).map((it, i) => <li key={i}>{it.qty} × {it.name}</li>)}
            </ul>
            <div className="order-card-total">{formatMoney(o.total)}</div>
            <div className={`order-status-badge order-status-${(o.kitchen_status || '').toLowerCase()}`}>
              {STATUS_LABEL[o.kitchen_status] || o.kitchen_status}
            </div>
            {NEXT_STATUS[o.kitchen_status] && (
              <button className="btn btn-primary" disabled={busyId === o.id} onClick={() => advance(o)}>
                {busyId === o.id ? 'Updating…' : `Mark ${STATUS_LABEL[NEXT_STATUS[o.kitchen_status]]}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
