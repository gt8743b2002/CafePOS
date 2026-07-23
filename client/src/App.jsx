import { useState } from 'react';
import LandingPage from './components/LandingPage';
import StaffApp from './StaffApp';
import CustomerApp from './components/customer/CustomerApp';
import './App.css';

// Only an explicit /staff or /login URL should bootstrap straight into the
// staff app. Every other path (including /) shows the landing chooser —
// a leftover/expired auth token in storage must never force cashier login.
function initialMode() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/staff' || path === '/login' ? 'staff' : 'landing';
}

export default function App() {
  const [mode, setMode] = useState(initialMode);

  if (mode === 'customer') {
    return <CustomerApp onExit={() => setMode('landing')} />;
  }

  if (mode === 'staff') {
    return <StaffApp onExitToLanding={() => setMode('landing')} />;
  }

  return (
    <LandingPage
      onSelectCustomer={() => setMode('customer')}
      onSelectCashier={() => setMode('staff')}
    />
  );
}
