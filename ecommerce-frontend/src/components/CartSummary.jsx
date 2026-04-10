import React from 'react';
import { useCart } from '../hooks/useCart';

/**
 * CartSummary — footer summary block for CartDrawer.
 * Shows subtotal, shipping placeholder and total.
 */
export default function CartSummary() {
  const { items, totalItems, totalPrice } = useCart();

  const shippingLabel = 'Da calcolare';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
      }}
    >
      {/* Subtotale */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Subtotale ({totalItems} {totalItems === 1 ? 'articolo' : 'articoli'})
        </span>
        <span style={{ color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 600 }}>
          {totalPrice.toFixed(2)} EUR
        </span>
      </div>

      {/* Spedizione */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Spedizione</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
          {shippingLabel}
        </span>
      </div>

      {/* Separator */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          margin: 'var(--spacing-xs) 0',
        }}
      />

      {/* Totale */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: 'var(--color-text-primary)',
            fontSize: '15px',
            fontWeight: 600,
          }}
        >
          Totale
        </span>
        <span
          style={{
            color: 'var(--color-accent)',
            fontSize: '20px',
            fontWeight: 700,
          }}
        >
          {totalPrice.toFixed(2)} EUR
        </span>
      </div>
    </div>
  );
}
