import { formatMoney } from '../pricing';
import { ORDER_TYPES, PAYMENT_METHODS } from '../constants';

function labelFor(list, value) {
  return list.find((x) => x.value === value)?.label || value;
}

function lineDescription(item) {
  const parts = [];
  if (item.size) parts.push(item.size.charAt(0) + item.size.slice(1).toLowerCase());
  if (item.sugar_level) parts.push(`${item.sugar_level} sugar`);
  if (item.ice_level) parts.push(item.ice_level);
  if (item.milk_level && item.milk_level !== 'Regular') parts.push(`${item.milk_level} milk`);
  if (item.addons?.length) parts.push(...item.addons.map((a) => `+${a.name}`));
  return parts.join(' · ');
}

export default function Receipt({ order, onClose }) {
  const createdAt = new Date(order.created_at);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal receipt-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div id="receipt-print" className="receipt-paper">
          <img
            className="receipt-logo"
            src="/logo.png"
            alt="CafePOS"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="receipt-shop-name">CafePOS</div>
          <div className="receipt-meta">Order #{order.id}</div>
          <div className="receipt-meta">{createdAt.toLocaleString()}</div>
          <div className="receipt-meta">{labelFor(ORDER_TYPES, order.order_type)} · {labelFor(PAYMENT_METHODS, order.payment_method)}</div>
          {order.cashier_name && <div className="receipt-meta">Served by {order.cashier_name}</div>}
          <hr />
          {order.items.map((item) => (
            <div className="receipt-item" key={item.id}>
              <div className="receipt-item-row">
                <span>{item.qty} × {item.name}</span>
                <span>{formatMoney(item.line_total)}</span>
              </div>
              {lineDescription(item) && <div className="receipt-item-desc">{lineDescription(item)}</div>}
              {item.note && <div className="receipt-item-desc">"{item.note}"</div>}
            </div>
          ))}
          <hr />
          <div className="receipt-item-row"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></div>
          <div className="receipt-item-row"><span>Tax</span><span>{formatMoney(order.tax)}</span></div>
          <div className="receipt-item-row receipt-total"><span>Total</span><span>{formatMoney(order.total)}</span></div>
          {order.payment_method === 'CASH' && (
            <>
              <div className="receipt-item-row"><span>Cash</span><span>{formatMoney(order.cash_received)}</span></div>
              <div className="receipt-item-row"><span>Change</span><span>{formatMoney(order.change_due)}</span></div>
            </>
          )}
          <hr />
          <div className="receipt-thanks">Thank you!</div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}>Print Receipt</button>
        </div>
      </div>
    </div>
  );
}
