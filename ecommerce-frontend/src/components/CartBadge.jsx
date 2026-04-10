import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../hooks/useCart';

/**
 * CartBadge — animated item count badge for the cart button.
 *
 * Props:
 *  variant – 'header' | 'floating'   (default: 'header')
 */
export default function CartBadge({ variant = 'header' }) {
  const { totalItems } = useCart();
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(totalItems);

  useEffect(() => {
    if (totalItems > prevTotal.current) {
      setPulse(true);
    }
    prevTotal.current = totalItems;
  }, [totalItems]);

  const handleAnimationEnd = () => setPulse(false);

  if (totalItems === 0) return null;

  const display = totalItems > 99 ? '99+' : totalItems;

  const isFloating = variant === 'floating';

  return (
    <span
      className={pulse ? 'pulse' : ''}
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: 'absolute',
        top: isFloating ? '-4px' : '-6px',
        right: isFloating ? '-4px' : '-6px',
        minWidth: isFloating ? '22px' : '18px',
        height: isFloating ? '22px' : '18px',
        padding: '0 4px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--gradient-gold)',
        color: '#000',
        fontSize: isFloating ? '11px' : '10px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        pointerEvents: 'none',
      }}
    >
      {display}
    </span>
  );
}
