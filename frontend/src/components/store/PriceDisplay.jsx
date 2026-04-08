/**
 * PriceDisplay — shows base price with optional discount
 * Props:
 *   prezzoVendita  – original price (legacy alias, same as prezzoBase)
 *   prezzoBase     – original price (preferred)
 *   prezzoScontato – discounted price (null = no discount)
 *   size           – 'card' (~20px) | 'detail' (~36px, default)
 */
export default function PriceDisplay({
  prezzoVendita,
  prezzoBase: prezzoBaseProp,
  prezzoScontato,
  size = 'detail',
}) {
  const base = (prezzoBaseProp ?? prezzoVendita) != null
    ? Number(prezzoBaseProp ?? prezzoVendita)
    : null
  const scontato = prezzoScontato != null ? Number(prezzoScontato) : null

  const hasDiscount = scontato != null && base != null && scontato < base
  const percentuale = hasDiscount
    ? Math.round((1 - scontato / base) * 100)
    : null

  const isCard = size === 'card'
  const mainSize = isCard ? '20px' : '36px'
  const strikeSize = isCard ? '13px' : '14px'
  const badgePad = isCard ? '2px 6px' : '4px 10px'
  const badgeFont = isCard ? '11px' : '13px'

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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: mainSize,
              fontWeight: '800',
              color: 'var(--color-success)',
              letterSpacing: '-0.5px',
              lineHeight: '1',
            }}>
              €{scontato.toFixed(2)}
            </span>
            <span style={{
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '8px',
              padding: badgePad,
              fontSize: badgeFont,
              fontWeight: '700',
            }}>
              -{percentuale}%
            </span>
          </div>
          <span style={{ fontSize: strikeSize, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
            {!isCard ? 'Prezzo originale: ' : ''}€{base.toFixed(2)}
          </span>
        </>
      ) : (
        <span style={{
          fontSize: mainSize,
          fontWeight: '800',
          color: 'var(--color-primary)',
          letterSpacing: '-0.5px',
          lineHeight: '1',
        }}>
          €{base.toFixed(2)}
        </span>
      )}
    </div>
  )
}
