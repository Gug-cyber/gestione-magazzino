import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'
import { storeAPI } from '../../api/store'

export default function StoreAccountPage() {
  const { cliente, loading, logout } = useClienteAuth()
  const navigate = useNavigate()
  const [ordini, setOrdini] = useState([])
  const [ordiniLoading, setOrdiniLoading] = useState(true)
  const [ordiniError, setOrdiniError] = useState(null)

  useEffect(() => {
    if (!loading && !cliente) {
      navigate('/store/login', { replace: true })
    }
  }, [cliente, loading, navigate])

  useEffect(() => {
    if (cliente) {
      storeAPI.clienteOrdini()
        .then(res => setOrdini(res.data))
        .catch(() => setOrdiniError('Impossibile caricare gli ordini.'))
        .finally(() => setOrdiniLoading(false))
    }
  }, [cliente])

  function handleLogout() {
    logout()
    navigate('/store')
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
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 0' }}>
        {/* Intestazione account */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '32px',
          padding: '24px',
          background: 'var(--color-bg-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              flexShrink: 0,
            }}>
              {(cliente.nome?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--color-text)' }}>
                {cliente.nome} {cliente.cognome}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {cliente.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 18px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Esci
          </button>
        </div>

        {/* Lista ordini */}
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '16px' }}>
          I tuoi ordini
        </h2>

        {ordiniLoading && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Caricamento ordini…
          </div>
        )}

        {ordiniError && (
          <div style={{
            background: 'var(--color-danger-bg, #fff0f0)',
            border: '1px solid var(--color-danger-border, #fca5a5)',
            color: 'var(--color-danger, #dc2626)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '14px',
          }}>
            {ordiniError}
          </div>
        )}

        {!ordiniLoading && !ordiniError && ordini.length === 0 && (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            background: 'var(--color-bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
          }}>
            Non hai ancora effettuato ordini.{' '}
            <Link to="/store" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
              Vai allo store
            </Link>
          </div>
        )}

        {!ordiniLoading && ordini.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ordini.map(ordine => (
              <div
                key={ordine.id}
                style={{
                  padding: '16px 20px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '15px' }}>
                    Ordine #{ordine.id}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {ordine.data_ordine
                      ? new Date(ordine.data_ordine).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {ordine.stato && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'var(--color-primary-bg, #eff6ff)',
                      color: 'var(--color-primary)',
                    }}>
                      {ordine.stato}
                    </span>
                  )}
                  {ordine.totale != null && (
                    <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text)' }}>
                      €{Number(ordine.totale).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
