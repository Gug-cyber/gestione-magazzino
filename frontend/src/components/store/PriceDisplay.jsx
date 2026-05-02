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
  
  // Calcola risparmio
  const risparmio = hasDiscount ? (base - scontato).toFixed(2) : null

  const isCard = size === 'card'
  const mainSize = isCard ? '20px' : '42px'
  const strikeSize = isCard ? '13px' : '16px'
  const badgePad = isCard ? '3px 8px' : '6px 14px'
  const badgeFont = isCard ? '11px' : '14px'

  if (base == null) {
    return (
      <p style={{ 
        margin: 0, 
        fontSize: '15px', 
        color: 'var(--color-text-muted)', 
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Prezzo non disponibile
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {hasDiscount ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: mainSize,
              fontWeight: '800',
              color: 'var(--color-success)',
              letterSpacing: '-0.5px',
              lineHeight: '1',
              textShadow: isCard ? 'none' : '0 2px 4px rgba(34, 197, 94, 0.15)',
            }}>
              €{scontato.toFixed(2)}
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              borderRadius: '8px',
              padding: badgePad,
              fontSize: badgeFont,
              fontWeight: '700',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <svg width={isCard ? '10' : '14'} height={isCard ? '10' : '14'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              -{percentuale}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ 
              fontSize: strikeSize, 
              color: 'var(--color-text-muted)', 
              textDecoration: 'line-through',
              opacity: 0.7,
            }}>
              €{base.toFixed(2)}
            </span>
            {!isCard && risparmio && (
              <span style={{
                fontSize: '13px',
                color: 'var(--color-success)',
                fontWeight: '600',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '4px 10px',
                borderRadius: '6px',
              }}>
                Risparmi €{risparmio}
              </span>
            )}
          </div>
        </>
      ) : (
        <span style={{
          fontSize: mainSize,
          fontWeight: '800',
          color: 'var(--color-text)',
          letterSpacing: '-0.5px',
          lineHeight: '1',
        }}>
          €{base.toFixed(2)}
        </span>
      )}
    </div>
  )
}
