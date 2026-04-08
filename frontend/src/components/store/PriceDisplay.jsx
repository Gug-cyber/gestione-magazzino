export default function PriceDisplay({ prezzoVendita, prezzoScontato }) {
  const base = prezzoVendita != null ? Number(prezzoVendita) : null
  const scontato = prezzoScontato != null ? Number(prezzoScontato) : null

  const hasDiscount = scontato != null && base != null && scontato < base
  const percentuale = hasDiscount
    ? Math.round((1 - scontato / base) * 100)
    : null

  if (base == null) {
    return (
      <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
        Prezzo non disponibile
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {hasDiscount ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '42px',
              fontWeight: '800',
              color: 'var(--color-success)',
              letterSpacing: '-1.5px',
              lineHeight: '1',
            }}>
              €{scontato.toFixed(2)}
            </span>
            <span style={{
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: '700',
            }}>
              -{percentuale}%
            </span>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
            Prezzo originale: €{base.toFixed(2)}
          </span>
        </>
      ) : (
        <span style={{
          fontSize: '42px',
          fontWeight: '800',
          color: 'var(--color-primary)',
          letterSpacing: '-1.5px',
          lineHeight: '1',
        }}>
          €{base.toFixed(2)}
        </span>
      )}
    </div>
  )
}
