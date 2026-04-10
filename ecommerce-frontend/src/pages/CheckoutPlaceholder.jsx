import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function CheckoutPlaceholder() {
  const { user } = useAuth();

  return (
    <div className="empty-state" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="empty-state-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      </div>
      <h3>Checkout</h3>
      <p style={{ marginBottom: 'var(--spacing-sm)' }}>
        Ciao <strong style={{ color: 'var(--color-accent)' }}>{user?.username}</strong>!
      </p>
      <p>Il checkout completo è in arrivo. Presto potrai completare i tuoi acquisti in modo sicuro.</p>
      <Link
        to="/catalogo"
        className="btn-primary"
        style={{
          marginTop: 'var(--spacing-xl)',
          display: 'inline-flex',
          textDecoration: 'none',
          padding: '12px 24px',
          flex: 'none',
        }}
      >
        Continua lo shopping
      </Link>
    </div>
  );
}
