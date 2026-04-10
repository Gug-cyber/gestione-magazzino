import React, { useEffect, useState } from 'react';

const EXIT_ANIMATION_DURATION = 350;

const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const TYPE_STYLES = {
  success: {
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-success)',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
  },
  info: {
    background: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid var(--color-accent)',
    color: 'var(--color-accent)',
  },
};

export default function ToastNotification({ id, message, type = 'info', duration = 3000, onClose }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), duration - EXIT_ANIMATION_DURATION);
    const closeTimer = setTimeout(() => onClose(id), duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [id, duration, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(id), EXIT_ANIMATION_DURATION);
  };

  const typeStyle = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '240px',
        maxWidth: '320px',
        background: typeStyle.background,
        border: typeStyle.border,
        color: 'var(--color-text-primary)',
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: '1.4',
        pointerEvents: 'all',
      }}
    >
      {/* Type icon */}
      <span style={{ color: typeStyle.color, flexShrink: 0 }}>
        {ICONS[type] || ICONS.info}
      </span>

      {/* Message */}
      <span style={{ flex: 1 }}>{message}</span>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Chiudi notifica"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
