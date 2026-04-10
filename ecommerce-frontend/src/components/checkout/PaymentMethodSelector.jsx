import React from 'react';

const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Carta di credito / debito',
    description: 'Visa, Mastercard, American Express',
    fee: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: 'paypal',
    label: 'PayPal',
    description: 'Paga con il tuo account PayPal',
    fee: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 11l4-7h5a4 4 0 0 1 0 8H9" />
        <path d="M5 19l3-5h4a4 4 0 0 0 0-8" />
      </svg>
    ),
  },
  {
    id: 'bank_transfer',
    label: 'Bonifico bancario',
    description: "L'ordine verrà spedito alla ricezione del pagamento",
    fee: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-4 0v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    id: 'cod',
    label: 'Contrassegno',
    description: 'Pagamento in contanti alla consegna',
    fee: 2.0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
];

export default function PaymentMethodSelector({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {PAYMENT_METHODS.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
            background:
              selected === method.id
                ? 'rgba(245, 158, 11, 0.08)'
                : 'var(--color-surface-elevated)',
            border: `2px solid ${
              selected === method.id ? 'var(--color-accent)' : 'var(--color-border)'
            }`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all var(--transition-fast)',
            width: '100%',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              color:
                selected === method.id
                  ? 'var(--color-accent)'
                  : 'var(--color-text-muted)',
            }}
          >
            {method.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--color-text-primary)',
                marginBottom: 2,
              }}
            >
              {method.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {method.description}
            </div>
          </div>
          {method.fee > 0 && (
            <div
              style={{
                flexShrink: 0,
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}
            >
              +€{method.fee.toFixed(2)}
            </div>
          )}
          <div
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${
                selected === method.id ? 'var(--color-accent)' : 'var(--color-border)'
              }`,
              background:
                selected === method.id ? 'var(--color-accent)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected === method.id && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-background)',
                }}
              />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
