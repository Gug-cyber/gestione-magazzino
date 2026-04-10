import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Orders() {
  const { user } = useAuth();

  return (
    <div className="empty-state" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="empty-state-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <h3>I miei ordini</h3>
      <p style={{ marginBottom: 'var(--spacing-sm)' }}>
        Ciao <strong style={{ color: 'var(--color-accent)' }}>{user?.username}</strong>!
      </p>
      <p>Non hai ancora effettuato ordini. Lo storico ordini sarà disponibile a breve.</p>
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
        Inizia a fare shopping
      </Link>
    </div>
  );
}
