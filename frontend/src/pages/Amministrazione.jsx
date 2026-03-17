import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { amministrazioneAPI, adminAPI } from '../api/client'

const ROLES = ['admin', 'manager', 'operatore', 'magazziniere', 'guest']

const ROLE_LABELS = {
  admin: { label: '👑 Admin', bg: '#ede7f6', color: '#6a1b9a' },
  manager: { label: '🔷 Manager', bg: '#e3f2fd', color: '#1565c0' },
  operatore: { label: '🟢 Operatore', bg: '#e8f5e9', color: '#2e7d32' },
  magazziniere: { label: '📦 Magazziniere', bg: '#fff3e0', color: '#e65100' },
  guest: { label: '👁️ Guest', bg: '#f5f5f5', color: '#616161' },
}

function getRoleBadge(ruolo) {
  const r = ROLE_LABELS[ruolo] || { label: ruolo, bg: '#f5f5f5', color: '#333' }
  return (
    <span style={{ backgroundColor: r.bg, color: r.color, borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {r.label}
    </span>
  )
}

export default function Amministrazione() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('utenti')

  // ── Gestione Utenti ────────────────────────────────────────────────────────
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

  // ── Dati Azienda ───────────────────────────────────────────────────────────
  const [datiAzienda, setDatiAzienda] = useState({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    nazione: 'Italia',
    telefono: '',
    email: '',
    pec: '',
    sito_web: '',
    iban: '',
    codice_sdi: '',
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

  // ── User Management ─────────────────────────────────────────────────────────

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
    if (!window.confirm(`Eliminare l'utente "${utente.username}"? Questa azione è irreversibile.`)) return
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
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('it-IT')
  }

  // ── Dati Azienda ─────────────────────────────────────────────────────────────

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

  const inputStyle = {
    width: '100%',
    height: '36px',
    padding: '0 12px',
    border: '1.5px solid #e0e4ef',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
  }

  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#333' }

  const sectionTitleStyle = {
    fontSize: 15,
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: 12,
    marginTop: 20,
    paddingBottom: 6,
    borderBottom: '2px solid #e8eaf6',
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#1a237e', fontSize: 'clamp(20px, 4vw, 28px)' }}>⚙️ Amministrazione</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '2px solid #e8eaf6' }}>
        {[
          { key: 'utenti', label: '👥 Gestione Utenti' },
          { key: 'dati-azienda', label: '🏢 Dati Azienda' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #1a237e' : '3px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#1a237e' : '#555',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Gestione Utenti ─────────────────────────────────────────────── */}
      {activeTab === 'utenti' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={openCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: '#1a237e',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                height: '36px',
                padding: '0 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              + Nuovo Utente
            </button>
          </div>

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
            {[
              { icon: '👥', value: totale, label: 'Totale Utenti', color: '#1a237e' },
              { icon: '👑', value: admins, label: 'Amministratori', color: '#6a1b9a' },
              { icon: '🔒', value: disattivati, label: 'Disattivati', color: '#c62828' },
            ].map(stat => (
              <div key={stat.label} style={{ backgroundColor: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: 28 }}>{stat.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ color: '#555', fontSize: 13 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#c62828', fontSize: 14 }}>
              {error}
            </div>
          )}

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
                          <td style={{ padding: '10px 16px', minWidth: 220 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <select
                                value={roleEdits[u.id] || u.ruolo || 'operatore'}
                                onChange={e => setRoleEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                                disabled={u.id === user?.id}
                                style={{
                                  padding: '4px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: 6,
                                  fontSize: 13,
                                  cursor: u.id === user?.id ? 'not-allowed' : 'pointer',
                                  opacity: u.id === user?.id ? 0.6 : 1,
                                }}
                              >
                                {ROLES.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleSaveRole(u.id)}
                                  style={{
                                    padding: '4px 10px',
                                    border: 'none',
                                    borderRadius: 6,
                                    backgroundColor: roleSuccess[u.id] ? '#4caf50' : '#1a237e',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    transition: 'background 0.2s',
                                  }}
                                >
                                  {roleSuccess[u.id] ? '✅' : 'Salva'}
                                </button>
                              )}
                            </div>
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
        </div>
      )}

      {/* ── Tab: Dati Azienda ────────────────────────────────────────────────── */}
      {activeTab === 'dati-azienda' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 800 }}>
          <h2 style={{ margin: '0 0 8px', color: '#1a237e', fontSize: 20 }}>🏢 Dati Azienda</h2>
          <p style={{ color: '#777', fontSize: 13, marginBottom: 20 }}>
            Questi dati verranno utilizzati per la compilazione delle fatture.
          </p>

          {datiLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Caricamento...</div>
          ) : (
            <form onSubmit={handleDatiSubmit}>
              {datiError && (
                <div style={{ backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#c62828', fontSize: 14 }}>
                  {datiError}
                </div>
              )}
              {datiSuccess && (
                <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#2e7d32', fontSize: 14 }}>
                  ✅ {datiSuccess}
                </div>
              )}

              {/* Dati Generali */}
              <div style={sectionTitleStyle}>📋 Dati Generali</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Ragione Sociale *</label>
                  <input type="text" value={datiAzienda.ragione_sociale} onChange={handleDatiChange('ragione_sociale')} required style={inputStyle} placeholder="Es. Rossi Srl" />
                </div>
                <div>
                  <label style={labelStyle}>Partita IVA * (IT + 11 cifre)</label>
                  <input type="text" value={datiAzienda.partita_iva} onChange={handleDatiChange('partita_iva')} required style={inputStyle} placeholder="IT12345678901" />
                </div>
                <div>
                  <label style={labelStyle}>Codice Fiscale</label>
                  <input type="text" value={datiAzienda.codice_fiscale} onChange={handleDatiChange('codice_fiscale')} style={inputStyle} placeholder="RSSMRC80A01F205X" />
                </div>
              </div>

              {/* Indirizzo */}
              <div style={sectionTitleStyle}>📍 Indirizzo</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Indirizzo</label>
                  <input type="text" value={datiAzienda.indirizzo} onChange={handleDatiChange('indirizzo')} style={inputStyle} placeholder="Via Roma 123" />
                </div>
                <div>
                  <label style={labelStyle}>Città</label>
                  <input type="text" value={datiAzienda.citta} onChange={handleDatiChange('citta')} style={inputStyle} placeholder="Milano" />
                </div>
                <div>
                  <label style={labelStyle}>CAP</label>
                  <input type="text" value={datiAzienda.cap} onChange={handleDatiChange('cap')} style={inputStyle} placeholder="20100" />
                </div>
                <div>
                  <label style={labelStyle}>Provincia (2 lettere)</label>
                  <input type="text" value={datiAzienda.provincia} onChange={handleDatiChange('provincia')} style={inputStyle} placeholder="MI" maxLength={2} />
                </div>
                <div>
                  <label style={labelStyle}>Nazione</label>
                  <input type="text" value={datiAzienda.nazione} onChange={handleDatiChange('nazione')} style={inputStyle} placeholder="Italia" />
                </div>
              </div>

              {/* Contatti */}
              <div style={sectionTitleStyle}>📞 Contatti</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Telefono</label>
                  <input type="text" value={datiAzienda.telefono} onChange={handleDatiChange('telefono')} style={inputStyle} placeholder="+39 02 1234567" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={datiAzienda.email} onChange={handleDatiChange('email')} style={inputStyle} placeholder="info@azienda.it" />
                </div>
                <div>
                  <label style={labelStyle}>PEC</label>
                  <input type="email" value={datiAzienda.pec} onChange={handleDatiChange('pec')} style={inputStyle} placeholder="azienda@pec.it" />
                </div>
                <div>
                  <label style={labelStyle}>Sito Web</label>
                  <input type="text" value={datiAzienda.sito_web} onChange={handleDatiChange('sito_web')} style={inputStyle} placeholder="https://www.azienda.it" />
                </div>
              </div>

              {/* Fatturazione */}
              <div style={sectionTitleStyle}>🏦 Fatturazione</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={labelStyle}>IBAN</label>
                  <input type="text" value={datiAzienda.iban} onChange={handleDatiChange('iban')} style={inputStyle} placeholder="IT60X0542811101000000123456" />
                </div>
                <div>
                  <label style={labelStyle}>Codice SDI (7 caratteri)</label>
                  <input type="text" value={datiAzienda.codice_sdi} onChange={handleDatiChange('codice_sdi')} style={inputStyle} placeholder="ABCDE12" maxLength={7} />
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <button
                  type="submit"
                  disabled={datiSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '0 32px',
                    border: 'none',
                    borderRadius: 6,
                    backgroundColor: '#1a237e',
                    color: '#fff',
                    cursor: datiSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    opacity: datiSubmitting ? 0.7 : 1,
                  }}
                >
                  {datiSubmitting ? '⏳ Salvataggio...' : '💾 Salva Modifiche'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Modal Utente ──────────────────────────────────────────────────────── */}
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
                <label style={labelStyle}>Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  Password {editingUtente ? '' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editingUtente}
                  placeholder={editingUtente ? 'Lascia vuoto per non cambiare' : ''}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Ruolo</label>
                <select
                  value={form.ruolo}
                  onChange={e => setForm(f => ({ ...f, ruolo: e.target.value, is_admin: e.target.value === 'admin' }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
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
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', padding: '0 20px', border: '1.5px solid #e0e4ef', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '36px',
                    padding: '0 20px',
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
