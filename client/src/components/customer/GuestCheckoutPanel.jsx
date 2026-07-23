import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { api } from '../../api';
import { formatMoney } from '../../pricing';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

let stripePromise = null;
function getStripe() {
  if (!STRIPE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_KEY);
  return stripePromise;
}

function StripeCardForm({ busy, setBusy, setError, onPaid, onBack }) {
  const stripe = useStripe();
  const elements = useElements();

  async function handlePay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    onPaid(paymentIntent.id);
  }

  return (
    <div>
      <PaymentElement />
      <div className="payment-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn payment-back-btn" onClick={onBack} disabled={busy}>← Back</button>
        <button type="button" className="btn btn-primary" onClick={handlePay} disabled={busy || !stripe}>
          {busy ? 'Processing…' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}

export default function GuestCheckoutPanel({ items, total, tableNumber, guestName, onCancel, onSuccess }) {
  const [method, setMethod] = useState(null); // 'stripe' | 'paypal'
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function chooseStripe() {
    setError('');
    setBusy(true);
    try {
      const { clientSecret } = await api.createStripeIntent(items);
      setClientSecret(clientSecret);
      setMethod('stripe');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function finalizeGuestOrder(paymentMethodName, paymentRef) {
    setBusy(true);
    setError('');
    try {
      const { order, guest_token } = await api.createGuestOrder({
        items,
        table_number: tableNumber,
        guest_name: guestName || null,
        payment_method: paymentMethodName,
        payment_ref: paymentRef,
      });
      onSuccess(order, guest_token);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal payment-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Checkout {formatMoney(total)}</div>
            <div className="modal-subtitle">Table {tableNumber}{guestName ? ` · ${guestName}` : ''}</div>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          {!method && (
            <div className="option-group">
              <div className="option-label">Payment Method</div>
              <div className="payment-choice-row">
                {STRIPE_KEY && (
                  <button className="payment-choice-btn" disabled={busy} onClick={chooseStripe}>💳 Card</button>
                )}
                {PAYPAL_CLIENT_ID && (
                  <button className="payment-choice-btn" disabled={busy} onClick={() => setMethod('paypal')}>🅿️ PayPal</button>
                )}
              </div>
              {!STRIPE_KEY && !PAYPAL_CLIENT_ID && (
                <div className="empty-state">Online payments aren't set up yet — please pay at the counter.</div>
              )}
            </div>
          )}

          {method === 'stripe' && clientSecret && (
            <Elements stripe={getStripe()} options={{ clientSecret }}>
              <StripeCardForm
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onPaid={(paymentIntentId) => finalizeGuestOrder('STRIPE', paymentIntentId)}
                onBack={() => setMethod(null)}
              />
            </Elements>
          )}

          {method === 'paypal' && (
            <div>
              <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
                <PayPalButtons
                  style={{ layout: 'vertical' }}
                  disabled={busy}
                  createOrder={async () => {
                    const { paypalOrderId } = await api.createPaypalOrder(items);
                    return paypalOrderId;
                  }}
                  onApprove={async (data) => {
                    await finalizeGuestOrder('PAYPAL', data.orderID);
                  }}
                  onError={(err) => setError(String(err))}
                />
              </PayPalScriptProvider>
              <button type="button" className="btn payment-back-btn" onClick={() => setMethod(null)} disabled={busy}>← Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
