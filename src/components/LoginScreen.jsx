import { useState } from 'react';

export default function LoginScreen({ onLogin, error: externalError }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onLogin(password);
    } catch (err) {
      setError(err.message || 'Wrong password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-icon">🏨</span>
          <h1 className="login-title">Vila Reserva</h1>
          <p className="login-sub">Управление на имот</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="password">Парола / Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {(error || externalError) && (
            <div className="login-error">{error || externalError}</div>
          )}

          <button type="submit" className="login-btn" disabled={loading || !password.trim()}>
            {loading ? '...' : 'Влез / Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
