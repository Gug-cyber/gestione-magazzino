import { useState, useEffect } from 'react'
import { fornitoriAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

const emptyForm = { nome: '', email: '', telefono: '', indirizzo: '', partita_iva: '', note: '' }

function Fornitori() {
  const isMobile = useIsMobile()
  const [fornitori, setFornitori] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const res = await fornitoriAPI.getAll()
      setFornitori(res.data)
    } catch {
      setError('Errore nel caricamento')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await fornitoriAPI.update(editing, form)
      } else {
        await fornitoriAPI.create(form)
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = (f) => {
    setForm({ nome: f.nome, email: f.email || '', telefono: f.telefono || '', indirizzo: f.indirizzo || '', partita_iva: f.partita_iva || '', note: f.note || '' })
    setEditing(f.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo fornitore?')) return
    try {
      await fornitoriAPI.delete(id)
      fetchAll()
    } catch {
      setError('Errore nell\'eliminazione')
    }
  }

  const fields = [
    { key: 'nome', label: 'Nome *', required: true },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'indirizzo', label: 'Indirizzo' },
    { key: 'partita_iva', label: 'Partita IVA' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Fornitori
        </h1>
        <button 
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }} 
          className={showForm ? "btn btn-secondary" : "btn btn-primary"}
        >
          {showForm ? 'Annulla' : '+ Aggiungi Fornitore'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card mb-6">
          <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '1rem' }}>
            {editing ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2 mb-4">
              {fields.map(({ key, label, required }) => (
                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{label}</label>
                  <input
                    type="text"
                    required={required}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="form-input"
                    placeholder={label.replace(' *', '')}
                  />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
                className="form-textarea"
                placeholder="Note aggiuntive..."
              />
            </div>
            <button type="submit" className="btn btn-success">
              {editing ? 'Salva Modifiche' : 'Crea Fornitore'}
            </button>
          </form>
        </div>
      )}

      {isMobile ? (
        <div>
          {fornitori.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Nessun fornitore trovato</div>
            </div>
          ) : fornitori.map((f) => (
            <div key={f.id} className="mobile-card">
              <div className="mobile-card-header">
                <div className="mobile-card-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ marginRight: '0.5rem', display: 'inline' }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  {f.nome}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(f)} className="btn btn-primary btn-sm btn-icon" title="Modifica">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(f.id)} className="btn btn-danger btn-sm btn-icon" title="Elimina">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {f.email && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Email</span>
                  <span className="mobile-card-value">{f.email}</span>
                </div>
              )}
              {f.telefono && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Telefono</span>
                  <span className="mobile-card-value">{f.telefono}</span>
                </div>
              )}
              {f.partita_iva && (
                <div className="mobile-card-row">
                  <span className="mobile-card-label">P.IVA</span>
                  <span className="mobile-card-value">{f.partita_iva}</span>
                </div>
              )}
              {f.note && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{f.note}</div>
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
                <th>Email</th>
                <th>Telefono</th>
                <th>Partita IVA</th>
                <th>Note</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {fornitori.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-text">Nessun fornitore trovato</div>
                    </div>
                  </td>
                </tr>
              ) : fornitori.map((f) => (
                <tr key={f.id}>
                  <td style={{ color: 'var(--text-muted)', width: '60px' }}>{f.id}</td>
                  <td style={{ fontWeight: 500 }}>{f.nome}</td>
                  <td>{f.email || '-'}</td>
                  <td>{f.telefono || '-'}</td>
                  <td>{f.partita_iva || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.note || ''}>
                    {f.note || '-'}
                  </td>
                  <td style={{ width: '100px' }}>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(f)} className="btn btn-primary btn-sm btn-icon" title="Modifica">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(f.id)} className="btn btn-danger btn-sm btn-icon" title="Elimina">
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

export default Fornitori
