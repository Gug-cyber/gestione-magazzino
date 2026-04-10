import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmptyCart({ onClose }) {
  const navigate = useNavigate();

  const handleExplore = () => {
    onClose?.();
    navigate('/catalogo');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
      }}
    >
      {/* Animated SVG cart illustration */}
      <div className="float" style={{ opacity: 0.55 }}>
        <svg
          width="88"
          height="88"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </div>

      <div>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
        >
          Il tuo carrello è vuoto
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
          }}
        >
          Aggiungi prodotti dal catalogo per iniziare
        </p>
      </div>

      <button
        onClick={handleExplore}
        className="btn-primary"
        style={{ marginTop: 'var(--spacing-sm)', padding: '10px 22px', fontSize: '14px' }}
      >
        Esplora prodotti
      </button>
    </div>
  );
}
