import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientiAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

function formatCurrency(amount) {
  return Number(amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const emptyForm = {
  tipo: 'privato',
  nome: '',
  cognome: '',
  email: '',
  telefono: '',
  indirizzo: '',
  citta: '',
  cap: '',
  provincia: '',
  partita_iva: '',
  codice_fiscale: '',
  note: '',
}

export default function Clienti() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const fetchClienti = useCallback(async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const res = await clientiAPI.getAll(params)
      setClienti(res.data)
    } catch {
      setError('Errore nel caricamento dei clienti')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClienti()
  }, [fetchClienti])

  const handleSearch = () => {
    const params = {}
    if (search) params.search = search
    fetchClienti(params)
  }

  const handleReset = () => {
    setSearch('')
    fetchClienti()
  }

  const openNewModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (c) => {
    setForm({
      tipo: c.tipo || 'privato',
      nome: c.nome || '',
      cognome: c.cognome || '',
      email: c.email || '',
      telefono: c.telefono || '',
      indirizzo: c.indirizzo || '',
      citta: c.citta || '',
      cap: c.cap || '',
      provincia: c.provincia || '',
      partita_iva: c.partita_iva || '',
      codice_fiscale: c.codice_fiscale || '',
      note: c.note || '',
    })
    setEditingId(c.id)
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormError('')
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const updated = { ...prev, [name]: value }
      if (name === 'tipo' && value === 'azienda') {
        updated.cognome = ''
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setFormError('Il nome e obbligatorio')
      return
    }
    if (form.tipo === 'azienda' && !form.partita_iva.trim()) {
      setFormError('La partita IVA e obbligatoria per le aziende')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      if (editingId) {
        await clientiAPI.update(editingId, form)
      } else {
        await clientiAPI.create(form)
      }
      closeModal()
      fetchClienti(search ? { search } : {})
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente?')) return
    try {
      await clientiAPI.delete(id)
      fetchClienti(search ? { search } : {})
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'eliminazione del cliente')
    }
  }

  const totaleClienti = clienti.length
  const numAziende = clienti.filter((c) => c.tipo === 'azienda').length
  const numPrivati = clienti.filter((c) => c.tipo === 'privato').length
  const fatturatoTotale = clienti.reduce((sum, c) => sum + (c.totale_ordini || 0), 0)

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <div className="page-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Clienti</h1>
            <p className="page-subtitle">Gestione anagrafica clienti</p>
          </div>
        </div>
        <button onClick={openNewModal} className="btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nuovo Cliente
        </button>
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-blue">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Totale Clienti</span>
            <span className="stat-value">{totaleClienti}</span>
          </div>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
              <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Aziende</span>
            <span className="stat-value">{numAziende}</span>
          </div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Privati</span>
            <span className="stat-value">{numPrivati}</span>
          </div>
        </div>
        <div className="stat-card stat-card-amber">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Totale Ordini</span>
            <span className="stat-value">{formatCurrency(fatturatoTotale)}</span>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-input-wrapper">
            <svg className="filter-input-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca per nome, email, P.IVA..."
              className="filter-input"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">
            Cerca
          </button>
          <button onClick={handleReset} className="btn-secondary">
            Reset
          </button>
        </div>
      </div>

      {/* Table / Card list */}
      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="loading-state">Caricamento...</div>
        ) : clienti.length === 0 ? (
          <div className="empty-state">
            Nessun cliente trovato.{' '}
            <button onClick={openNewModal} className="link-button">
              Aggiungine uno!
            </button>
          </div>
        ) : isMobile ? (
          <div className="mobile-cards">
            {clienti.map((c) => {
              const nomeCompleto = c.cognome ? `${c.nome} ${c.cognome}` : c.nome
              return (
                <div key={c.id} className="mobile-card">
                  <div className="mobile-card-header">
                    <span className="mobile-card-title">{nomeCompleto}</span>
                    <span className={`badge ${c.tipo === 'azienda' ? 'badge-purple' : 'badge-blue'}`}>
                      {c.tipo === 'azienda' ? 'Azienda' : 'Privato'}
                    </span>
                  </div>
                  {c.email && <div className="mobile-card-detail">{c.email}</div>}
                  {c.telefono && <div className="mobile-card-detail">{c.telefono}</div>}
                  {c.citta && <div className="mobile-card-detail">{c.citta}{c.provincia ? ` (${c.provincia})` : ''}</div>}
                  <div className="mobile-card-actions">
                    <button onClick={() => openEditModal(c)} className="btn-icon btn-icon-blue" title="Modifica">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="btn-icon btn-icon-red" title="Elimina">
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                    <button onClick={() => navigate(`/clienti/${c.id}`)} className="btn-secondary-sm">
                      Dettagli
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Cognome</th>
                  <th>Tipo</th>
                  <th>Email</th>
                  <th>Telefono</th>
                  <th>Citta</th>
                  <th>P.IVA</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {clienti.map((c) => (
                  <tr key={c.id}>
                    <td className="text-muted">{c.id}</td>
                    <td className="text-bold">{c.nome}</td>
                    <td>{c.cognome || '—'}</td>
                    <td>
                      <span className={`badge ${c.tipo === 'azienda' ? 'badge-purple' : 'badge-blue'}`}>
                        {c.tipo === 'azienda' ? 'Azienda' : 'Privato'}
                      </span>
                    </td>
                    <td>{c.email || '—'}</td>
                    <td>{c.telefono || '—'}</td>
                    <td>{c.citta || '—'}</td>
                    <td>{c.partita_iva || '—'}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => openEditModal(c)} className="btn-icon btn-icon-blue" title="Modifica">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="btn-icon btn-icon-red" title="Elimina">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                        <button onClick={() => navigate(`/clienti/${c.id}`)} className="btn-icon btn-icon-gray" title="Dettagli">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingId ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h2>
              <button onClick={closeModal} className="modal-close">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {formError && <div className="error-banner">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleFormChange} className="form-input">
                    <option value="privato">Privato</option>
                    <option value="azienda">Azienda</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{form.tipo === 'azienda' ? 'Ragione Sociale *' : 'Nome *'}</label>
                  <input name="nome" value={form.nome} onChange={handleFormChange} required className="form-input" placeholder={form.tipo === 'azienda' ? 'Ragione sociale' : 'Nome'} />
                </div>

                {form.tipo === 'privato' && (
                  <div className="form-group">
                    <label className="form-label">Cognome</label>
                    <input name="cognome" value={form.cognome} onChange={handleFormChange} className="form-input" placeholder="Cognome" />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} className="form-input" placeholder="email@esempio.it" />
                </div>

                <div className="form-group">
                  <label className="form-label">Telefono</label>
                  <input name="telefono" value={form.telefono} onChange={handleFormChange} className="form-input" placeholder="+39 000 0000000" />
                </div>

                <div className="form-group form-full">
                  <label className="form-label">Indirizzo</label>
                  <input name="indirizzo" value={form.indirizzo} onChange={handleFormChange} className="form-input" placeholder="Via Roma, 1" />
                </div>

                <div className="form-group">
                  <label className="form-label">Citta</label>
                  <input name="citta" value={form.citta} onChange={handleFormChange} className="form-input" placeholder="Milano" />
                </div>

                <div className="form-group">
                  <label className="form-label">CAP</label>
                  <input name="cap" value={form.cap} onChange={handleFormChange} className="form-input" placeholder="20100" maxLength={5} />
                </div>

                <div className="form-group">
                  <label className="form-label">Provincia</label>
                  <input name="provincia" value={form.provincia} onChange={handleFormChange} className="form-input" placeholder="MI" maxLength={2} />
                </div>

                <div className="form-group">
                  <label className="form-label">Partita IVA{form.tipo === 'azienda' ? ' *' : ''}</label>
                  <input name="partita_iva" value={form.partita_iva} onChange={handleFormChange} className="form-input" placeholder="IT12345678901" />
                </div>

                <div className="form-group">
                  <label className="form-label">Codice Fiscale</label>
                  <input name="codice_fiscale" value={form.codice_fiscale} onChange={handleFormChange} className="form-input" placeholder="RSSMRA80A01H501U" />
                </div>

                <div className="form-group form-full">
                  <label className="form-label">Note</label>
                  <textarea name="note" value={form.note} onChange={handleFormChange} className="form-input form-textarea" placeholder="Note aggiuntive..." />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Annulla
                </button>
                <button type="submit" disabled={submitting} className={editingId ? 'btn-success' : 'btn-primary'}>
                  {submitting ? 'Salvataggio...' : (editingId ? 'Salva Modifiche' : 'Crea Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
