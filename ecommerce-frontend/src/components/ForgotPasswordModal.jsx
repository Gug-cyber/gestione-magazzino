import React, { useState } from 'react';

export function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleClose() {
    setEmail('');
    setSubmitted(false);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recupero password"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '400px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-xl)',
          zIndex: 201,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Recupera password</h2>
          <button
            onClick={handleClose}
            aria-label="Chiudi"
            style={{
              width: 32,
              height: 32,
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-lg) 0',
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              style={{ marginBottom: 'var(--spacing-md)' }}
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 15.45 19.79 19.79 0 0 1 1.92 6.85 2 2 0 0 1 3.9 4.67h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 12.91" />
              <path d="M22 4 12 14.01l-3-3" />
            </svg>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Funzionalità in arrivo!
            </p>
            <p style={{ margin: 'var(--spacing-sm) 0 0', fontSize: 14 }}>
              Il recupero password sarà disponibile a breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ margin: '0 0 var(--spacing-lg)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Inserisci la tua email per ricevere le istruzioni di recupero.
            </p>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label
                htmlFor="reset-email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua@email.com"
                required
                className="search-input"
                style={{ paddingLeft: 'var(--spacing-md)' }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%' }}
            >
              Invia link recupero
            </button>
          </form>
        )}
      </div>
    </>
  );
}
