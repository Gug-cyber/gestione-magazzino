import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  function validateField(field, value) {
    switch (field) {
      case 'username':
        if (!value.trim()) return 'Username obbligatorio';
        if (value.trim().length < 3) return 'Username deve avere almeno 3 caratteri';
        return '';
      case 'email':
        if (!value.trim()) return 'Email obbligatoria';
        if (!EMAIL_REGEX.test(value)) return 'Formato email non valido';
        return '';
      case 'password':
        if (!value) return 'Password obbligatoria';
        if (value.length < 6) return 'La password deve avere almeno 6 caratteri';
        return '';
      case 'confirmPassword':
        if (!value) return 'Conferma password obbligatoria';
        if (value !== password) return 'Le password non coincidono';
        return '';
      case 'acceptTerms':
        if (!value) return 'Devi accettare i termini e condizioni';
        return '';
      default:
        return '';
    }
  }

  function handleBlur(field) {
    const value = field === 'acceptTerms'
      ? acceptTerms
      : field === 'username' ? username
      : field === 'email' ? email
      : field === 'password' ? password
      : confirmPassword;

    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  }

  function validate() {
    const newErrors = {
      username: validateField('username', username),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
      acceptTerms: validateField('acceptTerms', acceptTerms),
    };
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    const hasErrors = Object.values(validationErrors).some(Boolean);
    if (hasErrors) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setApiError('');
    try {
      await register(username, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setApiError(err.message || 'Errore di connessione, riprova');
      setTimeout(() => setApiError(''), 5000);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field) => ({
    paddingLeft: '42px',
    borderColor: errors[field] ? 'var(--color-error)' : undefined,
  });

  const iconStyle = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
  };

  const eyeBtnStyle = {
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
  };

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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Crea account</h1>
          <p style={{ margin: 'var(--spacing-sm) 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
            Unisciti al TCG Store
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
          {/* Username */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="reg-username"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}
            >
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (apiError) setApiError(''); }}
                onBlur={() => handleBlur('username')}
                placeholder="Il tuo username"
                disabled={loading}
                className="search-input"
                style={inputStyle('username')}
                autoComplete="username"
              />
            </div>
            {errors.username && (
              <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                {errors.username}
              </p>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="reg-email"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}
            >
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (apiError) setApiError(''); }}
                onBlur={() => handleBlur('email')}
                placeholder="email@esempio.com"
                disabled={loading}
                className="search-input"
                style={inputStyle('email')}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="reg-password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (apiError) setApiError(''); }}
                onBlur={() => handleBlur('password')}
                placeholder="Min. 6 caratteri"
                disabled={loading}
                className="search-input"
                style={{ ...inputStyle('password'), paddingRight: '42px' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                style={eyeBtnStyle}
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

          {/* Confirm Password */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label
              htmlFor="reg-confirm"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}
            >
              Conferma Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (apiError) setApiError(''); }}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Ripeti la password"
                disabled={loading}
                className="search-input"
                style={{ ...inputStyle('confirmPassword'), paddingRight: '42px' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Nascondi password' : 'Mostra password'}
                style={eyeBtnStyle}
              >
                {showConfirm ? (
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
            {errors.confirmPassword && (
              <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-sm)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                lineHeight: 1.4,
              }}
            >
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  setErrors((prev) => ({ ...prev, acceptTerms: '' }));
                }}
                disabled={loading}
                style={{ accentColor: 'var(--color-accent)', marginTop: 2, flexShrink: 0 }}
              />
              Accetto i{' '}
              <Link
                to="/pagina/termini-e-condizioni"
                style={{ color: 'var(--color-accent)' }}
                onClick={(e) => e.stopPropagation()}
              >
                termini e condizioni
              </Link>
            </label>
            {errors.acceptTerms && (
              <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                {errors.acceptTerms}
              </p>
            )}
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
                Registrazione in corso...
              </>
            ) : (
              'Registrati'
            )}
          </button>
        </form>

        {/* Login link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 'var(--spacing-lg)',
            fontSize: 14,
            color: 'var(--color-text-muted)',
          }}
        >
          Hai già un account?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            Accedi
          </Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
