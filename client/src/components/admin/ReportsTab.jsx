import { useEffect, useState } from 'react';
import { api } from '../../api';
import { formatMoney } from '../../pricing';

export default function ReportsTab() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getReportSummary(), api.getReportDaily(14)])
      .then(([s, d]) => { setSummary(s); setDaily(d); })
      .catch((e) => setError(e.message));
  }, []);

  const maxTotal = Math.max(1, ...daily.map((d) => d.total));

  return (
    <div className="admin-section">
      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      <h2>Today</h2>
      {summary && (
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className="stat-label">Orders</div>
            <div className="stat-value">{summary.orderCount}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Subtotal</div>
            <div className="stat-value">{formatMoney(summary.subtotal)}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">Tax</div>
            <div className="stat-value">{formatMoney(summary.tax)}</div>
          </div>
          <div className="stat-tile stat-tile-accent">
            <div className="stat-label">Total</div>
            <div className="stat-value">{formatMoney(summary.total)}</div>
          </div>
        </div>
      )}

      {summary?.topItems?.length > 0 && (
        <>
          <h2>Top Items Today</h2>
          <table className="admin-table">
            <thead><tr><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {summary.topItems.map((it) => (
                <tr key={it.name}><td>{it.name}</td><td>{it.qty}</td><td>{formatMoney(it.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Last 14 Days</h2>
      <div className="bar-report">
        {daily.map((d) => (
          <div className="bar-report-row" key={d.date} title={`${d.date}: ${formatMoney(d.total)} across ${d.orderCount} order(s)`}>
            <div className="bar-report-date">{d.date.slice(5)}</div>
            <div className="bar-report-track">
              <div className="bar-report-fill" style={{ width: `${(d.total / maxTotal) * 100}%` }} />
            </div>
            <div className="bar-report-value">{formatMoney(d.total)}</div>
          </div>
        ))}
        {daily.length === 0 && <div className="empty-state">No sales recorded yet.</div>}
      </div>
    </div>
  );
}
