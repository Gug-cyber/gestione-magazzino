import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { amministrazioneAPI } from '../api/client'

export default function Amministrazione() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUtente, setEditingUtente] = useState(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', is_admin: false, is_active: true })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/dashboard')
      return
    }
    fetchUtenti()
  }, [user, navigate])

  const fetchUtenti = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await amministrazioneAPI.getUtenti()
      setUtenti(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingUtente(null)
    setForm({ username: '', email: '', password: '', is_admin: false, is_active: true })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (utente) => {
    setEditingUtente(utente)
    setForm({ username: utente.username, email: utente.email, password: '', is_admin: utente.is_admin, is_active: utente.is_active })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingUtente(null)
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      if (editingUtente) {
        const payload = {}
        if (form.username) payload.username = form.username
        if (form.email) payload.email = form.email
        if (form.password) payload.password = form.password
        payload.is_admin = form.is_admin
        payload.is_active = form.is_active
        await amministrazioneAPI.updateUtente(editingUtente.id, payload)
      } else {
        await amministrazioneAPI.createUtente({
          username: form.username,
          email: form.email,
          password: form.password,
          is_admin: form.is_admin,
        })
      }
      closeModal()
      fetchUtenti()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (utente) => {
    if (!window.confirm(`Eliminare l'utente "${utente.username}"? Questa azione è irreversibile.`)) return
    try {
      await amministrazioneAPI.deleteUtente(utente.id)
      fetchUtenti()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'eliminazione')
    }
  }

  const totale = utenti.length
  const admins = utenti.filter(u => u.is_admin).length
  const disattivati = utenti.filter(u => !u.is_active).length
  const soloAdmin = admins === 1 && utenti.find(u => u.is_admin)?.id === user?.id

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('it-IT')
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#1a237e', fontSize: 'clamp(20px, 4vw, 28px)' }}>⚙️ Gestione Utenti</h1>
        <button
          onClick={openCreate}
          style={{
            backgroundColor: '#1a237e',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + Nuovo Utente
        </button>
      </div>

      {/* Warning solo admin */}
      {soloAdmin && (
        <div style={{
          backgroundColor: '#fff8e1',
          border: '1px solid #ffd54f',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          color: '#f57f17',
          fontSize: 14,
        }}>
          ⚠️ Sei l'unico amministratore. Assicurati di avere sempre almeno un account admin attivo.
        </div>
      )}

      {/* Statistiche */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>👥</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a237e' }}>{totale}</div>
          <div style={{ color: '#555', fontSize: 13 }}>Totale Utenti</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>👑</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#6a1b9a' }}>{admins}</div>
          <div style={{ color: '#555', fontSize: 13 }}>Amministratori</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 28 }}>🔒</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#c62828' }}>{disattivati}</div>
          <div style={{ color: '#555', fontSize: 13 }}>Disattivati</div>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div style={{ backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#c62828', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Tabella */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Caricamento...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: '#1a237e', color: '#fff' }}>
                  {['ID', 'Username', 'Email', 'Ruolo', 'Stato', 'Creato il', 'Azioni'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {utenti.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#888' }}>Nessun utente trovato</td>
                  </tr>
                ) : (
                  utenti.map((u, idx) => (
                    <tr key={u.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9ff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 16px', color: '#888' }}>{u.id}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 500 }}>{u.username}</td>
                      <td style={{ padding: '10px 16px', color: '#555' }}>{u.email}</td>
                      <td style={{ padding: '10px 16px' }}>
                        {u.is_admin ? (
                          <span style={{ backgroundColor: '#ede7f6', color: '#6a1b9a', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>👑 Admin</span>
                        ) : (
                          <span style={{ backgroundColor: '#e3f2fd', color: '#1565c0', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>👤 Utente</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {u.is_active ? (
                          <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>✅ Attivo</span>
                        ) : (
                          <span style={{ backgroundColor: '#ffebee', color: '#c62828', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>🔒 Disattivato</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#888', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => openEdit(u)}
                          title="Modifica"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginRight: 8 }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Elimina"
                          disabled={u.id === user?.id}
                          style={{ background: 'none', border: 'none', cursor: u.id === user?.id ? 'not-allowed' : 'pointer', fontSize: 18, opacity: u.id === user?.id ? 0.3 : 1 }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ margin: '0 0 20px', color: '#1a237e', fontSize: 20 }}>
              {editingUtente ? '✏️ Modifica Utente' : '+ Nuovo Utente'}
            </h2>

            {formError && (
              <div style={{ backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#c62828', fontSize: 13 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#333' }}>Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#333' }}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#333' }}>
                  Password {editingUtente ? '' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editingUtente}
                  placeholder={editingUtente ? 'Lascia vuoto per non cambiare' : ''}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#333' }}>Ruolo</label>
                <select
                  value={form.is_admin ? 'admin' : 'user'}
                  onChange={e => setForm(f => ({ ...f, is_admin: e.target.value === 'admin' }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                >
                  <option value="user">Utente normale</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>

              {editingUtente && (
                <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="is_active" style={{ fontSize: 13, fontWeight: 600, color: '#333', cursor: 'pointer' }}>Account attivo</label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ padding: '9px 20px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    border: 'none',
                    borderRadius: 6,
                    backgroundColor: '#1a237e',
                    color: '#fff',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
