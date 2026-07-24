import { useEffect, useState } from 'react';
import { api } from '../../api';
import { TAX_RATE } from '../../constants';
import CategoryPicker from './CategoryPicker';
import ProductGrid from '../ProductGrid';
import CustomizeModal from '../CustomizeModal';
import Cart from '../Cart';
import GuestEntryForm from './GuestEntryForm';
import GuestCheckoutPanel from './GuestCheckoutPanel';
import OrderStatusView from './OrderStatusView';

const SESSION_KEY = 'cafepos_guest_session';

let cartKeyCounter = 0;

export default function CustomerApp({ onExit }) {
  const [step, setStep] = useState('entry'); // entry | menu | checkout | status
  const [tableNumber, setTableNumber] = useState('');
  const [guestName, setGuestName] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customizeTarget, setCustomizeTarget] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null); // { id, guestToken }
  const [error, setError] = useState('');
  const [enteringMenu, setEnteringMenu] = useState(false);

  // Resume an in-flight order (e.g. after an accidental refresh while waiting).
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.activeOrderId && parsed.guestToken) {
        setTableNumber(parsed.tableNumber || '');
        setGuestName(parsed.guestName || '');
        setActiveOrder({ id: parsed.activeOrderId, guestToken: parsed.guestToken });
        setStep('status');
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  async function enterMenu(table, name) {
    setTableNumber(table);
    setGuestName(name);
    setError('');
    setEnteringMenu(true);
    const loadCatalog = () => Promise.all([api.getCategories(), api.getProducts(), api.getAddons()]);
    try {
      let cats, prods, adds;
      try {
        [cats, prods, adds] = await loadCatalog();
      } catch (firstError) {
        // The very first requests of a session can hit a cold-started backend
        // (e.g. Render's free/starter tier waking from idle) before it's ready.
        // These are read-only GETs, so retrying once is safe.
        console.warn('Catalog load failed, retrying once:', firstError);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        [cats, prods, adds] = await loadCatalog();
      }
      setCategories(cats);
      setProducts(prods);
      setAddons(adds);
      setStep('menu');
    } catch (e) {
      console.error('Failed to load menu:', e);
      setError(e.message || 'Could not load the menu. Please try again.');
    } finally {
      setEnteringMenu(false);
    }
  }

  const visibleProducts = selectedCategory ? products.filter((p) => p.category_id === selectedCategory) : products;
  const cartSubtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const cartTotal = Math.round((cartSubtotal + cartSubtotal * TAX_RATE) * 100) / 100;

  function addToCart(line) {
    setCart((cur) => [...cur, { ...line, key: `guest-line-${cartKeyCounter++}` }]);
    setCustomizeTarget(null);
  }
  function removeFromCart(key) {
    setCart((cur) => cur.filter((l) => l.key !== key));
  }
  function changeQty(key, qty) {
    if (qty < 1) return removeFromCart(key);
    setCart((cur) => cur.map((l) => (l.key === key ? { ...l, qty } : l)));
  }

  function handlePaymentSuccess(order, guestToken) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ tableNumber, guestName, activeOrderId: order.id, guestToken }));
    setActiveOrder({ id: order.id, guestToken });
    setCart([]);
    setStep('status');
  }

  function startNewOrder() {
    sessionStorage.removeItem(SESSION_KEY);
    setActiveOrder(null);
    setCart([]);
    setSelectedCategory(null);
    setStep('entry');
  }

  if (step === 'entry') {
    return <GuestEntryForm onSubmit={enterMenu} onCancel={onExit} submitting={enteringMenu} error={error} />;
  }

  if (step === 'status' && activeOrder) {
    return <OrderStatusView orderId={activeOrder.id} guestToken={activeOrder.guestToken} onNewOrder={startNewOrder} />;
  }

  const items = cart.map((l) => ({
    product_id: l.product.id,
    qty: l.qty,
    size: l.size,
    sugar_level: l.sugar_level,
    ice_level: l.ice_level,
    milk_level: l.milk_level,
    addons: l.addons,
    note: l.note,
  }));

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <img
            className="app-logo"
            src="/logo.png"
            alt="CafePOS"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
          />
          <span className="app-logo-fallback" style={{ display: 'none' }}>☕</span>
          CafePOS
        </div>
        <div className="header-actions">
          <div className="user-badge">
            <span className="user-badge-name">Table {tableNumber}</span>
            {guestName && <span className="user-badge-role">{guestName}</span>}
          </div>
          <button className="btn" onClick={onExit}>Exit</button>
        </div>
      </header>

      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      <div className="app-body">
        <main className="catalog">
          {selectedCategory === null ? (
            <CategoryPicker categories={categories} onSelect={setSelectedCategory} />
          ) : (
            <>
              <button className="btn category-back" onClick={() => setSelectedCategory(null)}>← Back to Categories</button>
              <ProductGrid products={visibleProducts} onSelect={setCustomizeTarget} />
            </>
          )}
        </main>

        <Cart
          cart={cart}
          onRemove={removeFromCart}
          onQtyChange={changeQty}
          onCheckout={() => setStep('checkout')}
          checkingOut={false}
        />
      </div>

      {customizeTarget && (
        <CustomizeModal
          product={customizeTarget}
          addons={addons}
          onCancel={() => setCustomizeTarget(null)}
          onAdd={addToCart}
        />
      )}

      {step === 'checkout' && (
        <GuestCheckoutPanel
          items={items}
          total={cartTotal}
          tableNumber={tableNumber}
          guestName={guestName}
          onCancel={() => setStep('menu')}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
