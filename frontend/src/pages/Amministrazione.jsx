import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { amministrazioneAPI, adminAPI } from '../api/client'
import '../styles/shared.css'

const ROLES = ['admin', 'manager', 'operatore', 'magazziniere', 'guest']

const ROLE_LABELS = {
  admin: { label: 'Admin', color: '#8b5cf6' },
  manager: { label: 'Manager', color: 'var(--primary)' },
  operatore: { label: 'Operatore', color: 'var(--success)' },
  magazziniere: { label: 'Magazziniere', color: 'var(--warning)' },
  guest: { label: 'Guest', color: 'var(--text-muted)' },
}

function getRoleBadge(ruolo) {
  const r = ROLE_LABELS[ruolo] || { label: ruolo, color: 'var(--text-muted)' }
  return (
    <span className="badge" style={{ background: `${r.color}20`, color: r.color }}>
      {r.label}
    </span>
  )
}

export default function Amministrazione() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('utenti')
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUtente, setEditingUtente] = useState(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', is_admin: false, is_active: true, ruolo: 'operatore' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [roleEdits, setRoleEdits] = useState({})
  const [roleSuccess, setRoleSuccess] = useState({})

  const [datiAzienda, setDatiAzienda] = useState({
    ragione_sociale: '', partita_iva: '', codice_fiscale: '', indirizzo: '', citta: '', cap: '',
    provincia: '', nazione: 'Italia', telefono: '', email: '', pec: '', sito_web: '', iban: '', codice_sdi: '',
  })
  const [datiExists, setDatiExists] = useState(false)
  const [datiLoading, setDatiLoading] = useState(false)
  const [datiError, setDatiError] = useState('')
  const [datiSuccess, setDatiSuccess] = useState('')
  const [datiSubmitting, setDatiSubmitting] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/dashboard')
      return
    }
    fetchUtenti()
    fetchDatiAzienda()
  }, [user, navigate])

  const fetchUtenti = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminAPI.getAllUsers()
      setUtenti(res.data)
      const edits = {}
      res.data.forEach(u => { edits[u.id] = u.ruolo || 'operatore' })
      setRoleEdits(edits)
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingUtente(null)
    setForm({ username: '', email: '', password: '', is_admin: false, is_active: true, ruolo: 'operatore' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (utente) => {
    setEditingUtente(utente)
    setForm({ username: utente.username, email: utente.email, password: '', is_admin: utente.is_admin, is_active: utente.is_active, ruolo: utente.ruolo || 'operatore' })
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
        payload.ruolo = form.ruolo
        await amministrazioneAPI.updateUtente(editingUtente.id, payload)
      } else {
        await amministrazioneAPI.createUtente({
          username: form.username,
          email: form.email,
          password: form.password,
          is_admin: form.is_admin,
          ruolo: form.ruolo,
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
    if (!window.confirm(`Eliminare l'utente "${utente.username}"? Questa azione e irreversibile.`)) return
    try {
      await adminAPI.deleteUser(utente.id)
      fetchUtenti()
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'eliminazione")
    }
  }

  const handleSaveRole = async (userId) => {
    const nuovoRuolo = roleEdits[userId]
    try {
      await adminAPI.updateUserRole(userId, nuovoRuolo)
      setRoleSuccess(prev => ({ ...prev, [userId]: true }))
      setTimeout(() => setRoleSuccess(prev => ({ ...prev, [userId]: false })), 2000)
      fetchUtenti()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore aggiornamento ruolo')
    }
  }

  const totale = utenti.length
  const admins = utenti.filter(u => u.is_admin).length
  const disattivati = utenti.filter(u => !u.is_active).length
  const soloAdmin = admins === 1 && utenti.find(u => u.is_admin)?.id === user?.id

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT')
  }

  const fetchDatiAzienda = async () => {
    setDatiLoading(true)
    try {
      const res = await adminAPI.getDatiAzienda()
      setDatiAzienda(res.data)
      setDatiExists(true)
    } catch (err) {
      if (err.response?.status === 404) {
        setDatiExists(false)
      } else {
        setDatiError(err.response?.data?.detail || 'Errore nel caricamento dei dati azienda')
      }
    } finally {
      setDatiLoading(false)
    }
  }

  const handleDatiChange = (field) => (e) => {
    setDatiAzienda(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleDatiSubmit = async (e) => {
    e.preventDefault()
    setDatiError('')
    setDatiSuccess('')
    setDatiSubmitting(true)
    try {
      if (datiExists) {
        await adminAPI.updateDatiAzienda(datiAzienda)
      } else {
        await adminAPI.createDatiAzienda(datiAzienda)
        setDatiExists(true)
      }
      setDatiSuccess('Dati azienda salvati con successo!')
      setTimeout(() => setDatiSuccess(''), 4000)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setDatiError(detail.map(d => d.msg).join(', '))
      } else {
        setDatiError(detail || 'Errore durante il salvataggio')
      }
    } finally {
      setDatiSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="page-title-section">
          <div className="page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Amministrazione</h1>
            <p className="page-subtitle">Gestione utenti e dati azienda</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        {[
          { key: 'utenti', label: 'Gestione Utenti', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
          { key: 'dati-azienda', label: 'Dati Azienda', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" /></svg> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontSize: '0.9375rem',
              fontWeight: activeTab === tab.key ? '600' : '500',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Gestione Utenti */}
      {activeTab === 'utenti' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={openCreate} className="btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nuovo Utente
            </button>
          </div>

          {soloAdmin && (
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--warning)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
              </svg>
              Sei l'unico amministratore. Assicurati di avere sempre almeno un account admin attivo.
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="card stat-card-blue">
              <div className="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{totale}</span>
                <span className="stat-label">Totale Utenti</span>
              </div>
            </div>
            <div className="card stat-card-purple">
              <div className="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value" style={{ color: '#8b5cf6' }}>{admins}</span>
                <span className="stat-label">Amministratori</span>
              </div>
            </div>
            <div className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
              <div className="stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value" style={{ color: 'var(--danger)' }}>{disattivati}</span>
                <span className="stat-label">Disattivati</span>
              </div>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="card">
            {loading ? (
              <div className="loading-state">Caricamento...</div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Ruolo</th>
                      <th>Stato</th>
                      <th>Creato il</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utenti.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Nessun utente trovato</td>
                      </tr>
                    ) : (
                      utenti.map((u) => (
                        <tr key={u.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{u.id}</td>
                          <td className="text-bold">{u.username}</td>
                          <td>{u.email}</td>
                          <td style={{ minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select
                                value={roleEdits[u.id] || u.ruolo || 'operatore'}
                                onChange={e => setRoleEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                                disabled={u.id === user?.id}
                                className="form-input"
                                style={{ padding: '4px 8px', height: '32px', fontSize: '0.8125rem', opacity: u.id === user?.id ? 0.6 : 1 }}
                              >
                                {ROLES.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleSaveRole(u.id)}
                                  className={roleSuccess[u.id] ? 'btn-success' : 'btn-primary'}
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                                >
                                  {roleSuccess[u.id] ? 'OK' : 'Salva'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            {u.is_active ? (
                              <span className="badge badge-success">Attivo</span>
                            ) : (
                              <span className="badge badge-danger">Disattivato</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                          <td>
                            <div className="action-buttons">
                              <button onClick={() => openEdit(u)} className="btn-icon btn-icon-blue" title="Modifica">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(u)}
                                disabled={u.id === user?.id}
                                className={u.id === user?.id ? 'btn-icon btn-icon-disabled' : 'btn-icon btn-icon-red'}
                                title="Elimina"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Dati Azienda */}
      {activeTab === 'dati-azienda' && (
        <div className="card" style={{ maxWidth: '800px' }}>
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
            </svg>
            Dati Azienda
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Questi dati verranno utilizzati per la compilazione delle fatture.
          </p>

          {datiLoading ? (
            <div className="loading-state">Caricamento...</div>
          ) : (
            <form onSubmit={handleDatiSubmit}>
              {datiError && <div className="error-banner">{datiError}</div>}
              {datiSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', color: 'var(--success)', fontSize: '0.875rem' }}>
                  {datiSuccess}
                </div>
              )}

              <h3 className="section-title-sm" style={{ marginTop: '20px' }}>Dati Generali</h3>
              <div className="form-grid">
                <div>
                  <label className="form-label">Ragione Sociale *</label>
                  <input type="text" value={datiAzienda.ragione_sociale} onChange={handleDatiChange('ragione_sociale')} required className="form-input" placeholder="Es. Rossi Srl" />
                </div>
                <div>
                  <label className="form-label">Partita IVA *</label>
                  <input type="text" value={datiAzienda.partita_iva} onChange={handleDatiChange('partita_iva')} required className="form-input" placeholder="IT12345678901" />
                </div>
                <div>
                  <label className="form-label">Codice Fiscale</label>
                  <input type="text" value={datiAzienda.codice_fiscale} onChange={handleDatiChange('codice_fiscale')} className="form-input" placeholder="RSSMRC80A01F205X" />
                </div>
              </div>

              <h3 className="section-title-sm" style={{ marginTop: '24px' }}>Indirizzo</h3>
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Indirizzo</label>
                  <input type="text" value={datiAzienda.indirizzo} onChange={handleDatiChange('indirizzo')} className="form-input" placeholder="Via Roma 1" />
                </div>
                <div>
                  <label className="form-label">Citta</label>
                  <input type="text" value={datiAzienda.citta} onChange={handleDatiChange('citta')} className="form-input" placeholder="Milano" />
                </div>
                <div>
                  <label className="form-label">CAP</label>
                  <input type="text" value={datiAzienda.cap} onChange={handleDatiChange('cap')} className="form-input" placeholder="20100" />
                </div>
                <div>
                  <label className="form-label">Provincia</label>
                  <input type="text" value={datiAzienda.provincia} onChange={handleDatiChange('provincia')} className="form-input" placeholder="MI" />
                </div>
                <div>
                  <label className="form-label">Nazione</label>
                  <input type="text" value={datiAzienda.nazione} onChange={handleDatiChange('nazione')} className="form-input" placeholder="Italia" />
                </div>
              </div>

              <h3 className="section-title-sm" style={{ marginTop: '24px' }}>Contatti</h3>
              <div className="form-grid">
                <div>
                  <label className="form-label">Telefono</label>
                  <input type="text" value={datiAzienda.telefono} onChange={handleDatiChange('telefono')} className="form-input" placeholder="+39 02 12345678" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={datiAzienda.email} onChange={handleDatiChange('email')} className="form-input" placeholder="info@azienda.it" />
                </div>
                <div>
                  <label className="form-label">PEC</label>
                  <input type="email" value={datiAzienda.pec} onChange={handleDatiChange('pec')} className="form-input" placeholder="azienda@pec.it" />
                </div>
                <div>
                  <label className="form-label">Sito Web</label>
                  <input type="text" value={datiAzienda.sito_web} onChange={handleDatiChange('sito_web')} className="form-input" placeholder="www.azienda.it" />
                </div>
              </div>

              <h3 className="section-title-sm" style={{ marginTop: '24px' }}>Dati Bancari e Fatturazione</h3>
              <div className="form-grid">
                <div>
                  <label className="form-label">IBAN</label>
                  <input type="text" value={datiAzienda.iban} onChange={handleDatiChange('iban')} className="form-input" placeholder="IT60X0542811101000000123456" />
                </div>
                <div>
                  <label className="form-label">Codice SDI</label>
                  <input type="text" value={datiAzienda.codice_sdi} onChange={handleDatiChange('codice_sdi')} className="form-input" placeholder="XXXXXXX" />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="submit" disabled={datiSubmitting} className="btn-primary">
                  {datiSubmitting ? 'Salvataggio...' : 'Salva Dati Azienda'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingUtente ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <button onClick={closeModal} className="modal-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && <div className="error-banner">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div>
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Password {editingUtente ? '(lascia vuoto per non modificare)' : '*'}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUtente}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Ruolo</label>
                  <select
                    value={form.ruolo}
                    onChange={e => setForm(prev => ({ ...prev, ruolo: e.target.value }))}
                    className="form-input"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={form.is_admin}
                      onChange={e => setForm(prev => ({ ...prev, is_admin: e.target.checked }))}
                    />
                    Amministratore
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Attivo
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">Annulla</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Salvataggio...' : (editingUtente ? 'Salva Modifiche' : 'Crea Utente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
