import { Link } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useCart } from '../../context/CartContext'
import ProductImage from '../../components/store/ProductImage'

export default function StoreCartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart()

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 20px' }} className="animate-fade-in">
          <p style={{ fontSize: '64px', margin: '0 0 16px', lineHeight: 1 }}>🛒</p>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)', fontSize: '22px', fontWeight: '700' }}>
            Il tuo carrello è vuoto
          </h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 28px', fontSize: '15px' }}>
            Sfoglia il nostro catalogo e aggiungi i prodotti che preferisci.
          </p>
          <Link to="/store" className="gm-btn gm-btn-primary">
            Continua lo shopping
          </Link>
        </div>
      </StoreLayout>
    )
  }

  function handleClearCart() {
    if (window.confirm('Sei sicuro di voler svuotare il carrello?')) {
      clearCart()
    }
  }

  return (
    <StoreLayout>
      <style>{`
        @media (max-width: 768px) {
          .cart-layout { flex-direction: column !important; }
          .cart-summary { width: 100% !important; position: static !important; }
        }
      `}</style>

      <div className="animate-fade-in">
        <h1 style={{ margin: '0 0 24px', color: 'var(--color-text)', fontSize: '24px', fontWeight: '700' }}>
          🛒 Carrello
          <span style={{
            marginLeft: '10px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--color-text-muted)',
            verticalAlign: 'middle',
          }}>
            ({totalItems} {totalItems === 1 ? 'articolo' : 'articoli'})
          </span>
        </h1>

        <div className="cart-layout" style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

          {/* ── Items list ─────────────────────────────────────────── */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {items.map(item => {
              const prezzoUnitario = Number(item.prezzo_unitario ?? item.prezzo_vendita ?? 0)
              const prezzoVendita = Number(item.prezzo_vendita ?? 0)
              const hasDiscount = item.prezzo_unitario !== null &&
                item.prezzo_unitario !== undefined &&
                item.prezzo_vendita !== null &&
                item.prezzo_vendita !== undefined &&
                Number(item.prezzo_unitario) < Number(item.prezzo_vendita)
              const subtotale = prezzoUnitario * item.quantita

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ width: '72px', flexShrink: 0 }}>
                    <ProductImage
                      src={item.foto_url}
                      alt={item.nome}
                      aspectRatio="card"
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <Link
                      to={`/store/product/${item.id}`}
                      style={{
                        color: 'var(--color-text)',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '14px',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.nome}
                    </Link>
                    {item.sku && (
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        SKU: #{item.sku}
                      </p>
                    )}
                    {/* Unit price */}
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: hasDiscount ? 'var(--color-success)' : 'var(--color-primary)' }}>
                        €{prezzoUnitario.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                          €{prezzoVendita.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantita - 1)}
                      style={{
                        width: '30px', height: '30px',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        fontSize: '16px',
                        lineHeight: '1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Diminuisci quantità"
                    >
                      −
                    </button>
                    <span style={{
                      minWidth: '28px',
                      textAlign: 'center',
                      fontWeight: '700',
                      fontSize: '15px',
                      color: 'var(--color-text)',
                    }}>
                      {item.quantita}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantita + 1)}
                      disabled={item.quantita >= item.quantita_disponibile}
                      style={{
                        width: '30px', height: '30px',
                        backgroundColor: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        cursor: item.quantita >= item.quantita_disponibile ? 'not-allowed' : 'pointer',
                        color: 'var(--color-text)',
                        fontSize: '16px',
                        lineHeight: '1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: item.quantita >= item.quantita_disponibile ? 0.4 : 1,
                      }}
                      title="Aumenta quantità"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <p style={{
                    margin: 0,
                    fontWeight: '700',
                    fontSize: '15px',
                    color: 'var(--color-primary)',
                    minWidth: '68px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    €{subtotale.toFixed(2)}
                  </p>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-danger)',
                      fontSize: '20px',
                      lineHeight: '1',
                      padding: '4px 6px',
                      flexShrink: 0,
                      borderRadius: '6px',
                      transition: 'background-color 150ms ease',
                    }}
                    title="Rimuovi dal carrello"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          {/* ── Summary panel ──────────────────────────────────────── */}
          <div
            className="cart-summary"
            style={{
              flex: '0 0 300px',
              width: '300px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
              position: 'sticky',
              top: '80px',
            }}
          >
            <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '16px', fontWeight: '700' }}>
              Riepilogo ordine
            </h3>

            {/* Totals */}
            <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  Articoli
                </span>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                  {totalItems}
                </span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid var(--color-border)',
              }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text)' }}>
                  Totale
                </span>
                <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
                  €{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              className="gm-btn gm-btn-primary"
              onClick={() => alert('Funzionalità in arrivo!')}
              style={{ display: 'block', width: '100%', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
            >
              Procedi all'ordine →
            </button>

            <button
              className="gm-btn gm-btn-secondary"
              onClick={handleClearCart}
              style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '10px', cursor: 'pointer' }}
            >
              🗑 Svuota carrello
            </button>

            <Link
              to="/store"
              className="gm-btn gm-btn-ghost"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', padding: '10px' }}
            >
              ← Continua lo shopping
            </Link>
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
