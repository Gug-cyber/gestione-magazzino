import React from 'react';

const PAYMENT_LABELS = {
  card: 'Carta di credito',
  paypal: 'PayPal',
  bank_transfer: 'Bonifico bancario',
  cod: 'Contrassegno',
};

export default function OrderSummary({
  items,
  shippingCost,
  paymentMethod,
  totalPrice,
  grandTotal,
}) {
  const paymentFee = paymentMethod === 'cod' ? 2.0 : 0;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
      }}
    >
      <h3
        style={{
          margin: '0 0 var(--spacing-md)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        Riepilogo ordine
      </h3>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-md)',
          maxHeight: 280,
          overflowY: 'auto',
        }}
      >
        {items.map((item) => (
          <div
            key={item.product.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 'var(--spacing-sm)',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)', flex: 1, minWidth: 0 }}>
              {item.product.attributes.title}
              <span style={{ color: 'var(--color-text-muted)' }}> ×{item.quantity}</span>
            </span>
            <span style={{ fontWeight: 500, flexShrink: 0 }}>
              €{(item.product.attributes.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Subtotale</span>
          <span>€{totalPrice.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Spedizione</span>
          <span style={{ color: shippingCost === 0 ? 'var(--color-success, #22c55e)' : undefined }}>
            {shippingCost === 0 ? 'Gratuita' : `€${shippingCost.toFixed(2)}`}
          </span>
        </div>
        {paymentFee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {PAYMENT_LABELS[paymentMethod] || 'Pagamento'}
            </span>
            <span>€{paymentFee.toFixed(2)}</span>
          </div>
        )}
        {shippingCost === 0 && totalPrice > 0 && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}
          >
            Spedizione gratuita per ordini sopra €50
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          marginTop: 'var(--spacing-md)',
          paddingTop: 'var(--spacing-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16 }}>Totale</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 20,
            background: 'var(--gradient-gold)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          €{grandTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
