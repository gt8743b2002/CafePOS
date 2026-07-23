import { useState } from 'react';
import ProductsTab from './ProductsTab';
import HistoryTab from './HistoryTab';
import ReportsTab from './ReportsTab';
import CashiersTab from './CashiersTab';

const TABS = [
  { key: 'products', label: 'Products & Inventory' },
  { key: 'history', label: 'Sales History' },
  { key: 'reports', label: 'Reports' },
  { key: 'cashiers', label: 'Cashiers' },
];

export default function AdminPanel({ user, onBack, onLogout }) {
  const [tab, setTab] = useState('products');

  return (
    <div className="app admin">
      <header className="app-header">
        <div className="app-title">
          <img
            className="app-logo"
            src="/logo.png"
            alt="CafePOS"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
          />
          <span className="app-logo-fallback" style={{ display: 'none' }}>☕</span>
          CafePOS — Admin
        </div>
        <div className="header-actions">
          <div className="user-badge">
            <span className="user-badge-name">{user.name}</span>
            <span className="user-badge-role">Admin</span>
          </div>
          <button className="btn" onClick={onBack}>← Back to POS</button>
          <button className="btn" onClick={onLogout}>Log Out</button>
        </div>
      </header>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-body">
        {tab === 'products' && <ProductsTab />}
        {tab === 'history' && <HistoryTab user={user} />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'cashiers' && <CashiersTab currentUser={user} />}
      </div>
    </div>
  );
}
