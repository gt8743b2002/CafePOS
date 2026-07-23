import { TAX_RATE } from '../constants';
import { formatMoney } from '../pricing';

function describeLine(line) {
  const parts = [];
  if (line.size) parts.push(line.size.charAt(0) + line.size.slice(1).toLowerCase());
  if (line.sugar_level) parts.push(`${line.sugar_level} sugar`);
  if (line.ice_level) parts.push(line.ice_level);
  if (line.milk_level && line.milk_level !== 'Regular') parts.push(`${line.milk_level} milk`);
  if (line.addons?.length) parts.push(...line.addons.map((a) => `+${a.name}`));
  return parts.join(' · ');
}

export default function Cart({ cart, cashierName, onRemove, onQtyChange, onCheckout, checkingOut }) {
  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return (
    <aside className="cart">
      <div className="cart-header">
        <img
          className="app-logo"
          src="/logo.png"
          alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span>Current Order</span>
        {cashierName && <span className="cart-cashier">Cashier: {cashierName}</span>}
      </div>

      <div className="cart-items">
        {cart.length === 0 && <div className="empty-state small">Cart is empty. Tap a product to add it.</div>}
        {cart.map((line) => (
          <div className="cart-line" key={line.key}>
            <div className="cart-line-main">
              <div className="cart-line-name">{line.product.name}</div>
              {describeLine(line) && <div className="cart-line-desc">{describeLine(line)}</div>}
              {line.note && <div className="cart-line-note">"{line.note}"</div>}
            </div>
            <div className="cart-line-controls">
              <div className="qty-stepper small">
                <button onClick={() => onQtyChange(line.key, line.qty - 1)}>-</button>
                <span>{line.qty}</span>
                <button onClick={() => onQtyChange(line.key, line.qty + 1)}>+</button>
              </div>
              <div className="cart-line-price">{formatMoney(line.unitPrice * line.qty)}</div>
              <button className="icon-btn" onClick={() => onRemove(line.key)} aria-label="Remove">✕</button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-totals">
        <div className="totals-row"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
        <div className="totals-row"><span>Tax ({Math.round(TAX_RATE * 100)}%)</span><span>{formatMoney(tax)}</span></div>
        <div className="totals-row totals-total"><span>Total</span><span>{formatMoney(total)}</span></div>
      </div>

      <button className="btn btn-primary btn-checkout" disabled={cart.length === 0 || checkingOut} onClick={onCheckout}>
        {checkingOut ? 'Processing…' : 'Charge'}
      </button>
    </aside>
  );
}
