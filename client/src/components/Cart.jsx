import { useEffect, useRef, useState } from 'react';
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

const DISMISS_THRESHOLD = 80;

export default function Cart({ cart, cashierName, onRemove, onQtyChange, onCheckout, checkingOut }) {
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(null);

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, l) => sum + l.qty, 0);
  const isEmpty = cart.length === 0;

  // Auto-collapse/hide the drawer once the cart empties out from under it.
  useEffect(() => {
    if (isEmpty) setExpanded(false);
  }, [isEmpty]);

  function handleDragStart(e) {
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function handleDragMove(e) {
    if (dragStartY.current == null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function handleDragEnd() {
    if (dragY > DISMISS_THRESHOLD) setExpanded(false);
    setDragY(0);
    setDragging(false);
    dragStartY.current = null;
  }

  return (
    <>
      <div
        className={`cart-overlay ${expanded ? 'cart-overlay-visible' : ''}`}
        onClick={() => setExpanded(false)}
        aria-hidden="true"
      />

      <aside
        className={`cart ${isEmpty ? 'cart-hidden' : ''} ${expanded ? 'cart-expanded' : 'cart-collapsed'}`}
        style={expanded ? { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : undefined } : undefined}
      >
        <div
          className="cart-drag-handle"
          role="button"
          tabIndex={0}
          aria-label="Collapse order summary"
          onClick={() => setExpanded(false)}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(false); }}
        >
          <span className="cart-drag-handle-bar" />
        </div>

        <div className="cart-header">
          <img
            className="app-logo"
            src="/logo.png"
            alt=""
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span>Current Order</span>
          {cashierName && <span className="cart-cashier">Cashier: {cashierName}</span>}
          <button className="icon-btn cart-close" onClick={() => setExpanded(false)} aria-label="Close order summary">✕</button>
        </div>

        <div className="cart-items">
          {isEmpty && <div className="empty-state small">Cart is empty. Tap a product to add it.</div>}
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

        <button className="btn btn-primary btn-checkout" disabled={isEmpty || checkingOut} onClick={onCheckout}>
          {checkingOut ? 'Processing…' : 'Charge'}
        </button>
      </aside>

      {!isEmpty && (
        <button
          className={`cart-mobile-bar ${expanded ? 'cart-mobile-bar-hidden' : ''}`}
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          aria-label={`View order: ${itemCount} item${itemCount === 1 ? '' : 's'}, total ${formatMoney(total)}`}
        >
          <span className="cart-mobile-bar-count">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
          <span className="cart-mobile-bar-total">{formatMoney(total)}</span>
          <span className="cart-mobile-bar-charge">Charge</span>
        </button>
      )}
    </>
  );
}
