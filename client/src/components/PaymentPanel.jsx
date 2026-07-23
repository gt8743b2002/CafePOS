import { useMemo, useState } from 'react';
import { ORDER_TYPES, PAYMENT_METHODS, QUICK_CASH_AMOUNTS } from '../constants';
import { formatMoney } from '../pricing';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export default function PaymentPanel({ total, cashierName, onCancel, onConfirm, submitting }) {
  const [step, setStep] = useState('type'); // 'type' | 'method' | 'cash'
  const [orderType, setOrderType] = useState(null);
  const [cashInput, setCashInput] = useState('');

  const cashReceived = Number(cashInput) || 0;
  const changeDue = useMemo(() => Math.max(0, Math.round((cashReceived - total) * 100) / 100), [cashReceived, total]);
  const shortBy = Math.max(0, Math.round((total - cashReceived) * 100) / 100);

  function pressKey(key) {
    if (key === '⌫') {
      setCashInput((cur) => cur.slice(0, -1));
      return;
    }
    if (key === '.' && cashInput.includes('.')) return;
    setCashInput((cur) => (cur + key).slice(0, 10));
  }

  function chooseOrderType(value) {
    setOrderType(value);
    setStep('method');
  }

  function choosePaymentMethod(method) {
    if (method === 'CARD') {
      onConfirm({ orderType, paymentMethod: 'CARD', cashReceived: null, changeDue: null });
      return;
    }
    setStep('cash');
  }

  function confirmCash() {
    if (cashReceived < total) return;
    onConfirm({ orderType, paymentMethod: 'CASH', cashReceived, changeDue });
  }

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal payment-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Charge {formatMoney(total)}</div>
            {cashierName && <div className="modal-subtitle">Cashier: {cashierName}</div>}
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {step === 'type' && (
            <div className="option-group">
              <div className="option-label">Order Type</div>
              <div className="payment-choice-row">
                {ORDER_TYPES.map((t) => (
                  <button key={t.value} className="payment-choice-btn" onClick={() => chooseOrderType(t.value)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'method' && (
            <div className="option-group">
              <div className="option-label">Payment Method</div>
              <div className="payment-choice-row">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.value} className="payment-choice-btn" onClick={() => choosePaymentMethod(m.value)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <button className="btn payment-back-btn" onClick={() => setStep('type')}>← Back</button>
            </div>
          )}

          {step === 'cash' && (
            <div className="cash-panel">
              <div className="cash-display">
                <div className="cash-display-row">
                  <span>Due</span>
                  <span>{formatMoney(total)}</span>
                </div>
                <div className="cash-display-tendered">{cashInput ? formatMoney(cashReceived) : '$0.00'}</div>
                <div className={`cash-display-row ${cashReceived >= total ? 'cash-ok' : 'cash-short'}`}>
                  {cashReceived >= total ? <span>Change Due</span> : <span>Remaining</span>}
                  <span>{cashReceived >= total ? formatMoney(changeDue) : formatMoney(shortBy)}</span>
                </div>
              </div>

              <div className="quick-cash-row">
                {QUICK_CASH_AMOUNTS.map((amt) => (
                  <button key={amt} className="pill" onClick={() => setCashInput(String(amt))}>${amt}</button>
                ))}
                <button className="pill" onClick={() => setCashInput(String(total))}>Exact</button>
              </div>

              <div className="keypad">
                {KEYPAD_KEYS.map((key) => (
                  <button key={key} className="keypad-key" onClick={() => pressKey(key)}>{key}</button>
                ))}
              </div>

              <div className="payment-actions">
                <button className="btn payment-back-btn" onClick={() => { setStep('method'); setCashInput(''); }}>← Back</button>
                <button className="btn btn-primary" disabled={cashReceived < total || submitting} onClick={confirmCash}>
                  {submitting ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
