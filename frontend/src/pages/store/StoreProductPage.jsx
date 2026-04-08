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
          style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px', transition: 'color 150ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          ← Torna allo store
        </Link>

        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{
            flex: '0 0 auto',
            width: 'min(460px, 100%)',
            height: '460px',
            backgroundColor: prodotto.foto_url ? undefined : 'var(--color-surface-hover)',
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            {prodotto.foto_url ? (
              <img src={prodotto.foto_url} alt={prodotto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '100px', opacity: 0.25 }}>🃏</span>
            )}
          </div>

          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '800', color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
              {prodotto.nome}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {isEsaurito && (
                <span style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--color-danger-border)' }}>
                  Esaurito
                </span>
              )}
              {prodotto.in_esaurimento && !isEsaurito && (
                <span style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--color-warning-border)' }}>
                  In esaurimento
                </span>
              )}
              {!isEsaurito && prodotto.quantita <= 3 && (
                <span style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--color-info-border)' }}>
                  Solo {prodotto.quantita} disponibili
                </span>
              )}
              {!isEsaurito && prodotto.quantita > 3 && (
                <span style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', border: '1px solid var(--color-success-border)' }}>
                  ✓ Disponibile
                </span>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: '800', color: 'var(--color-primary)', letterSpacing: '-1px', lineHeight: '1' }}>
                {prezzo}
              </p>
            </div>

            {prodotto.descrizione ? (
              <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '10px', padding: '14px 16px', borderLeft: '3px solid var(--color-primary)' }}>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                  {prodotto.descrizione}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                Nessuna descrizione disponibile.
              </p>
            )}

            {!isEsaurito && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Quantità:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--color-text)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <span style={{ width: '44px', textAlign: 'center', fontWeight: '700', fontSize: '18px', color: 'var(--color-text)' }}>{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(prodotto.quantita, q + 1))}
                    style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--color-text)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleAddToCart}
                disabled={isEsaurito}
                className="gm-btn"
                style={{
                  backgroundColor: added ? 'var(--color-success)' : isEsaurito ? 'var(--color-surface-hover)' : 'var(--color-primary)',
                  color: isEsaurito ? 'var(--color-text-muted)' : '#fff',
                  cursor: isEsaurito ? 'not-allowed' : 'pointer',
                  padding: '14px 32px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '16px',
                  border: 'none',
                  transition: 'background-color 200ms ease',
                }}
              >
                {isEsaurito ? 'Esaurito' : added ? '✓ Aggiunto al carrello!' : inCart ? `Aggiungi ancora (${cartQty} nel carrello)` : '🛒 Aggiungi al carrello'}
              </button>

              {inCart && (
                <Link to="/store/cart" className="gm-btn gm-btn-secondary" style={{ padding: '14px 24px', textDecoration: 'none', borderRadius: '12px', fontSize: '15px' }}>
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
