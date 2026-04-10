import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

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
    position: 'absolute', top: '8px', left: '8px', zIndex: 2,
    borderRadius: '999px', padding: '2px 8px',
    fontSize: '10px', fontWeight: '700', letterSpacing: '0.02em',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    color: '#fff', pointerEvents: 'none',
  }

  if (isEsaurito) {
    return (
      <span style={{ ...base, backgroundColor: 'rgba(239,68,68,0.85)' }}>
        Esaurito
      </span>
    )
  }
  if (promo) {
    const label = promo.tipo === 'percentage'
      ? `-${promo.valore}%`
      : `-€${Number(promo.valore).toFixed(2)}`
    return (
      <span style={{ ...base, backgroundColor: 'rgba(34,197,94,0.88)' }}>
        {label}
      </span>
    )
  }
  if (inEsaurimento || soloN) {
    const text = inEsaurimento ? 'In esaurimento' : `Solo ${quantita} rimasti`
    return (
      <span style={{ ...base, backgroundColor: 'rgba(245,158,11,0.88)' }}>
        {text}
      </span>
    )
  }
  return null
}

export default function ProductCard({ prodotto, onAddToCart, promozioni = [], index = 0 }) {
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

  const prezzoMostrato = prezzoScontato ?? prezzoBase

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        boxShadow: hovered
          ? '0 6px 20px rgba(0,0,0,0.14)'
          : '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* Image — aspect ratio 4:5, rounded top only */}
      <Link
        to={`/store/product/${prodotto.id}`}
        style={{ textDecoration: 'none', display: 'block', position: 'relative' }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/5',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {prodotto.foto_url ? (
            <img
              src={prodotto.foto_url}
              alt={prodotto.nome}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding={index === 0 ? undefined : 'async'}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                transition: 'transform 350ms ease',
                transform: hovered ? 'scale(1.04)' : 'scale(1)',
              }}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <span style={{ fontSize: '36px', opacity: 0.25 }}>🃏</span>
          )}
        </div>
        <OverlayBadge
          isEsaurito={isEsaurito}
          inEsaurimento={!!prodotto.in_esaurimento}
          soloN={isSoloN}
          quantita={prodotto.quantita}
          promo={promo}
        />
      </Link>

      {/* Card body */}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>

        {/* Price — prominent, top */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {prezzoMostrato != null && (
            <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text)' }}>
              €{prezzoMostrato.toFixed(2)}
            </span>
          )}
          {prezzoScontato != null && prezzoBase != null && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
              €{prezzoBase.toFixed(2)}
            </span>
          )}
        </div>

        {/* Product title */}
        <p style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontWeight: '400',
          fontSize: '13px',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {prodotto.nome}
        </p>

        {/* Category tag */}
        {prodotto.categoria_nome && (
          <span style={{
            alignSelf: 'flex-start',
            fontSize: '11px',
            fontWeight: '400',
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: '4px',
            padding: '1px 6px',
          }}>
            {prodotto.categoria_nome}
          </span>
        )}

        {/* Add to cart — discrete bottom link */}
        <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
          {isEsaurito ? (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Non disponibile
            </span>
          ) : inCart ? (
            <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>✓</span>
              <span>Nel carrello ({cartQty})</span>
            </span>
          ) : (
            <button
              onClick={() => onAddToCart(prodotto)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--color-primary)',
                fontWeight: '500',
                textDecoration: 'none',
              }}
            >
              + Aggiungi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
