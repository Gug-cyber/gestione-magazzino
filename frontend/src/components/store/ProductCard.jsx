import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import ProductImage from './ProductImage'
import PriceDisplay from './PriceDisplay'

function cercaPromozioneAttiva(prodotto, promozioni) {
  if (!promozioni || promozioni.length === 0) return null
  return promozioni.find(p =>
    (p.prodotto_id != null && prodotto.id != null && Number(p.prodotto_id) === Number(prodotto.id)) ||
    (p.categoria_id != null && prodotto.categoria_id != null && Number(p.categoria_id) === Number(prodotto.categoria_id))
  ) || null
}

/**
 * Single overlay badge — shows the highest-priority status:
 * Esaurito > promo > in_esaurimento / scarsità
 */
function OverlayBadge({ isEsaurito, inEsaurimento, soloN, quantita, promo }) {
  const base = {
    position: 'absolute', top: '10px', left: '10px', zIndex: 2,
    borderRadius: '6px', padding: '3px 9px',
    fontSize: '11px', fontWeight: '700', letterSpacing: '0.02em',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    color: '#fff', pointerEvents: 'none',
  }

  if (isEsaurito) {
    return (
      <span style={{ ...base, backgroundColor: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.45)' }}>
        Esaurito
      </span>
    )
  }
  if (promo) {
    const label = promo.tipo === 'percentage'
      ? `-${promo.valore}%`
      : `-€${Number(promo.valore).toFixed(2)}`
    return (
      <span style={{ ...base, backgroundColor: 'rgba(34,197,94,0.85)', border: '1px solid rgba(34,197,94,0.45)' }}>
        🏷️ {label}
      </span>
    )
  }
  if (inEsaurimento || soloN) {
    const text = inEsaurimento ? '⚡ In esaurimento' : `Solo ${quantita} rimasti`
    return (
      <span style={{ ...base, backgroundColor: 'rgba(245,158,11,0.85)', border: '1px solid rgba(245,158,11,0.45)' }}>
        {text}
      </span>
    )
  }
  return null
}

export default function ProductCard({ prodotto, onAddToCart, promozioni = [] }) {
  const { isInCart, getItemQty } = useCart()
  const [hovered, setHovered] = useState(false)

  const inCart = isInCart(prodotto.id)
  const cartQty = getItemQty(prodotto.id)
  const isEsaurito = prodotto.quantita === 0
  const isSoloN = prodotto.quantita > 0 && prodotto.quantita <= 3

  const promo = cercaPromozioneAttiva(prodotto, promozioni)
  const prezzoBase = prodotto.prezzo_vendita != null ? Number(prodotto.prezzo_vendita) : null
  const prezzoScontato = promo && prezzoBase != null
    ? Math.max(0, promo.tipo === 'percentage'
      ? prezzoBase * (1 - promo.valore / 100)
      : prezzoBase - promo.valore)
    : null

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-surface)',
          border: hovered ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'default',
          transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hovered
            ? '0 0 0 1px var(--color-primary), 0 8px 24px rgba(0,0,0,0.25)'
            : '0 2px 8px rgba(0,0,0,0.20)',
        }}
      >
        {/* Image with overlay badge */}
        <Link
          to={`/store/product/${prodotto.id}`}
          style={{ textDecoration: 'none', display: 'block', position: 'relative' }}
        >
          <ProductImage
            src={prodotto.foto_url}
            alt={prodotto.nome}
            aspectRatio="card"
            hovered={hovered}
          />
          <OverlayBadge
            isEsaurito={isEsaurito}
            inEsaurimento={!!prodotto.in_esaurimento}
            soloN={isSoloN}
            quantita={prodotto.quantita}
            promo={promo}
          />
        </Link>

        {/* Card body */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>

          {/* Category badge */}
          {prodotto.categoria_nome && (
            <span style={{
              alignSelf: 'flex-start',
              fontSize: '11px', fontWeight: '500',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface-hover)',
              borderRadius: '4px',
              padding: '2px 7px',
              letterSpacing: '0.03em',
            }}>
              {prodotto.categoria_nome}
            </span>
          )}

          {/* Product title */}
          <p style={{
            margin: 0,
            color: 'var(--color-text)',
            fontWeight: '600',
            fontSize: '14px',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {prodotto.nome}
          </p>

          {/* SKU */}
          {prodotto.sku && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
              SKU: #{prodotto.sku}
            </p>
          )}

          {/* Price */}
          <PriceDisplay
            prezzoBase={prezzoBase}
            prezzoScontato={prezzoScontato}
            size="card"
          />

          {/* Add to cart button — always at bottom */}
          <button
            onClick={() => !isEsaurito && onAddToCart(prodotto)}
            disabled={isEsaurito}
            style={{
              marginTop: 'auto',
              backgroundColor: isEsaurito
                ? 'var(--color-surface-hover)'
                : inCart
                  ? 'var(--color-success-bg)'
                  : 'var(--color-primary)',
              color: isEsaurito
                ? 'var(--color-text-muted)'
                : inCart
                  ? 'var(--color-success)'
                  : '#fff',
              border: inCart
                ? '1px solid var(--color-success)'
                : isEsaurito
                  ? '1px solid var(--color-border)'
                  : 'none',
              borderRadius: '10px',
              padding: '10px 0',
              width: '100%',
              fontWeight: '600',
              fontSize: '13px',
              cursor: isEsaurito ? 'not-allowed' : 'pointer',
              opacity: isEsaurito ? 0.6 : 1,
              transition: 'background-color 160ms ease',
            }}
          >
            {isEsaurito
              ? 'Esaurito'
              : inCart
                ? `✓ Nel carrello (${cartQty})`
                : '🛒 Aggiungi al carrello'}
          </button>
        </div>
      </div>
    </>
  )
}
