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

function ProductImage({ src, alt, hovered }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'var(--color-surface-hover)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!loaded && !errored && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, var(--color-surface-hover) 25%, var(--color-surface-active) 50%, var(--color-surface-hover) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        )}
        {(!src || errored) && (
          <span style={{ fontSize: '52px', opacity: 0.25, zIndex: 1 }}>🃏</span>
        )}
        {src && !errored && (
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 300ms ease, transform 350ms ease',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
            }}
          />
        )}
      </div>
    </div>
  )
}

function OverlayBadges({ isEsaurito, inEsaurimento, soloN, quantita, promo }) {
  const badge = (color, bg, border, text) => (
    <span key={text} style={{
      backgroundColor: bg,
      color: color,
      border: `1px solid ${border}`,
      borderRadius: '6px',
      padding: '3px 8px',
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.02em',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'inline-block',
    }}>{text}</span>
  )

  return (
    <div style={{
      position: 'absolute', top: '10px', left: '10px',
      display: 'flex', flexDirection: 'column', gap: '5px',
      zIndex: 2, pointerEvents: 'none',
    }}>
      {isEsaurito && badge('var(--color-danger)', 'rgba(239,68,68,0.82)', 'rgba(239,68,68,0.4)', '✕ Esaurito')}
      {inEsaurimento && !isEsaurito && badge('var(--color-warning)', 'rgba(245,158,11,0.82)', 'rgba(245,158,11,0.4)', '⚡ In esaurimento')}
      {soloN && !isEsaurito && badge('var(--color-info)', 'rgba(59,130,246,0.82)', 'rgba(59,130,246,0.4)', `Solo ${quantita} rimasti`)}
      {promo && badge('var(--color-success)', 'rgba(34,197,94,0.82)', 'rgba(34,197,94,0.4)',
        `🏷️ ${promo.tipo === 'percentage' ? `-${promo.valore}%` : `-€${Number(promo.valore).toFixed(2)}`}`
      )}
    </div>
  )
}

function PriceDisplay({ prezzoBase, prezzoScontato }) {
  if (prezzoBase == null) {
    return <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Prezzo non disponibile</span>
  }
  if (prezzoScontato != null) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: '400', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
          €{prezzoBase.toFixed(2)}
        </span>
        <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-success)', letterSpacing: '-0.5px' }}>
          €{prezzoScontato.toFixed(2)}
        </span>
      </div>
    )
  }
  return (
    <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
      €{prezzoBase.toFixed(2)}
    </span>
  )
}

export default function ProductCard({ prodotto, onAddToCart, promozioni = [] }) {
  const { isInCart, getItemQty } = useCart()
  const [hovered, setHovered] = useState(false)

  const inCart = isInCart(prodotto.id)
  const cartQty = getItemQty(prodotto.id)
  const isEsaurito = prodotto.quantita === 0
  const isSoloN = prodotto.quantita > 0 && prodotto.quantita <= 4

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
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'default',
          transition: 'transform 220ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 220ms ease, border-color 200ms ease',
          transform: hovered ? 'translateY(-4px) scale(1.015)' : 'translateY(0) scale(1)',
          boxShadow: hovered
            ? '0 16px 40px rgba(99,102,241,0.20), 0 6px 20px rgba(0,0,0,0.45)'
            : '0 2px 10px rgba(0,0,0,0.30)',
        }}
      >
        <Link to={`/store/product/${prodotto.id}`} style={{ textDecoration: 'none', display: 'block', position: 'relative' }}>
          <ProductImage src={prodotto.foto_url} alt={prodotto.nome} hovered={hovered} />
          <OverlayBadges
            isEsaurito={isEsaurito}
            inEsaurimento={!!prodotto.in_esaurimento}
            soloN={isSoloN}
            quantita={prodotto.quantita}
            promo={promo}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '90px',
            background: 'linear-gradient(to top, rgba(9,9,11,0.88) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
          <p style={{
            position: 'absolute', bottom: '10px', left: '12px', right: '12px',
            margin: 0, color: '#fff',
            fontWeight: '600', fontSize: '14px',
            lineHeight: '1.35',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}>
            {prodotto.nome}
          </p>
        </Link>

        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
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

          <PriceDisplay prezzoBase={prezzoBase} prezzoScontato={prezzoScontato} />

          {isSoloN && !isEsaurito && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-warning)', fontWeight: '500' }}>
              ⚠️ Solo {prodotto.quantita} disponibili
            </p>
          )}

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
              border: inCart ? '1px solid var(--color-success)' : isEsaurito ? '1px solid var(--color-border)' : 'none',
              borderRadius: '10px',
              padding: '10px 0',
              width: '100%',
              fontWeight: '600',
              fontSize: '13px',
              cursor: isEsaurito ? 'not-allowed' : 'pointer',
              transition: 'background-color 160ms ease, box-shadow 160ms ease',
              boxShadow: !isEsaurito && !inCart && hovered
                ? '0 0 16px rgba(99,102,241,0.35)'
                : 'none',
            }}
          >
            {isEsaurito
              ? '✕ Esaurito'
              : inCart
                ? `✓ Nel carrello (${cartQty})`
                : '+ Aggiungi al carrello'}
          </button>
        </div>
      </div>
    </>
  )
}
