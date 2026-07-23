import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../pricing';

const STEPS = [
  { key: 'RECEIVED', label: 'Received', icon: '📝' },
  { key: 'PREPARING', label: 'Preparing', icon: '👩‍🍳' },
  { key: 'READY', label: 'Ready', icon: '🔔' },
  { key: 'SERVED', label: 'Served', icon: '✅' },
];

export default function OrderStatusView({ orderId, guestToken, onNewOrder }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    function poll() {
      api.getGuestOrderStatus(orderId, guestToken)
        .then((s) => { if (!cancelled) setStatus(s); })
        .catch((e) => { if (!cancelled) setError(e.message); });
    }
    poll();
    const timer = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [orderId, guestToken]);

  const currentIndex = status ? STEPS.findIndex((s) => s.key === status.kitchen_status) : -1;

  return (
    <div className="landing-page">
      <div className="landing-card status-card">
        <div className="login-title">Order #{orderId}</div>
        {status && <div className="login-subtitle">Table {status.table_number} · {formatMoney(status.total)}</div>}
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

        {status?.kitchen_status === 'SERVED' && (
          <button className="btn btn-primary login-submit" onClick={onNewOrder}>Place Another Order</button>
        )}
      </div>
    </div>
  );
}
