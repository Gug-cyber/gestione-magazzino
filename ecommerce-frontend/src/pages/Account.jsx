import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Account() {
  const { user } = useAuth();

  return (
    <div className="empty-state" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="empty-state-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h3>Il mio account</h3>
      <p style={{ marginBottom: 'var(--spacing-sm)' }}>
        Ciao <strong style={{ color: 'var(--color-accent)' }}>{user?.username}</strong>!
      </p>
      <p>La pagina account completa è in arrivo. Presto potrai gestire i tuoi dati personali.</p>
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
        Vai al catalogo
      </Link>
    </div>
  );
}
