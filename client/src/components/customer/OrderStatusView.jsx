import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../pricing';

const STEPS = [
  { key: 'RECEIVED', label: 'Received', icon: '📝' },
  { key: 'PREPARING', label: 'Preparing', icon: '👩‍🍳' },
  { key: 'READY', label: 'Ready', icon: '🔔' },
  { key: 'SERVED', label: 'Served', icon: '✅' },
];

const STATUS_BADGE_CLASS = {
  READY: 'order-status-ready',
  SERVED: 'order-status-served',
};

export default function OrderStatusView({ orders, viewingIndex, onSelectOrder, onPlaceNewOrder, onStartOver }) {
  const [statuses, setStatuses] = useState({}); // { [orderId]: { kitchen_status, table_number, total, ... } }
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    function poll() {
      Promise.all(
        orders.map((o) =>
          api.getGuestOrderStatus(o.id, o.guestToken)
            .then((s) => ({ id: o.id, status: s, error: null }))
            .catch((e) => ({ id: o.id, status: null, error: e.message }))
        )
      ).then((results) => {
        if (cancelled) return;
        setStatuses((cur) => {
          const next = { ...cur };
          for (const r of results) {
            if (r.status) next[r.id] = r.status;
          }
          return next;
        });
        const failed = results.find((r) => r.error);
        setError(failed ? failed.error : '');
      });
    }
    poll();
    const timer = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [orders]);

  const viewedOrder = orders[viewingIndex];
  const viewedStatus = viewedOrder ? statuses[viewedOrder.id] : null;
  const currentIndex = viewedStatus ? STEPS.findIndex((s) => s.key === viewedStatus.kitchen_status) : -1;
  const canPlaceNew = viewedStatus?.kitchen_status === 'PREPARING' || viewedStatus?.kitchen_status === 'READY';
  const isServed = viewedStatus?.kitchen_status === 'SERVED';

  return (
    <div className="landing-page">
      <div className="landing-card status-card">
        {orders.length > 1 && (
          <div className="order-history-list">
            {orders.map((o, i) => {
              const s = statuses[o.id];
              const label = s?.kitchen_status ? s.kitchen_status.charAt(0) + s.kitchen_status.slice(1).toLowerCase() : 'Loading…';
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`order-history-item ${i === viewingIndex ? 'order-history-item-active' : ''}`}
                  onClick={() => onSelectOrder(i)}
                >
                  <span>Order #{i + 1}</span>
                  <span className={`order-status-badge ${STATUS_BADGE_CLASS[s?.kitchen_status] || ''}`}>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="login-title">Order #{viewingIndex + 1}</div>
        {viewedStatus && <div className="login-subtitle">Table {viewedStatus.table_number} · {formatMoney(viewedStatus.total)}</div>}
        {error && <div className="error-banner">{error}</div>}

        <div className="status-stepper">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`status-step ${i <= currentIndex ? 'status-step-done' : ''} ${i === currentIndex ? 'status-step-current' : ''}`}
            >
              <div className="status-step-icon">{s.icon}</div>
              <div className="status-step-label">{s.label}</div>
            </div>
          ))}
        </div>

        {canPlaceNew && (
          <button className="btn btn-primary login-submit" onClick={onPlaceNewOrder}>+ Place New Order</button>
        )}

        {isServed && (
          <button className="btn login-submit" onClick={onStartOver}>Place Another Order</button>
        )}
      </div>
    </div>
  );
}
