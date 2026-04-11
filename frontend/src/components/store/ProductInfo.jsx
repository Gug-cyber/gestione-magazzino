import { useState } from 'react'
import { Link } from 'react-router-dom'
import StockBadge from './StockBadge'
import PriceDisplay from './PriceDisplay'
import QuantitySelector from './QuantitySelector'

export default function ProductInfo({ prodotto, inCart, cartQty, added, onAddToCart, prezzoScontato = null }) {
  const [qty, setQty] = useState(1)
  const isEsaurito = prodotto.quantita === 0

  function handleAdd() {
    if (isEsaurito) return
    onAddToCart(qty)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Name + meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(18px, 2.8vw, 28px)',
          fontWeight: '800',
          color: 'var(--color-text)',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
        }}>
          {prodotto.nome}
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {prodotto.categoria_nome && (
            <span style={{
              fontSize: '12px', fontWeight: '500',
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '3px 10px',
              letterSpacing: '0.04em',
            }}>
              {prodotto.categoria_nome}
            </span>
          )}
          {prodotto.sku && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              SKU: {prodotto.sku}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

      {/* Stock */}
      <StockBadge quantita={prodotto.quantita} in_esaurimento={!!prodotto.in_esaurimento} />

      {/* Price */}
      <PriceDisplay
        prezzoVendita={prodotto.prezzo_vendita}
        prezzoScontato={prezzoScontato}
      />

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

      {/* Quantity selector */}
      {!isEsaurito && (
        <QuantitySelector
          value={qty}
          min={1}
          max={prodotto.quantita}
          onChange={setQty}
        />
      )}

      {/* CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={handleAdd}
          disabled={isEsaurito}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: '14px',
            border: 'none',
            cursor: isEsaurito ? 'not-allowed' : 'pointer',
            fontWeight: '700',
            fontSize: '15px',
            letterSpacing: '0.01em',
            transition: 'background-color 180ms ease, transform 120ms ease, box-shadow 180ms ease',
            backgroundColor: added
              ? 'var(--color-success)'
              : isEsaurito
                ? 'var(--color-surface-hover)'
                : 'var(--color-primary)',
            color: isEsaurito ? 'var(--color-text-muted)' : '#fff',
            boxShadow: !isEsaurito && !added
              ? '0 4px 20px rgba(99,102,241,0.35)'
              : 'none',
          }}
          onMouseEnter={e => { if (!isEsaurito && !added) e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {isEsaurito
            ? '✕ Prodotto esaurito'
            : added
              ? '✓ Aggiunto al carrello!'
              : inCart
                ? `🛒 Aggiungi ancora (${cartQty} nel carrello)`
                : '🛒 Aggiungi al carrello'}
        </button>

        {inCart && (
          <Link
            to="/store/cart"
            className="gm-btn gm-btn-secondary"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '13px 24px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Vai al carrello →
          </Link>
        )}
      </div>

      {/* Description */}
      <DescriptionBlock descrizione={prodotto.descrizione} />
    </div>
  )
}

function DescriptionBlock({ descrizione }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderLeft: '3px solid var(--color-primary)',
      borderRadius: '12px',
      padding: '20px 22px',
      marginTop: '8px',
    }}>
      <h3 style={{
        margin: '0 0 12px',
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Descrizione
      </h3>
      {descrizione ? (
        <p style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: '1.75',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'pre-line',
        }}>
          {descrizione}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Nessuna descrizione disponibile.
        </p>
      )}
    </div>
  )
}
