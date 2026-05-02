import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'

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
function OverlayBadge({ isEsaurito, inEsaurimento, soloN, quantita, promo, t, isNew }) {
  const base = {
    position: 'absolute', top: '10px', left: '10px', zIndex: 2,
    borderRadius: '6px', padding: '4px 10px',
    fontSize: '11px', fontWeight: '700', letterSpacing: '0.03em',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    color: '#fff', pointerEvents: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    textTransform: 'uppercase',
  }

  if (isEsaurito) {
    return (
      <span style={{ ...base, backgroundColor: 'rgba(239,68,68,0.92)' }}>
        {t('badge_out_of_stock')}
      </span>
    )
  }
  if (promo) {
    const label = promo.tipo === 'percentage'
      ? `-${promo.valore}%`
      : `-€${Number(promo.valore).toFixed(2)}`
    return (
      <span style={{ 
        ...base, 
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        animation: 'pulse-badge 2s ease-in-out infinite',
      }}>
        {label}
      </span>
    )
  }
  if (isNew) {
    return (
      <span style={{ 
        ...base, 
        background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      }}>
        NUOVO
      </span>
    )
  }
  if (inEsaurimento || soloN) {
    const text = inEsaurimento ? t('badge_low_stock') : t('badge_only_n', quantita)
    return (
      <span style={{ ...base, backgroundColor: 'rgba(245,158,11,0.92)' }}>
        {text}
      </span>
    )
  }
  return null
}

// Icona carrello stilizzata
function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}

// Icona cuore per wishlist
function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

export default function ProductCard({ prodotto, onAddToCart, promozioni = [], index = 0 }) {
  const { isInCart, getItemQty } = useCart()
  const { t } = useLanguage()
  const [hovered, setHovered] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [liked, setLiked] = useState(false)

  const inCart = isInCart(prodotto.id)
  const cartQty = getItemQty(prodotto.id)
  const isEsaurito = prodotto.quantita === 0
  const isSoloN = prodotto.quantita > 0 && prodotto.quantita <= 3
  
  // Considera "nuovo" se creato negli ultimi 7 giorni
  const isNew = prodotto.created_at && 
    (Date.now() - new Date(prodotto.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000

  const promo = cercaPromozioneAttiva(prodotto, promozioni)
  const prezzoBase = prodotto.prezzo_vendita != null ? Number(prodotto.prezzo_vendita) : null
  const prezzoScontato = promo && prezzoBase != null
    ? Math.max(0, promo.tipo === 'percentage'
      ? prezzoBase * (1 - promo.valore / 100)
      : prezzoBase - promo.valore)
    : null

  const prezzoMostrato = prezzoScontato ?? prezzoBase

  return (
    <>
      <style>{`
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shimmer-card {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .product-card-action-btn {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 200ms ease, transform 200ms ease;
        }
        .product-card:hover .product-card-action-btn {
          opacity: 1;
          transform: translateY(0);
        }
        @media (max-width: 640px) {
          .product-card-action-btn {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
        }
      `}</style>
      <div
        className="product-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'default',
          transition: 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 280ms ease, border-color 200ms ease',
          transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hovered
            ? '0 16px 40px rgba(0,0,0,0.12), 0 6px 16px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(0,0,0,0.06)',
          borderColor: hovered ? 'var(--color-primary)' : 'var(--color-border)',
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
            {/* Skeleton loader */}
            {!imgLoaded && (prodotto.immagini?.[0] || prodotto.foto_url) && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-card 1.4s infinite',
              }} />
            )}
            
            {(prodotto.immagini?.[0] || prodotto.foto_url) ? (
              <img
                src={prodotto.immagini?.[0] || prodotto.foto_url}
                alt={prodotto.nome}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding={index === 0 ? undefined : 'async'}
                onLoad={() => setImgLoaded(true)}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 450ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms ease',
                  transform: hovered ? 'scale(1.08)' : 'scale(1)',
                  opacity: imgLoaded ? 1 : 0,
                }}
                onError={e => { e.target.style.display = 'none' }}
              />
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px',
                color: 'var(--color-text-muted)',
                opacity: 0.4,
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            )}
            
            {/* Gradient overlay on hover */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: hovered 
                ? 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)'
                : 'transparent',
              transition: 'background 300ms ease',
              pointerEvents: 'none',
            }} />
          </div>
          
          <OverlayBadge
            isEsaurito={isEsaurito}
            inEsaurimento={!!prodotto.in_esaurimento}
            soloN={isSoloN}
            quantita={prodotto.quantita}
            promo={promo}
            isNew={isNew && !promo}
            t={t}
          />
          
          {/* Quick action button - wishlist */}
          <button
            className="product-card-action-btn"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked) }}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: liked ? 'var(--color-danger)' : 'rgba(255,255,255,0.92)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: liked ? '#fff' : 'var(--color-text-muted)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'background-color 200ms ease, color 200ms ease, transform 200ms ease',
              zIndex: 3,
            }}
            onMouseEnter={(e) => !liked && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)')}
            onMouseLeave={(e) => !liked && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.92)')}
          >
            <HeartIcon filled={liked} />
          </button>
        </Link>

        {/* Card body */}
        <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>

          {/* Product title - first */}
          <Link 
            to={`/store/product/${prodotto.id}`}
            style={{ textDecoration: 'none' }}
          >
            <p style={{
              margin: 0,
              color: 'var(--color-text)',
              fontWeight: '600',
              fontSize: '14px',
              lineHeight: '1.35',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text)'}
            >
              {prodotto.nome}
            </p>
          </Link>

          {/* Category tag */}
          {prodotto.categoria_nome && (
            <span style={{
              alignSelf: 'flex-start',
              fontSize: '11px',
              fontWeight: '500',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface-hover)',
              borderRadius: '6px',
              padding: '3px 8px',
              letterSpacing: '0.02em',
            }}>
              {prodotto.categoria_nome}
            </span>
          )}

          {/* Price — prominent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {prezzoMostrato != null && (
              <span style={{ 
                fontWeight: '800', 
                fontSize: '18px', 
                color: prezzoScontato ? 'var(--color-success)' : 'var(--color-text)',
                letterSpacing: '-0.02em',
              }}>
                €{prezzoMostrato.toFixed(2)}
              </span>
            )}
            {prezzoScontato != null && prezzoBase != null && (
              <span style={{ 
                fontSize: '13px', 
                color: 'var(--color-text-muted)', 
                textDecoration: 'line-through',
                opacity: 0.7,
              }}>
                €{prezzoBase.toFixed(2)}
              </span>
            )}
          </div>

          {/* Add to cart button - prominent */}
          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            {isEsaurito ? (
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--color-text-muted)', 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 0',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                {t('card_not_available')}
              </div>
            ) : inCart ? (
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--color-success)', 
                fontWeight: '600', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                backgroundColor: 'var(--color-success-bg, rgba(34, 197, 94, 0.1))',
                padding: '10px 14px',
                borderRadius: '10px',
                justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{t('card_in_cart', cartQty)}</span>
              </div>
            ) : (
              <button
                onClick={() => onAddToCart(prodotto)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 200ms ease',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.45)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(5, 150, 105, 0.35)'
                }}
              >
                <CartIcon />
                {t('card_add')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
