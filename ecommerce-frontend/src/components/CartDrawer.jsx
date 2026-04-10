import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { CartItem } from './CartItem';
import EmptyCart from './EmptyCart';
import CartSummary from './CartSummary';

const SWIPE_CLOSE_THRESHOLD = 150;

export function CartDrawer({ isOpen, onClose }) {
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [clearHover, setClearHover] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (delta > SWIPE_CLOSE_THRESHOLD) onClose();
    setTouchStart(null);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 150,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <EmptyCart onClose={onClose} />
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
            <CartSummary />

            <button
              onClick={() => {
                onClose();
                navigate(isAuthenticated ? '/checkout' : '/login');
              }}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {isAuthenticated ? (
                <>Vai al checkout</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Accedi per il checkout
                </>
              )}
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

            {items.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Sei sicuro di voler svuotare il carrello?')) {
                    clearCart();
                  }
                }}
                onMouseEnter={() => setClearHover(true)}
                onMouseLeave={() => setClearHover(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: clearHover ? 'var(--color-error)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  textDecoration: 'underline',
                  textAlign: 'center',
                  width: '100%',
                  padding: 'var(--spacing-xs) 0',
                  transition: 'color var(--transition-fast)',
                }}
              >
                Svuota carrello
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
