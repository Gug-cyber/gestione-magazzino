import React from 'react';

const PAYMENT_LABELS = {
  card: 'Carta di credito',
  paypal: 'PayPal',
  bank_transfer: 'Bonifico bancario',
  cod: 'Contrassegno (+€2.00)',
};

function SectionCard({ title, onEdit, children }) {
  return (
    <div
      style={{
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </h4>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              padding: '2px 8px',
            }}
          >
            Modifica
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export default function OrderConfirmationStep({
  cart,
  shippingData,
  paymentMethod,
  termsAccepted,
  onTermsChange,
  onSubmit,
  isSubmitting,
  onEditStep,
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 'var(--spacing-lg)' }}>Conferma ordine</h2>

      <SectionCard title="Prodotti" onEdit={() => onEditStep(1)}>
        {cart.map((item) => (
          <div
            key={item.product.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              marginBottom: 4,
            }}
          >
            <span>
              {item.product.attributes.title}{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>×{item.quantity}</span>
            </span>
            <span>€{(item.product.attributes.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Spedizione" onEdit={() => onEditStep(2)}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--color-text-primary)',
            lineHeight: 1.6,
          }}
        >
          {shippingData.firstName} {shippingData.lastName}
          <br />
          {shippingData.address}
          <br />
          {shippingData.zip} {shippingData.city} ({shippingData.province})
          <br />
          {shippingData.country}
          <br />
          <span style={{ color: 'var(--color-text-muted)' }}>
            {shippingData.email} · {shippingData.phone}
          </span>
        </p>
      </SectionCard>

      <SectionCard title="Pagamento" onEdit={() => onEditStep(3)}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>
          {PAYMENT_LABELS[paymentMethod] || paymentMethod}
        </p>
      </SectionCard>

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--spacing-sm)',
          cursor: 'pointer',
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-lg)',
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
        />
        Ho letto e accetto i{' '}
        <a
          href="/pagina/termini-e-condizioni"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          termini e condizioni
        </a>{' '}
        e la{' '}
        <a
          href="/pagina/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          privacy policy
        </a>
        .
      </label>

      <button
        onClick={onSubmit}
        disabled={!termsAccepted || isSubmitting}
        style={{
          width: '100%',
          padding: '14px',
          background:
            !termsAccepted || isSubmitting
              ? 'var(--color-surface-elevated)'
              : 'var(--gradient-gold)',
          color:
            !termsAccepted || isSubmitting
              ? 'var(--color-text-muted)'
              : 'var(--color-background)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: 15,
          fontWeight: 700,
          cursor: !termsAccepted || isSubmitting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-sm)',
          transition: 'all var(--transition-fast)',
        }}
      >
        {isSubmitting ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Invio ordine...
          </>
        ) : (
          <>
            Conferma ordine
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </>
        )}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
