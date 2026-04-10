import React from 'react';
import { useCart } from '../hooks/useCart';
import { CartItem } from './CartItem';

export function CartDrawer({ isOpen, onClose }) {
  const { items, totalItems, totalPrice, clearCart } = useCart();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 150,
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '100vw',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          zIndex: 151,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform var(--transition-normal)',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Carrello"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            Carrello
            {totalItems > 0 && (
              <span
                style={{
                  marginLeft: 'var(--spacing-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-muted)',
                }}
              >
                ({totalItems} {totalItems === 1 ? 'articolo' : 'articoli'})
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi carrello"
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 'var(--spacing-md)',
                color: 'var(--color-text-muted)',
                padding: 'var(--spacing-xl)',
              }}
            >
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Il carrello è vuoto</p>
              <p style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>
                Aggiungi prodotti dal catalogo per iniziare
              </p>
            </div>
          ) : (
            items.map((item) => (
              <CartItem key={item.product.id} item={item} />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              padding: 'var(--spacing-lg)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Subtotale</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent)' }}>
                {totalPrice.toFixed(2)} EUR
              </span>
            </div>

            <button
              disabled
              title="Prossimamente"
              className="btn-primary"
              style={{
                width: '100%',
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
            >
              Vai al checkout
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              Continua shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
