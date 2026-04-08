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
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        boxShadow: hovered ? 'var(--card-shadow-hover, 0 8px 24px rgba(0,0,0,0.2))' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Image */}
      <Link to={`/store/product/${prodotto.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          height: '180px',
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
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '48px', opacity: 0.4 }}>🃏</span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
              Solo {prodotto.quantita} disponibili
            </span>
          )}
          {promo && (
            <span className="gm-badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '11px' }}>
              🏷️ {promo.tipo === 'percentage' ? `-${promo.valore}%` : `-€${promo.valore}`}
            </span>
          )}
        </div>

        <Link to={`/store/product/${prodotto.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <p style={{ margin: 0, fontWeight: '500', fontSize: '14px', lineHeight: '1.4', color: 'var(--color-text)' }}>
            {prodotto.nome}
          </p>
        </Link>

        {prodotto.sku && (
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>SKU: {prodotto.sku}</p>
        )}

        <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: 'var(--color-primary)', marginTop: 'auto' }}>
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
            padding: '8px',
            borderRadius: '6px',
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
