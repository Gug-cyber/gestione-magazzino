import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'
import { useCart } from '../../context/CartContext'
import { storeAPI } from '../../api/store'

export default function StorePreferitiPage() {
  const { cliente, loading } = useClienteAuth()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const [preferiti, setPreferiti] = useState([])
  const [prefLoading, setPrefLoading] = useState(true)
  const [prefError, setPrefError] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    if (!loading && !cliente) {
      navigate('/store/login', { replace: true })
    }
  }, [cliente, loading, navigate])

  useEffect(() => {
    if (cliente) {
      storeAPI.clientePreferiti()
        .then(res => setPreferiti(res.data))
        .catch(() => setPrefError('Impossibile caricare i preferiti.'))
        .finally(() => setPrefLoading(false))
    }
  }, [cliente])

  async function handleRimuovi(prodottoId) {
    setRemovingId(prodottoId)
    try {
      await storeAPI.rimuoviPreferito(prodottoId)
      setPreferiti(prev => prev.filter(p => p.prodotto_id !== prodottoId && p.id !== prodottoId))
    } catch {
      // silently ignore
    } finally {
      setRemovingId(null)
    }
  }

  function handleAggiungiCarrello(pref) {
    addItem({
      id: pref.prodotto_id,
      nome: pref.nome_prodotto,
      prezzo_unitario: pref.prezzo,
      foto_url: pref.immagine_url,
      quantita_disponibile: 99,
    }, 1)
  }

  if (loading) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-text-secondary)' }}>
          Caricamento…
        </div>
      </StoreLayout>
    )
  }

  if (!cliente) return null

  return (
    <StoreLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 0' }}>
        <Link to="/store/account" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--color-text-secondary)', textDecoration: 'none',
          fontSize: '14px', marginBottom: '24px',
        }}>
          ← Torna all'account
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '24px' }}>
          ❤️ I miei preferiti
        </h1>

        {prefLoading && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Caricamento preferiti…
          </div>
        )}

        {prefError && (
          <div style={{
            background: 'var(--color-danger-bg, #fff0f0)',
            border: '1px solid var(--color-danger-border, #fca5a5)',
            color: 'var(--color-danger, #dc2626)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '14px',
          }}>
            {prefError}
          </div>
        )}

        {!prefLoading && !prefError && preferiti.length === 0 && (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--color-bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
            <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>
              Nessun preferito salvato
            </div>
            <div style={{ marginBottom: '16px' }}>
              Aggiungi prodotti ai preferiti mentre navighi nello store.
            </div>
            <Link to="/store" style={{
              color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none',
              padding: '8px 20px', border: '1px solid var(--color-primary)', borderRadius: '8px',
            }}>
              Vai allo store
            </Link>
          </div>
        )}

        {!prefLoading && preferiti.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '24px',
          }}>
            {preferiti.map(pref => {
              const prodottoId = pref.prodotto_id
              return (
                <div key={pref.id || prodottoId} style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 280ms ease, box-shadow 280ms ease',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  {/* Immagine con aspect ratio 4:5 come ProductCard */}
                  <Link to={`/store/product/${prodottoId}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '4/5',
                      overflow: 'hidden',
                      backgroundColor: 'var(--color-surface-hover)',
                    }}>
                      {pref.immagine_url ? (
                        <img
                          src={pref.immagine_url}
                          alt={pref.nome_prodotto}
                          style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '40px', color: 'var(--color-text-muted)', opacity: 0.4,
                        }}>
                          🛍️
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Body */}
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Link to={`/store/product/${prodottoId}`} style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
                      <div style={{
                        fontWeight: '600', fontSize: '14px', lineHeight: '1.35',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {pref.nome_prodotto || '—'}
                      </div>
                    </Link>

                    {pref.prezzo != null && (
                      <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                        €{Number(pref.prezzo).toFixed(2)}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => handleAggiungiCarrello(pref)}
                        style={{
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
                          transition: 'all 200ms ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(5,150,105,0.4)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(5,150,105,0.3)' }}
                      >
                        🛒 Aggiungi al carrello
                      </button>
                      <button
                        onClick={() => handleRimuovi(prodottoId)}
                        disabled={removingId === prodottoId}
                        style={{
                          padding: '9px 12px',
                          background: 'transparent',
                          color: 'var(--color-danger, #dc2626)',
                          border: '1px solid var(--color-danger, #dc2626)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: removingId === prodottoId ? 'wait' : 'pointer',
                          width: '100%',
                          opacity: removingId === prodottoId ? 0.6 : 1,
                          transition: 'all 200ms ease',
                        }}
                      >
                        {removingId === prodottoId ? 'Rimozione…' : '🗑️ Rimuovi dai preferiti'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
