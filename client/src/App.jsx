import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';
import { TAX_RATE } from './constants';
import CategoryTabs from './components/CategoryTabs';
import ProductGrid from './components/ProductGrid';
import CustomizeModal from './components/CustomizeModal';
import Cart from './components/Cart';
import PaymentPanel from './components/PaymentPanel';
import Receipt from './components/Receipt';
import AdminPanel from './components/admin/AdminPanel';
import HistoryTab from './components/admin/HistoryTab';
import LoginPage from './components/LoginPage';
import { useIdleLogout } from './useIdleLogout';
import './App.css';

let cartKeyCounter = 0;

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('pos');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customizeTarget, setCustomizeTarget] = useState(null);
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [error, setError] = useState('');

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setView('pos');
    setCart([]);
  }, []);

  useIdleLogout(!!user, handleLogout);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (getToken()) {
      api.me().then(setUser).catch(() => {}).finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  async function refreshCatalog() {
    const [cats, prods, adds] = await Promise.all([api.getCategories(), api.getProducts(), api.getAddons()]);
    setCategories(cats);
    setProducts(prods);
    setAddons(adds);
  }

  useEffect(() => {
    if (user) refreshCatalog().catch((e) => setError(e.message));
  }, [user]);

  const visibleProducts = selectedCategory ? products.filter((p) => p.category_id === selectedCategory) : products;
  const cartSubtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const cartTotal = Math.round((cartSubtotal + cartSubtotal * TAX_RATE) * 100) / 100;

  function addToCart(line) {
    setCart((cur) => [...cur, { ...line, key: `line-${cartKeyCounter++}` }]);
    setCustomizeTarget(null);
  }

  function removeFromCart(key) {
    setCart((cur) => cur.filter((l) => l.key !== key));
  }

  function changeQty(key, qty) {
    if (qty < 1) return removeFromCart(key);
    setCart((cur) => cur.map((l) => (l.key === key ? { ...l, qty } : l)));
  }

  async function handleCharge({ orderType, paymentMethod, cashReceived }) {
    setCheckingOut(true);
    setError('');
    try {
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
      const order = await api.createOrder(items, {
        order_type: orderType,
        payment_method: paymentMethod,
        cash_received: cashReceived,
      });
      setReceiptOrder(order);
      setCart([]);
      setShowPayment(false);
      await refreshCatalog(); // stock levels changed
    } catch (e) {
      setError(e.message);
    } finally {
      setCheckingOut(false);
    }
  }

  if (!authChecked) {
    return <div className="app-loading" />;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  if (view === 'admin' && user.role === 'ADMIN') {
    return <AdminPanel user={user} onBack={() => { setView('pos'); refreshCatalog(); }} onLogout={handleLogout} />;
  }

  if (view === 'history') {
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
            CafePOS — Sales History
          </div>
          <div className="header-actions">
            <div className="user-badge">
              <span className="user-badge-name">{user.name}</span>
              <span className="user-badge-role">{user.role === 'ADMIN' ? 'Admin' : 'Cashier'}</span>
            </div>
            <button className="btn" onClick={() => setView('pos')}>← Back to POS</button>
            <button className="btn" onClick={handleLogout}>Log Out</button>
          </div>
        </header>
        <div className="admin-body">
          <HistoryTab user={user} />
        </div>
      </div>
    );
  }

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
            <span className="user-badge-name">{user.name}</span>
            <span className="user-badge-role">{user.role === 'ADMIN' ? 'Admin' : 'Cashier'}</span>
          </div>
          <button className="btn" onClick={() => setView('history')}>Sales History</button>
          {user.role === 'ADMIN' && <button className="btn" onClick={() => setView('admin')}>Admin</button>}
          <button className="btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      {error && <div className="error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      <div className="app-body">
        <main className="catalog">
          <CategoryTabs categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
          <ProductGrid products={visibleProducts} onSelect={setCustomizeTarget} />
        </main>

        <Cart
          cart={cart}
          cashierName={user.name}
          onRemove={removeFromCart}
          onQtyChange={changeQty}
          onCheckout={() => setShowPayment(true)}
          checkingOut={checkingOut}
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

      {showPayment && (
        <PaymentPanel
          total={cartTotal}
          cashierName={user.name}
          onCancel={() => setShowPayment(false)}
          onConfirm={handleCharge}
          submitting={checkingOut}
        />
      )}

      {receiptOrder && <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    </div>
  );
}
