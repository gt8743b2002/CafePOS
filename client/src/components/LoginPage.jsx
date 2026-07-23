import { useState } from 'react';
import { api, setToken } from '../api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = await api.login(username.trim(), password);
      setToken(token);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img
          className="login-logo"
          src="/logo.png"
          alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="login-title">CafePOS</div>
        <div className="login-subtitle">Sign in to continue</div>

        {error && <div className="error-banner">{error}</div>}

        <label className="login-label">Username</label>
        <input
          className="login-input"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />

        <label className="login-label">Password</label>
        <input
          className="login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />

        <button className="btn btn-primary login-submit" type="submit" disabled={busy || !username || !password}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
