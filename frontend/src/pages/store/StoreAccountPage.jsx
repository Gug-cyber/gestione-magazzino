import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'
import { storeAPI } from '../../api/store'

export default function StoreAccountPage() {
  const { cliente, loading, logout } = useClienteAuth()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ nome: '', cognome: '', telefono: '', indirizzo: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)
  const [editSuccess, setEditSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !cliente) {
      navigate('/store/login', { replace: true })
    }
  }, [cliente, loading, navigate])

  useEffect(() => {
    if (cliente) {
      setEditForm({
        nome: cliente.nome || '',
        cognome: cliente.cognome || '',
        telefono: cliente.telefono || '',
        indirizzo: cliente.indirizzo || '',
      })
    }
  }, [cliente])

  function handleLogout() {
    logout()
    navigate('/store')
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    setEditSuccess(false)
    try {
      await storeAPI.clienteUpdate(editForm)
      setEditSuccess(true)
      setEditOpen(false)
    } catch {
      setEditError('Impossibile salvare le modifiche. Riprova.')
    } finally {
      setEditLoading(false)
    }
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
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 0' }}>
        {/* Header con avatar e logout */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
          marginBottom: '32px',
          padding: '24px',
          background: 'var(--color-bg-elevated)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: '700', flexShrink: 0,
            }}>
              {(cliente.nome?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--color-text)' }}>
                {cliente.nome} {cliente.cognome}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
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
              fontSize: '14px', fontWeight: '600',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Esci
          </button>
        </div>

        {editSuccess && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            color: '#16a34a', borderRadius: '8px',
            padding: '10px 14px', fontSize: '14px', marginBottom: '16px',
          }}>
            Profilo aggiornato con successo!
          </div>
        )}

        {/* Card links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link to="/store/ordini" style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '18px 20px',
            background: 'var(--color-bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            textDecoration: 'none',
            color: 'var(--color-text)',
            fontWeight: '600', fontSize: '15px',
            transition: 'border-color 150ms',
          }}>
            <span style={{ fontSize: '24px' }}>📦</span>
            <span>I miei ordini</span>
            <span style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)' }}>›</span>
          </Link>

          <Link to="/store/preferiti" style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '18px 20px',
            background: 'var(--color-bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            textDecoration: 'none',
            color: 'var(--color-text)',
            fontWeight: '600', fontSize: '15px',
          }}>
            <span style={{ fontSize: '24px' }}>❤️</span>
            <span>I miei preferiti</span>
            <span style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)' }}>›</span>
          </Link>

          <div>
            <button
              onClick={() => setEditOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '18px 20px', width: '100%',
                background: 'var(--color-bg-elevated)',
                borderRadius: editOpen ? '12px 12px 0 0' : '12px',
                border: '1px solid var(--color-border)',
                borderBottom: editOpen ? 'none' : '1px solid var(--color-border)',
                cursor: 'pointer',
                color: 'var(--color-text)',
                fontWeight: '600', fontSize: '15px',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px' }}>✏️</span>
              <span>Modifica profilo</span>
              <span style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)' }}>
                {editOpen ? '▲' : '▼'}
              </span>
            </button>

            {editOpen && (
              <form onSubmit={handleEditSubmit} style={{
                padding: '20px',
                background: 'var(--color-bg-elevated)',
                borderRadius: '0 0 12px 12px',
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}>
                {[
                  { name: 'nome', label: 'Nome' },
                  { name: 'cognome', label: 'Cognome' },
                  { name: 'telefono', label: 'Telefono' },
                  { name: 'indirizzo', label: 'Indirizzo' },
                ].map(({ name, label }) => (
                  <div key={name}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      {label}
                    </label>
                    <input
                      type="text"
                      value={editForm[name]}
                      onChange={e => setEditForm(prev => ({ ...prev, [name]: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 12px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px', fontSize: '14px',
                        color: 'var(--color-text)', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}

                {editError && (
                  <div style={{ color: 'var(--color-danger, #dc2626)', fontSize: '13px' }}>{editError}</div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditOpen(false)}
                    style={{
                      padding: '8px 16px', background: 'transparent',
                      border: '1px solid var(--color-border)', borderRadius: '8px',
                      fontSize: '14px', cursor: 'pointer', color: 'var(--color-text-secondary)',
                    }}>
                    Annulla
                  </button>
                  <button type="submit" disabled={editLoading}
                    style={{
                      padding: '8px 20px',
                      background: 'var(--color-primary)', color: '#fff',
                      border: 'none', borderRadius: '8px',
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      opacity: editLoading ? 0.7 : 1,
                    }}>
                    {editLoading ? 'Salvataggio…' : 'Salva'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
