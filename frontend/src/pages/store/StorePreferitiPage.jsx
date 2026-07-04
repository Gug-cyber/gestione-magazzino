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
    const prodotto = pref.prodotto || pref
    addItem({
      id: prodotto.id || pref.prodotto_id,
      nome: prodotto.nome,
      prezzo: prodotto.prezzo,
      immagine_url: prodotto.immagine_url,
      quantita: 1,
    })
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
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 0' }}>
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
            gap: '16px',
          }}>
            {preferiti.map(pref => {
              const prodotto = pref.prodotto || pref
              const prodottoId = pref.prodotto_id || prodotto.id
              return (
                <div key={pref.id || prodottoId} style={{
                  background: 'var(--color-bg-elevated)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <Link to={`/store/product/${prodottoId}`} style={{ textDecoration: 'none' }}>
                    {prodotto.immagine_url ? (
                      <img
                        src={prodotto.immagine_url}
                        alt={prodotto.nome}
                        style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '180px',
                        background: 'var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '40px',
                      }}>
                        🛍️
                      </div>
                    )}
                  </Link>
                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Link to={`/store/product/${prodottoId}`} style={{ textDecoration: 'none', color: 'var(--color-text)' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', lineHeight: '1.3' }}>
                        {prodotto.nome || '—'}
                      </div>
                    </Link>
                    {prodotto.prezzo != null && (
                      <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-primary)' }}>
                        €{Number(prodotto.prezzo).toFixed(2)}
                      </div>
                    )}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => handleAggiungiCarrello(pref)}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%',
                        }}
                      >
                        🛒 Aggiungi al carrello
                      </button>
                      <button
                        onClick={() => handleRimuovi(prodottoId)}
                        disabled={removingId === prodottoId}
                        style={{
                          padding: '7px 12px',
                          background: 'transparent',
                          color: 'var(--color-danger, #dc2626)',
                          border: '1px solid var(--color-danger, #dc2626)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: removingId === prodottoId ? 'wait' : 'pointer',
                          width: '100%',
                          opacity: removingId === prodottoId ? 0.6 : 1,
                        }}
                      >
                        🗑️ Rimuovi dai preferiti
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
