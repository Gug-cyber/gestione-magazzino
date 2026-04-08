import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

function cercaPromozioneAttiva(prodotto, promozioni) {
  if (!promozioni || promozioni.length === 0) return null
  return promozioni.find(p =>
    // Promozione specifica per prodotto
    (p.prodotto_id != null && prodotto.id != null && Number(p.prodotto_id) === Number(prodotto.id)) ||
    // Promozione specifica per categoria
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
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.22)' : 'none',
        transform: hovered ? 'translateY(-3px) scale(1.01)' : 'translateY(0)',
      }}
    >
      {/* Image with overlay name + absolute badges */}
      <Link to={`/store/product/${prodotto.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative' }}>
        <div style={{
          height: '220px',
          backgroundColor: prodotto.foto_url ? undefined : 'var(--color-surface-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {prodotto.foto_url ? (
            <img
              src={prodotto.foto_url}
              alt={prodotto.nome}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '48px', opacity: 0.4 }}>🃏</span>
          )}

          {/* Badges — absolute top-left */}
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {isEsaurito && (
              <span className="gm-badge" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '11px' }}>
                Esaurito
              </span>
            )}
            {prodotto.in_esaurimento && !isEsaurito && (
              <span className="gm-badge" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', fontSize: '11px' }}>
                In esaurimento
              </span>
            )}
            {isSoloN && !isEsaurito && (
              <span className="gm-badge" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', fontSize: '11px' }}>
                Solo {prodotto.quantita}
              </span>
            )}
            {promo && (
              <span className="gm-badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '11px' }}>
                🏷️ {promo.tipo === 'percentage' ? `-${promo.valore}%` : `-€${promo.valore}`}
              </span>
            )}
          </div>

          {/* Product name overlay — gradient from bottom */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)',
            padding: '28px 10px 10px',
          }}>
            <p style={{
              margin: 0,
              fontWeight: '600',
              fontSize: '14px',
              lineHeight: '1.3',
              color: '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}>
              {prodotto.nome}
            </p>
          </div>
        </div>
      </Link>

      {/* Content — price + add-to-cart only */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '20px', color: 'var(--color-primary)' }}>
          {promo && prezzoScontato != null ? (
            <span>
              <span style={{ textDecoration: 'line-through', color: 'var(--color-text-muted)', fontSize: '14px', marginRight: '6px' }}>
                {prezzoDisplay}
              </span>
              <span style={{ color: 'var(--color-success)' }}>€{prezzoScontato.toFixed(2)}</span>
            </span>
          ) : prezzoDisplay}
        </p>

        {/* Add to cart button */}
        <button
          onClick={() => !isEsaurito && onAddToCart(prodotto)}
          disabled={isEsaurito}
          className="gm-btn gm-btn-sm"
          style={{
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
            border: inCart ? '1px solid var(--color-success)' : 'none',
            cursor: isEsaurito ? 'not-allowed' : 'pointer',
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '13px',
            transition: 'all 150ms ease',
          }}
        >
          {isEsaurito
            ? 'Esaurito'
            : inCart
              ? `Nel carrello ✓ (${cartQty})`
              : 'Aggiungi al carrello'}
        </button>
      </div>
    </div>
  )
}
