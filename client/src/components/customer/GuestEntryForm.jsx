import { useState } from 'react';

export default function GuestEntryForm({ onSubmit, onCancel, submitting, error }) {
  const [tableNumber, setTableNumber] = useState('');
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!tableNumber.trim() || submitting) return;
    onSubmit(tableNumber.trim(), name.trim());
  }

  return (
    <div className="landing-page">
      <form className="landing-card" onSubmit={handleSubmit}>
        <img
          className="login-logo"
          src="/logo.png"
          alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="login-title">Your Order</div>
        <div className="login-subtitle">Tell us where you're sitting</div>

        {error && <div className="error-banner">{error}</div>}

        <label className="login-label">Table Number *</label>
        <input
          className="login-input"
          inputMode="numeric"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="e.g. 12"
        />

        <label className="login-label">Name (optional)</label>
        <input
          className="login-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
        />

        <button className="btn btn-primary login-submit" type="submit" disabled={!tableNumber.trim() || submitting}>
          {submitting ? 'Loading menu…' : 'Browse Menu'}
        </button>

        <button type="button" className="btn-link login-back" onClick={onCancel}>← Back</button>
      </form>
    </div>
  );
}
