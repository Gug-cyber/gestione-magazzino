import React from 'react';
import { useCart } from '../hooks/useCart';
import CartBadge from './CartBadge';

/**
 * FloatingCartButton — mobile-only FAB to open the cart drawer.
 *
 * Props:
 *  isHidden  – hide when drawer is already open
 *
 * Dispatches a custom 'openCartDrawer' event that Header listens to.
 */
export default function FloatingCartButton({ isHidden = false }) {
  const { totalItems } = useCart();

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('openCartDrawer'));
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Apri carrello"
      className="floating-cart-button"
      style={{
        opacity: isHidden ? 0 : 1,
        pointerEvents: isHidden ? 'none' : 'auto',
        transition: 'opacity var(--transition-fast)',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: '#000' }}
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <CartBadge variant="floating" />
    </button>
  );
}
