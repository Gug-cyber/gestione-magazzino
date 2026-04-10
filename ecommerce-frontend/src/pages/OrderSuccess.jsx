import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { strapiAPI } from '../api/strapi';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !token) return;
    strapiAPI
      .getOrder(orderId, token)
      .then((data) => setOrder(data?.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '2px solid #22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--spacing-lg)',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>Ordine confermato!</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
        Grazie per il tuo acquisto. Riceverai una email di conferma a breve.
      </p>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Caricamento dettagli...</p>
      ) : order ? (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-xl)',
            marginBottom: 'var(--spacing-xl)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-sm)',
              fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>Numero ordine</span>
            <strong>
              {order.attributes?.orderNumber || `#${orderId}`}
            </strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-sm)',
              fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>Totale</span>
            <strong>€{order.attributes?.total?.toFixed(2) || '—'}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>Stato</span>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--color-accent)',
                padding: '2px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              In elaborazione
            </span>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/ordini"
          className="btn-primary"
          style={{
            display: 'inline-flex',
            textDecoration: 'none',
            padding: '12px 24px',
          }}
        >
          I miei ordini
        </Link>
        <Link
          to="/catalogo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
            padding: '12px 24px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Continua lo shopping
        </Link>
      </div>
    </div>
  );
}
