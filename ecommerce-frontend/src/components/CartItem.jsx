import React from 'react';
import { useCart } from '../hooks/useCart';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export function CartItem({ item }) {
  const { removeFromCart, updateQuantity } = useCart();
  const { product, quantity } = item;
  const { attributes } = product;

  const imageUrl = attributes.images?.data?.[0]?.attributes?.url;
  const image = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${STRAPI_URL}${imageUrl}`
    : null;

  const maxQty = attributes.quantity ?? 99;
  const lineTotal = ((attributes.price ?? 0) * quantity).toFixed(2);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-md)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {image ? (
          <img
            src={image}
            alt={attributes.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-text-muted)' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 4px',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={attributes.title}
        >
          {attributes.title}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
          {(attributes.price ?? 0).toFixed(2)} EUR × {quantity} ={' '}
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            {lineTotal} EUR
          </span>
        </p>

        {/* Quantity controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
          <button
            onClick={() => updateQuantity(product.id, quantity - 1)}
            aria-label="Diminuisci quantità"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            −
          </button>
          <span
            style={{
              minWidth: 28,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(product.id, quantity + 1)}
            disabled={quantity >= maxQty}
            aria-label="Aumenta quantità"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: quantity >= maxQty ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
              cursor: quantity >= maxQty ? 'not-allowed' : 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => removeFromCart(product.id)}
        aria-label="Rimuovi dal carrello"
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-error)';
          e.currentTarget.style.color = 'var(--color-error)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
