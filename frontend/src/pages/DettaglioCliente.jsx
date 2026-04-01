import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientiAPI } from '../api/client'
import '../styles/shared.css'

const STATO_COLORS = {
  bozza: { bg: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-secondary)' },
  confermato: { bg: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' },
  spedito: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' },
  completato: { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' },
  annullato: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' },
}

// Icons
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
  </svg>
)

const ClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
)

const ShoppingCartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
)

const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
)

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

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

export default function DettaglioCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scheda, setScheda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await clientiAPI.getStorico(id)
      setScheda(res.data)
    } catch {
      setError('Cliente non trovato')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleEditOpen = () => {
    setForm({
      tipo: scheda.tipo || 'privato',
      nome: scheda.nome || '',
      cognome: scheda.cognome || '',
      email: scheda.email || '',
      telefono: scheda.telefono || '',
      indirizzo: scheda.indirizzo || '',
      citta: scheda.citta || '',
      cap: scheda.cap || '',
      provincia: scheda.provincia || '',
      partita_iva: scheda.partita_iva || '',
      codice_fiscale: scheda.codice_fiscale || '',
      note: scheda.note || '',
    })
    setFormError('')
    setShowEditModal(true)
  }

  const handleEditClose = () => {
    setShowEditModal(false)
    setFormError('')
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'tipo' && value === 'azienda' ? { cognome: '' } : {}),
    }))
  }

  const handleEditSubmit = async (e) => {
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
      await clientiAPI.update(id, form)
      handleEditClose()
      loadData()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente? L\'operazione non puo essere annullata.')) return
    try {
      await clientiAPI.delete(id)
      navigate('/clienti')
    } catch {
      alert('Errore durante l\'eliminazione del cliente')
    }
  }

  if (loading) {
    return <div className="loading-state">Caricamento...</div>
  }

  if (error || !scheda) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', fontSize: '1.1rem', marginBottom: '16px' }}>{error || 'Dati non disponibili'}</p>
        <button onClick={() => navigate('/clienti')} className="btn-primary">
          <ArrowLeftIcon /> Torna ai Clienti
        </button>
      </div>
    )
  }

  const nomeCompleto = scheda.cognome ? `${scheda.nome} ${scheda.cognome}` : scheda.nome
  const ordini = scheda.ordini || []
  const fatture = scheda.fatture || []

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/clienti')} className="btn-back">
          <ArrowLeftIcon /> Torna ai Clienti
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div className="page-icon">
            <UserIcon />
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>{nomeCompleto}</h1>
        </div>
        <span className="badge" style={{
          background: scheda.tipo === 'azienda' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          color: scheda.tipo === 'azienda' ? '#8b5cf6' : 'var(--primary)',
        }}>
          {scheda.tipo === 'azienda' ? <><BuildingIcon /> Azienda</> : <><UserIcon /> Privato</>}
        </span>
        <button onClick={handleEditOpen} className="btn-secondary">
          <EditIcon /> Modifica
        </button>
        <button onClick={handleDelete} className="btn-danger">
          <TrashIcon /> Elimina
        </button>
      </div>

      {/* Dati anagrafici + Statistiche */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Dati anagrafici */}
        <div className="card">
          <h3 className="section-title"><ClipboardIcon /> Dati Anagrafici</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Email', scheda.email],
                ['Telefono', scheda.telefono],
                ['Indirizzo', scheda.indirizzo],
                ['Citta', scheda.citta],
                ['CAP', scheda.cap],
                ['Provincia', scheda.provincia],
                ['Partita IVA', scheda.partita_iva],
                ['Codice Fiscale', scheda.codice_fiscale],
              ].map(([label, value]) => value ? (
                <tr key={label}>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)', width: '140px', fontWeight: 500 }}>{label}:</td>
                  <td style={{ padding: '6px 0', color: 'var(--text-primary)' }}>{value}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
          {scheda.note && (
            <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <strong>Note:</strong> {scheda.note}
            </div>
          )}
        </div>

        {/* Statistiche */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="card stat-card-blue">
            <div className="stat-icon"><FileTextIcon /></div>
            <div className="stat-content">
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{scheda.num_fatture || 0}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fatture</span>
            </div>
          </div>
          <div className="card stat-card-green">
            <div className="stat-icon"><ShoppingCartIcon /></div>
            <div className="stat-content">
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(scheda.totale_speso || 0)}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Totale Speso</span>
            </div>
          </div>
          <div className="card stat-card-amber">
            <div className="stat-icon"><ShoppingCartIcon /></div>
            <div className="stat-content">
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{scheda.num_ordini || 0}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ordini</span>
            </div>
          </div>
          <div className="card stat-card-purple">
            <div className="stat-icon"><ShoppingCartIcon /></div>
            <div className="stat-content">
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{scheda.num_ordini_completati || 0}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Completati</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storico ordini */}
      <div className="card" style={{ padding: 0, marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingCartIcon />
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Storico Ordini</h3>
        </div>
        {ordini.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Nessun ordine registrato</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N. Ordine</th>
                  <th>Data</th>
                  <th>Stato</th>
                  <th>Totale</th>
                </tr>
              </thead>
              <tbody>
                {ordini.map((o) => (
                  <tr key={o.id}>
                    <td><code style={{ color: 'var(--primary)' }}>{o.numero_ordine}</code></td>
                    <td>{formatDate(o.data_ordine)}</td>
                    <td>
                      <span className="badge" style={{
                        background: STATO_COLORS[o.stato]?.bg || 'var(--bg-tertiary)',
                        color: STATO_COLORS[o.stato]?.color || 'var(--text-secondary)',
                      }}>
                        {o.stato}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(o.totale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Storico fatture */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextIcon />
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Storico Fatture</h3>
        </div>
        {fatture.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Nessuna fattura registrata</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N. Fattura</th>
                  <th>Data</th>
                  <th>Importo</th>
                  <th>Pagata</th>
                </tr>
              </thead>
              <tbody>
                {fatture.map((f) => (
                  <tr key={f.id}>
                    <td><code style={{ color: 'var(--primary)' }}>{f.numero_fattura}</code></td>
                    <td>{formatDate(f.data_fattura)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(f.importo)}</td>
                    <td>
                      <span className="badge" style={{
                        background: f.pagata ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: f.pagata ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {f.pagata ? 'Si' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EditIcon /> Modifica Cliente
              </h2>
              <button onClick={handleEditClose} className="btn-icon btn-icon-gray">X</button>
            </div>

            {formError && <div className="error-banner" style={{ marginBottom: '16px' }}>{formError}</div>}

            <form onSubmit={handleEditSubmit}>
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleFormChange} className="form-input">
                    <option value="privato">Privato</option>
                    <option value="azienda">Azienda</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">{form.tipo === 'azienda' ? 'Ragione Sociale *' : 'Nome *'}</label>
                  <input name="nome" value={form.nome} onChange={handleFormChange} required className="form-input" placeholder={form.tipo === 'azienda' ? 'Ragione sociale' : 'Nome'} />
                </div>

                {form.tipo === 'privato' && (
                  <div>
                    <label className="form-label">Cognome</label>
                    <input name="cognome" value={form.cognome} onChange={handleFormChange} className="form-input" placeholder="Cognome" />
                  </div>
                )}

                <div>
                  <label className="form-label">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} className="form-input" placeholder="email@esempio.it" />
                </div>

                <div>
                  <label className="form-label">Telefono</label>
                  <input name="telefono" value={form.telefono} onChange={handleFormChange} className="form-input" placeholder="+39 000 0000000" />
                </div>

                <div className="form-full">
                  <label className="form-label">Indirizzo</label>
                  <input name="indirizzo" value={form.indirizzo} onChange={handleFormChange} className="form-input" placeholder="Via Roma, 1" />
                </div>

                <div>
                  <label className="form-label">Citta</label>
                  <input name="citta" value={form.citta} onChange={handleFormChange} className="form-input" placeholder="Milano" />
                </div>

                <div>
                  <label className="form-label">CAP</label>
                  <input name="cap" value={form.cap} onChange={handleFormChange} className="form-input" placeholder="20100" maxLength={5} />
                </div>

                <div>
                  <label className="form-label">Provincia</label>
                  <input name="provincia" value={form.provincia} onChange={handleFormChange} className="form-input" placeholder="MI" maxLength={2} />
                </div>

                <div>
                  <label className="form-label">Partita IVA{form.tipo === 'azienda' ? ' *' : ''}</label>
                  <input name="partita_iva" value={form.partita_iva} onChange={handleFormChange} required={form.tipo === 'azienda'} className="form-input" placeholder="IT12345678901" />
                </div>

                <div>
                  <label className="form-label">Codice Fiscale</label>
                  <input name="codice_fiscale" value={form.codice_fiscale} onChange={handleFormChange} className="form-input" placeholder="RSSMRA80A01H501U" />
                </div>

                <div className="form-full">
                  <label className="form-label">Note</label>
                  <textarea name="note" value={form.note} onChange={handleFormChange} className="form-input form-textarea" placeholder="Note aggiuntive..." />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleEditClose} className="btn-secondary">Annulla</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Salvataggio...' : 'Aggiorna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
