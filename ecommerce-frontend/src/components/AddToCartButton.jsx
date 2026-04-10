import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';

const SIMULATED_LOADING_DELAY = 300;
const SUCCESS_STATE_DURATION = 1500;

/**
 * Reusable AddToCartButton with idle / loading / success states.
 *
 * Props:
 *  product      – full Strapi product object
 *  variant      – 'primary' | 'icon' | 'compact'   (default: 'primary')
 *  showQuantity – show quantity stepper (default: false)
 *  onAdded      – optional callback fired after successful add
 */
export default function AddToCartButton({
  product,
  variant = 'primary',
  showQuantity = false,
  onAdded,
}) {
  const { addToCart } = useCart();
  const [status, setStatus] = useState('idle'); // idle | loading | success
  const isOutOfStock = (product?.attributes?.quantity ?? 0) === 0;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || status !== 'idle') return;

    setStatus('loading');
    setTimeout(() => {
      addToCart(product, 1);
      setStatus('success');
      onAdded?.();
      setTimeout(() => setStatus('idle'), SUCCESS_STATE_DURATION);
    }, SIMULATED_LOADING_DELAY);
  };

  // Variant-specific base styles
  const isIcon = variant === 'icon';
  const isCompact = variant === 'compact';

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isIcon ? 0 : '8px',
    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
    opacity: isOutOfStock ? 0.5 : 1,
    border: 'none',
    fontFamily: 'inherit',
    fontWeight: 600,
    transition: 'all var(--transition-fast)',
    ...(isIcon
      ? {
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: status === 'success' ? 'rgba(34,197,94,0.15)' : 'var(--color-surface-elevated)',
          border: `1px solid ${status === 'success' ? 'var(--color-success)' : 'var(--color-border)'}`,
          color: status === 'success' ? 'var(--color-success)' : 'var(--color-text-secondary)',
        }
      : isCompact
      ? {
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          background: status === 'success' ? 'var(--color-success)' : 'var(--gradient-gold)',
          color: '#fff',
        }
      : {
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          background: status === 'success' ? 'var(--color-success)' : 'var(--gradient-gold)',
          color: '#fff',
          boxShadow: status === 'idle' && !isOutOfStock ? 'var(--shadow-glow)' : 'none',
          transform: 'translateY(0)',
          width: '100%',
        }),
  };

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const CartIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );

  const SpinnerIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  const renderIcon = () => {
    if (status === 'loading') return <SpinnerIcon />;
    if (status === 'success') return <CheckIcon />;
    return <CartIcon />;
  };

  const renderLabel = () => {
    if (isIcon) return null;
    if (status === 'loading') return 'Aggiunta...';
    if (status === 'success') return 'Aggiunto!';
    if (isOutOfStock) return 'Esaurito';
    return isCompact ? 'Aggiungi' : 'Aggiungi al carrello';
  };

  return (
    <button
      onClick={handleClick}
      disabled={isOutOfStock || status === 'loading'}
      aria-label={isIcon ? 'Aggiungi al carrello' : undefined}
      className={status === 'success' ? 'bounce-in' : ''}
      style={baseStyle}
    >
      {renderIcon()}
      {renderLabel()}
    </button>
  );
}
