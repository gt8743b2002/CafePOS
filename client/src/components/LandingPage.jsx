export default function LandingPage({ onSelectCustomer, onSelectCashier }) {
  return (
    <div className="landing-page">
      <div className="landing-card">
        <img
          className="login-logo"
          src="/logo.png"
          alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="login-title">CafePOS</div>
        <div className="login-subtitle">Welcome! How would you like to continue?</div>

        <div className="landing-choice-row">
          <button className="landing-choice-btn landing-choice-primary" onClick={onSelectCustomer}>
            <span className="landing-choice-icon">🧾</span>
            Customer Order
            <span className="landing-choice-desc">Browse the menu &amp; order from your table</span>
          </button>
          <button className="landing-choice-btn" onClick={onSelectCashier}>
            <span className="landing-choice-icon">🔑</span>
            Cashier Login
            <span className="landing-choice-desc">Staff sign-in</span>
          </button>
        </div>
      </div>
    </div>
  );
}
