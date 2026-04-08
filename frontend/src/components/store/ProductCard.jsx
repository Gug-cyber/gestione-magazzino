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

  const prezzoDisplay = prezzoBase != null ? `€${prezzoBase.toFixed(2)}` : '—'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '14px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 250ms ease, box-shadow 250ms ease',
        boxShadow: hovered
          ? '0 12px 32px rgba(99,102,241,0.18), 0 4px 16px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.3)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <Link
        to={`/store/product/${prodotto.id}`}
        style={{ textDecoration: 'none', display: 'block', position: 'relative', height: '220px', overflow: 'hidden' }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: prodotto.foto_url ? undefined : 'var(--color-surface-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {prodotto.foto_url ? (
            <img
              src={prodotto.foto_url}
              alt={prodotto.nome}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 300ms ease',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          ) : (
            <span style={{ fontSize: '52px', opacity: 0.35 }}>🃏</span>
          )}
        </div>

        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          right: '12px',
          color: '#fff',
          fontWeight: '600',
          fontSize: '14px',
          lineHeight: '1.3',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}>
          {prodotto.nome}
        </div>

        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'none',
        }}>
          {isEsaurito && (
            <span style={{ backgroundColor: 'rgba(239,68,68,0.85)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
              Esaurito
            </span>
          )}
          {prodotto.in_esaurimento && !isEsaurito && (
            <span style={{ backgroundColor: 'rgba(245,158,11,0.85)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
              In esaurimento
            </span>
          )}
          {isSoloN && !isEsaurito && (
            <span style={{ backgroundColor: 'rgba(59,130,246,0.85)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
              Solo {prodotto.quantita} rimasti
            </span>
          )}
          {promo && (
            <span style={{ backgroundColor: 'rgba(34,197,94,0.85)', color: '#fff', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
              🏷️ {promo.tipo === 'percentage' ? `-${promo.valore}%` : `-€${promo.valore}`}
            </span>
          )}
        </div>
      </Link>

      <div style={{ padding: '10px 12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <p style={{ margin: 0, fontWeight: '700', fontSize: '20px', color: 'var(--color-primary)' }}>
          {promo && prezzoScontato != null ? (
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '400' }}>
                {prezzoDisplay}
              </span>
              <span style={{ color: 'var(--color-success)', fontSize: '20px' }}>€{prezzoScontato.toFixed(2)}</span>
            </span>
          ) : prezzoDisplay}
        </p>

        <button
          onClick={() => !isEsaurito && onAddToCart(prodotto)}
          disabled={isEsaurito}
          className="gm-btn gm-btn-sm"
          style={{
            backgroundColor: isEsaurito ? 'var(--color-surface-hover)' : inCart ? 'var(--color-success-bg)' : 'var(--color-primary)',
            color: isEsaurito ? 'var(--color-text-muted)' : inCart ? 'var(--color-success)' : '#fff',
            border: inCart ? '1px solid var(--color-success)' : 'none',
            cursor: isEsaurito ? 'not-allowed' : 'pointer',
            width: '100%',
            padding: '9px 0',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 150ms ease',
          }}
        >
          {isEsaurito ? 'Esaurito' : inCart ? `Nel carrello ✓ (${cartQty})` : 'Aggiungi al carrello'}
        </button>
      </div>
    </div>
  )
}
