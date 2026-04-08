import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'

export default function StoreProductPage() {
  const { id } = useParams()
  const { addItem, isInCart, getItemQty } = useCart()
  const [prodotto, setProdotto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    async function fetchProdotto() {
      setLoading(true)
      setError(null)
      try {
        const res = await storeAPI.getProdotto(id)
        setProdotto(res.data)
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Prodotto non trovato o non disponibile.')
        } else {
          setError('Errore nel caricamento del prodotto.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProdotto()
  }, [id])

  function handleAddToCart() {
    if (!prodotto) return
    addItem({ ...prodotto, quantita_disponibile: prodotto.quantita }, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <StoreLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      </StoreLayout>
    )
  }

  if (error || !prodotto) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>{error || 'Prodotto non trovato'}</p>
          <Link to="/store" className="gm-btn gm-btn-secondary">← Torna allo store</Link>
        </div>
      </StoreLayout>
    )
  }

  const inCart = isInCart(prodotto.id)
  const cartQty = getItemQty(prodotto.id)
  const isEsaurito = prodotto.quantita === 0
  const prezzo = prodotto.prezzo_vendita != null
    ? `€${Number(prodotto.prezzo_vendita).toFixed(2)}`
    : '—'

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        <Link
          to="/store"
          style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
        >
          ← Torna allo store
        </Link>

        <div style={{
          display: 'flex',
          gap: '48px',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}>
          {/* Image */}
          <div style={{
            flex: '0 0 auto',
            width: 'min(420px, 100%)',
            height: '420px',
            backgroundColor: prodotto.foto_url ? undefined : 'var(--color-surface-hover)',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            {prodotto.foto_url ? (
              <img
                src={prodotto.foto_url}
                alt={prodotto.nome}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '80px', opacity: 0.3 }}>🃏</span>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--color-text)' }}>
              {prodotto.nome}
            </h1>

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {isEsaurito && (
                <span className="gm-badge" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                  Esaurito
                </span>
              )}
              {prodotto.in_esaurimento && !isEsaurito && (
                <span className="gm-badge" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                  In esaurimento
                </span>
              )}
              {!isEsaurito && prodotto.quantita <= 3 && (
                <span className="gm-badge" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                  Solo {prodotto.quantita} disponibili
                </span>
              )}
              {!isEsaurito && prodotto.quantita > 3 && (
                <span className="gm-badge" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                  Disponibile ({prodotto.quantita})
                </span>
              )}
            </div>

            {/* Price */}
            <p style={{ margin: 0, fontSize: '38px', fontWeight: '700', color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              {prezzo}
            </p>

            {/* Description */}
            {prodotto.descrizione && (
              <div style={{ backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', padding: '12px 16px', borderLeft: '3px solid var(--color-primary)' }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                  {prodotto.descrizione}
                </p>
              </div>
            )}

            {/* Quantity selector */}
            {!isEsaurito && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Quantità:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{
                      width: '40px', height: '40px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                      fontSize: '16px',
                    }}
                  >−</button>
                  <span style={{
                    width: '40px', textAlign: 'center',
                    fontWeight: 700, fontSize: '18px',
                    color: 'var(--color-text)',
                  }}>{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(prodotto.quantita, q + 1))}
                    style={{
                      width: '40px', height: '40px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                      fontSize: '16px',
                    }}
                  >+</button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleAddToCart}
                disabled={isEsaurito}
                className="gm-btn"
                style={{
                  backgroundColor: added
                    ? 'var(--color-success)'
                    : isEsaurito
                      ? 'var(--color-surface-hover)'
                      : 'var(--color-primary)',
                  color: isEsaurito ? 'var(--color-text-muted)' : '#fff',
                  cursor: isEsaurito ? 'not-allowed' : 'pointer',
                  padding: '14px 32px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '16px',
                  border: 'none',
                  transition: 'background-color 200ms ease',
                }}
              >
                {isEsaurito ? 'Esaurito' : added ? '✓ Aggiunto!' : inCart ? `Aggiungi ancora (${cartQty} nel carrello)` : 'Aggiungi al carrello'}
              </button>

              {inCart && (
                <Link to="/store/cart" className="gm-btn gm-btn-secondary" style={{ padding: '14px 32px', textDecoration: 'none' }}>
                  Vai al carrello →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
