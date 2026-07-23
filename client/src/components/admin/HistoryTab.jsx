import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../pricing';
import Receipt from '../Receipt';

export default function HistoryTab({ user }) {
  const [orders, setOrders] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [cashierFilter, setCashierFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  function loadOrders(cashierId) {
    api.getOrders(cashierId ? { cashier_id: cashierId } : {}).then(setOrders).catch((e) => setError(e.message));
  }

  useEffect(() => {
    loadOrders();
    if (isAdmin) {
      api.getUsers().then(setCashiers).catch(() => {});
    }
  }, []);

  function handleFilterChange(value) {
    setCashierFilter(value);
    loadOrders(value || undefined);
  }

  async function viewOrder(id) {
    setError('');
    try {
      setSelectedOrder(await api.getOrder(id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-section">
      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}
      <h2>Sales History</h2>

      {isAdmin && (
        <div className="inline-form" style={{ marginBottom: 12 }}>
          <select value={cashierFilter} onChange={(e) => handleFilterChange(e.target.value)}>
            <option value="">All cashiers</option>
            {cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <table className="admin-table">
        <thead><tr><th>Order #</th><th>Date/Time</th><th>Cashier</th><th>Subtotal</th><th>Tax</th><th>Total</th><th></th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td>{o.cashier_name || '—'}</td>
              <td>{formatMoney(o.subtotal)}</td>
              <td>{formatMoney(o.tax)}</td>
              <td>{formatMoney(o.total)}</td>
              <td><button className="btn" onClick={() => viewOrder(o.id)}>View / Reprint</button></td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan={7} className="empty-state">No orders yet.</td></tr>
          )}
        </tbody>
      </table>

      {selectedOrder && <Receipt order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}
