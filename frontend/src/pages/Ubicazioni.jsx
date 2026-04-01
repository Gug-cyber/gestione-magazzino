import { useState, useEffect } from 'react'
import { ubicazioniAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

const emptyForm = { nome: '', zona: '', scaffale: '', piano: '' }

function Ubicazioni() {
  const isMobile = useIsMobile()
  const [ubicazioni, setUbicazioni] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const res = await ubicazioniAPI.getAll()
      setUbicazioni(res.data)
    } catch {
      setError('Errore nel caricamento')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      piano: form.piano !== '' ? parseInt(form.piano) : null,
    }
    try {
      if (editing) {
        await ubicazioniAPI.update(editing, payload)
      } else {
        await ubicazioniAPI.create(payload)
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = (u) => {
    setForm({ nome: u.nome, zona: u.zona || '', scaffale: u.scaffale || '', piano: u.piano ?? '' })
    setEditing(u.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa ubicazione?')) return
    try {
      await ubicazioniAPI.delete(id)
      fetchAll()
    } catch {
      setError('Errore nell\'eliminazione')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Ubicazioni
        </h1>
        <button 
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }} 
          className={showForm ? "btn btn-secondary" : "btn btn-primary"}
        >
          {showForm ? 'Annulla' : '+ Aggiungi Ubicazione'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card mb-6">
          <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1rem' }}>
            {editing ? 'Modifica Ubicazione' : 'Nuova Ubicazione'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2 mb-4">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome *</label>
                <input 
                  type="text" 
                  required 
                  value={form.nome} 
                  onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                  className="form-input"
                  placeholder="Nome ubicazione"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Zona</label>
                <input 
                  type="text" 
                  value={form.zona} 
                  onChange={(e) => setForm({ ...form, zona: e.target.value })} 
                  className="form-input"
                  placeholder="Es. A, B, C..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Scaffale</label>
                <input 
                  type="text" 
                  value={form.scaffale} 
                  onChange={(e) => setForm({ ...form, scaffale: e.target.value })} 
                  className="form-input"
                  placeholder="Es. S1, S2..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Piano</label>
                <input 
                  type="number" 
                  value={form.piano} 
                  onChange={(e) => setForm({ ...form, piano: e.target.value })} 
                  className="form-input"
                  placeholder="Es. 1, 2, 3..."
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">
              {editing ? 'Salva Modifiche' : 'Crea Ubicazione'}
            </button>
          </form>
        </div>
      )}

      {isMobile ? (
        <div>
          {ubicazioni.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Nessuna ubicazione trovata</div>
            </div>
          ) : ubicazioni.map((u) => (
            <div key={u.id} className="mobile-card">
              <div className="mobile-card-header">
                <div className="mobile-card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ marginRight: '0.5rem', display: 'inline' }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {u.nome}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(u)} className="btn btn-primary btn-sm btn-icon" title="Modifica">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="btn btn-danger btn-sm btn-icon" title="Elimina">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {u.zona && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Zona</span>
                  <span className="mobile-card-value">{u.zona}</span>
                </div>
              )}
              {u.scaffale && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Scaffale</span>
                  <span className="mobile-card-value">{u.scaffale}</span>
                </div>
              )}
              {u.piano != null && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Piano</span>
                  <span className="mobile-card-value">{u.piano}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Zona</th>
                <th>Scaffale</th>
                <th>Piano</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {ubicazioni.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-text">Nessuna ubicazione trovata</div>
                    </div>
                  </td>
                </tr>
              ) : ubicazioni.map((u) => (
                <tr key={u.id}>
                  <td style={{ color: 'var(--text-muted)', width: '60px' }}>{u.id}</td>
                  <td style={{ fontWeight: 500 }}>{u.nome}</td>
                  <td>{u.zona || '-'}</td>
                  <td>{u.scaffale || '-'}</td>
                  <td>{u.piano ?? '-'}</td>
                  <td style={{ width: '100px' }}>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(u)} className="btn btn-primary btn-sm btn-icon" title="Modifica">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="btn btn-danger btn-sm btn-icon" title="Elimina">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Ubicazioni
