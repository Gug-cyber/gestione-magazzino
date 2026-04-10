import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  function validate() {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Email o username obbligatorio';
    }
    if (!password) {
      newErrors.password = 'Password obbligatoria';
    } else if (password.length < 6) {
      newErrors.password = 'La password deve avere almeno 6 caratteri';
    }
    return newErrors;
  }

  function handleBlur(field) {
    const newErrors = { ...errors };
    if (field === 'identifier' && !identifier.trim()) {
      newErrors.identifier = 'Email o username obbligatorio';
    } else if (field === 'identifier') {
      delete newErrors.identifier;
    }
    if (field === 'password' && !password) {
      newErrors.password = 'Password obbligatoria';
    } else if (field === 'password' && password.length < 6) {
      newErrors.password = 'La password deve avere almeno 6 caratteri';
    } else if (field === 'password') {
      delete newErrors.password;
    }
    setErrors(newErrors);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Errore di connessione, riprova');
      setTimeout(() => setApiError(''), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: 'var(--spacing-lg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'var(--color-accent-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-md)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Accedi</h1>
          <p style={{ margin: 'var(--spacing-sm) 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Bentornato nel TCG Store
          </p>
        </div>

        {/* API Error */}
        {apiError && (
          <div
            style={{
              padding: 'var(--spacing-md)',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error)',
              fontSize: 14,
              marginBottom: 'var(--spacing-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Identifier */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="identifier"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              Email o Username
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); if (apiError) setApiError(''); }}
                onBlur={() => handleBlur('identifier')}
                placeholder="email@esempio.com"
                disabled={loading}
                className="search-input"
                style={{
                  paddingLeft: '42px',
                  borderColor: errors.identifier ? 'var(--color-error)' : undefined,
                }}
                autoComplete="username"
              />
            </div>
            {errors.identifier && (
              <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                {errors.identifier}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (apiError) setApiError(''); }}
                onBlur={() => handleBlur('password')}
                placeholder="Min. 6 caratteri"
                disabled={loading}
                className="search-input"
                style={{
                  paddingLeft: '42px',
                  paddingRight: '42px',
                  borderColor: errors.password ? 'var(--color-error)' : undefined,
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember me & forgot password */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Ricordami
            </label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-accent)',
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Password dimenticata?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? (
              <>
                <svg
                  style={{ animation: 'spin 1s linear infinite' }}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        {/* Register link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 'var(--spacing-lg)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
          }}
        >
          Non hai un account?{' '}
          <Link to="/registrati" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            Registrati
          </Link>
        </p>
      </div>

      <ForgotPasswordModal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
