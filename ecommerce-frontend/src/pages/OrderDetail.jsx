import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { strapiAPI } from '../api/strapi';

const STATUS_LABELS = {
  pending: 'In attesa',
  processing: 'In elaborazione',
  shipped: 'Spedito',
  delivered: 'Consegnato',
  cancelled: 'Annullato',
};

const STATUS_COLORS = {
  pending: 'rgba(245, 158, 11, 0.15)',
  processing: 'rgba(59, 130, 246, 0.15)',
  shipped: 'rgba(139, 92, 246, 0.15)',
  delivered: 'rgba(34, 197, 94, 0.15)',
  cancelled: 'rgba(239, 68, 68, 0.15)',
};

const STATUS_TEXT_COLORS = {
  pending: 'var(--color-accent)',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: 'var(--color-error)',
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId || !token) return;
    setLoading(true);
    strapiAPI
      .getOrder(orderId, token)
      .then((data) => setOrder(data?.data))
      .catch(() => setError('Ordine non trovato'))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Caricamento ordine...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || 'Ordine non trovato'}</p>
        <Link to="/ordini" style={{ color: 'var(--color-accent)', textDecoration: 'none', marginTop: 'var(--spacing-md)', display: 'inline-block' }}>
          Torna agli ordini
        </Link>
      </div>
    );
  }

  const attrs = order.attributes || {};
  const status = attrs.status || 'pending';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <Link
          to="/ordini"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Ordini
        </Link>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {attrs.orderNumber || `#${orderId}`}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ margin: 0 }}>Dettaglio Ordine</h1>
        <span
          style={{
            background: STATUS_COLORS[status],
            color: STATUS_TEXT_COLORS[status],
            padding: '4px 14px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      {/* Prodotti */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: 15 }}>
          Prodotti
        </h3>
        {(attrs.items || []).map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--spacing-sm) 0',
              borderBottom: idx < (attrs.items.length - 1) ? '1px solid var(--color-border)' : 'none',
              fontSize: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{item.product?.title || 'Prodotto'}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                Qtà: {item.quantity} × €{item.priceAtTime?.toFixed(2)}
              </div>
            </div>
            <div style={{ fontWeight: 600 }}>
              €{(item.quantity * item.priceAtTime).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        {/* Spedizione */}
        {attrs.shippingAddress && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-xl)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: 15 }}>
              Spedizione
            </h3>
            <address style={{ fontStyle: 'normal', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
              {attrs.shippingAddress.firstName} {attrs.shippingAddress.lastName}<br />
              {attrs.shippingAddress.address}<br />
              {attrs.shippingAddress.zip} {attrs.shippingAddress.city} ({attrs.shippingAddress.province})<br />
              {attrs.shippingAddress.country}
            </address>
          </div>
        )}

        {/* Totali */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-xl)',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: 15 }}>
            Totali
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Subtotale</span>
              <span>€{attrs.subtotal?.toFixed(2) || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Spedizione</span>
              <span>{attrs.shippingCost === 0 ? 'Gratuita' : `€${attrs.shippingCost?.toFixed(2)}`}</span>
            </div>
            {attrs.paymentFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Commissione pagamento</span>
                <span>€{attrs.paymentFee?.toFixed(2)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--spacing-sm)',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              <span>Totale</span>
              <span>€{attrs.total?.toFixed(2) || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
