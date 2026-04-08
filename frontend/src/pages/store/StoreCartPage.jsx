import { Link } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useCart } from '../../context/CartContext'

export default function StoreCartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }} className="animate-fade-in">
          <p style={{ fontSize: '60px', margin: '0 0 16px' }}>🛒</p>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>Il carrello è vuoto</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 24px' }}>
            Aggiungi prodotti dal nostro store per iniziare
          </p>
          <Link to="/store" className="gm-btn gm-btn-primary">
            Vai allo store
          </Link>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        <h1 style={{ margin: '0 0 24px', color: 'var(--color-text)', fontSize: '24px', fontWeight: '700' }}>
          🛒 Carrello
        </h1>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Items list */}
          <div style={{ flex: '1 1 400px' }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  alignItems: 'center',
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {item.foto_url ? (
                    <img src={item.foto_url} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', opacity: 0.4 }}>🃏</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: '500', fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.nome}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                     €{Number(item.prezzo_unitario ?? item.prezzo_vendita ?? 0).toFixed(2)} × {item.quantita}
                  </p>
                </div>

                {/* Quantity controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantita - 1)}
                    style={{
                      width: '28px', height: '28px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                      fontSize: '14px',
                    }}
                  >−</button>
                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '600', fontSize: '14px', color: 'var(--color-text)' }}>
                    {item.quantita}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantita + 1)}
                    disabled={item.quantita >= item.quantita_disponibile}
                    style={{
                      width: '28px', height: '28px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '5px',
                      cursor: item.quantita >= item.quantita_disponibile ? 'not-allowed' : 'pointer',
                      color: 'var(--color-text)',
                      fontSize: '14px',
                      opacity: item.quantita >= item.quantita_disponibile ? 0.4 : 1,
                    }}
                  >+</button>
                </div>

                {/* Subtotal */}
                <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: 'var(--color-primary)', minWidth: '60px', textAlign: 'right', flexShrink: 0 }}>
                  €{(Number(item.prezzo_unitario ?? item.prezzo_vendita ?? 0) * item.quantita).toFixed(2)}
                </p>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-danger)',
                    fontSize: '18px',
                    padding: '4px',
                    flexShrink: 0,
                  }}
                  title="Rimuovi"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Summary panel */}
          <div style={{
            flex: '0 0 auto',
            width: 'min(320px, 100%)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '20px',
            position: 'sticky',
            top: '72px',
          }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '16px', fontWeight: '600' }}>
              Riepilogo ordine
            </h3>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>Totale</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                  €{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <Link
              to="/store/checkout"
              className="gm-btn gm-btn-primary"
              style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', padding: '12px', marginBottom: '10px' }}
            >
              Procedi al checkout →
            </Link>

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
