import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientiAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

const primaryColor = '#1a237e'
const statCardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  flex: 1,
  minWidth: '140px',
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
      // Clear cognome when switching to azienda (companies don't have a surname)
      if (name === 'tipo' && value === 'azienda') {
        updated.cognome = ''
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setFormError('Il nome è obbligatorio')
      return
    }
    if (form.tipo === 'azienda' && !form.partita_iva.trim()) {
      setFormError('La partita IVA è obbligatoria per le aziende')
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

  // Stats
  const totaleClienti = clienti.length
  const numAziende = clienti.filter((c) => c.tipo === 'azienda').length
  const numPrivati = clienti.filter((c) => c.tipo === 'privato').length
  const fatturatoTotale = clienti.reduce((sum, c) => sum + (c.totale_ordini || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: primaryColor, margin: 0, fontSize: '1.8rem' }}>👥 Clienti</h1>
        <button
          onClick={openNewModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            height: '36px',
            padding: '0 20px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          ➕ Nuovo Cliente
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: '👥 Totale Clienti', value: totaleClienti, color: '#e3f2fd', textColor: '#1565c0' },
          { label: '🏢 Aziende', value: numAziende, color: '#ede7f6', textColor: '#6a1b9a' },
          { label: '👤 Privati', value: numPrivati, color: '#e8f5e9', textColor: '#2e7d32' },
          { label: '💰 Totale Ordini', value: formatCurrency(fatturatoTotale), color: '#fff8e1', textColor: '#e65100' },
        ].map(({ label, value, color, textColor }) => (
          <div key={label} style={{ ...statCardStyle, backgroundColor: color }}>
            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: textColor }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '6px' }}>Cerca per nome, email, P.IVA</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca cliente..."
              style={{ width: '100%', height: '36px', padding: '0 12px', border: '1.5px solid #e0e4ef', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <button
            onClick={handleSearch}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', height: '36px', padding: '0 20px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
          >
            🔍 Cerca
          </button>
          <button
            onClick={handleReset}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: '#fff', color: '#555', border: '1.5px solid #e0e4ef', borderRadius: '6px', height: '36px', padding: '0 20px', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Table / Card list */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '16px 20px', backgroundColor: '#ffebee', color: '#c62828' }}>{error}</div>
        )}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Caricamento...</div>
        ) : clienti.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>
            Nessun cliente trovato.{' '}
            <button onClick={openNewModal} style={{ background: 'none', border: 'none', color: primaryColor, cursor: 'pointer', fontWeight: 'bold' }}>
              Aggiungine uno!
            </button>
          </div>
        ) : isMobile ? (
          <div style={{ padding: '8px' }}>
            {clienti.map((c) => {
              const nomeCompleto = c.cognome ? `${c.nome} ${c.cognome}` : c.nome
              return (
                <div key={c.id} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid #e8eaf6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: primaryColor, fontSize: '1rem' }}>
                      {c.tipo === 'azienda' ? '🏢' : '👤'} {nomeCompleto}
                    </div>
                    <span style={{
                      backgroundColor: c.tipo === 'azienda' ? '#ede7f6' : '#e3f2fd',
                      color: c.tipo === 'azienda' ? '#6a1b9a' : '#1565c0',
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                    }}>
                      {c.tipo === 'azienda' ? 'Azienda' : 'Privato'}
                    </span>
                  </div>
                  {c.email && <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '2px' }}>✉️ {c.email}</div>}
                  {c.telefono && <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '2px' }}>📞 {c.telefono}</div>}
                  {c.citta && <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>📍 {c.citta}{c.provincia ? ` (${c.provincia})` : ''}</div>}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={() => openEditModal(c)} style={btnSmall('#1565c0')}>✏️</button>
                    <button onClick={() => handleDelete(c.id)} style={btnSmall('#c62828')}>🗑️</button>
                    <button
                      onClick={() => navigate(`/clienti/${c.id}`)}
                      style={{ ...btnSmall('#455a64'), marginLeft: 'auto' }}
                    >
                      Dettagli →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: '#fff' }}>
                  {['ID', 'Nome', 'Cognome', 'Tipo', 'Email', 'Telefono', 'Città', 'P.IVA', 'Azioni'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#fff' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clienti.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{ padding: '12px 16px', color: '#999', fontSize: '0.85rem' }}>{c.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#333' }}>{c.nome}</td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: '0.9rem' }}>{c.cognome || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        backgroundColor: c.tipo === 'azienda' ? '#ede7f6' : '#e3f2fd',
                        color: c.tipo === 'azienda' ? '#6a1b9a' : '#1565c0',
                        borderRadius: '12px',
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {c.tipo === 'azienda' ? '🏢 Azienda' : '👤 Privato'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: '0.9rem' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: '0.9rem' }}>{c.telefono || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: '0.9rem' }}>{c.citta || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#555', fontSize: '0.9rem' }}>{c.partita_iva || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openEditModal(c)} title="Modifica" style={btnSmall('#1565c0')}>✏️</button>
                        <button onClick={() => handleDelete(c.id)} title="Elimina" style={btnSmall('#c62828')}>🗑️</button>
                        <button onClick={() => navigate(`/clienti/${c.id}`)} title="Dettagli" style={btnSmall('#455a64')}>🔍</button>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '8px' : '0' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: isMobile ? '20px 16px' : '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: primaryColor, margin: 0 }}>
                {editingId ? '✏️ Modifica Cliente' : '➕ Nuovo Cliente'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                {/* Tipo */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleFormChange} style={inputStyle}>
                    <option value="privato">👤 Privato</option>
                    <option value="azienda">🏢 Azienda</option>
                  </select>
                </div>

                {/* Nome */}
                <div>
                  <label style={labelStyle}>{form.tipo === 'azienda' ? 'Ragione Sociale *' : 'Nome *'}</label>
                  <input name="nome" value={form.nome} onChange={handleFormChange} required style={inputStyle} placeholder={form.tipo === 'azienda' ? 'Ragione sociale' : 'Nome'} />
                </div>

                {/* Cognome (solo privati) */}
                {form.tipo === 'privato' && (
                  <div>
                    <label style={labelStyle}>Cognome</label>
                    <input name="cognome" value={form.cognome} onChange={handleFormChange} style={inputStyle} placeholder="Cognome" />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} style={inputStyle} placeholder="email@esempio.it" />
                </div>

                {/* Telefono */}
                <div>
                  <label style={labelStyle}>Telefono</label>
                  <input name="telefono" value={form.telefono} onChange={handleFormChange} style={inputStyle} placeholder="+39 000 0000000" />
                </div>

                {/* Indirizzo */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Indirizzo</label>
                  <input name="indirizzo" value={form.indirizzo} onChange={handleFormChange} style={inputStyle} placeholder="Via Roma, 1" />
                </div>

                {/* Città */}
                <div>
                  <label style={labelStyle}>Città</label>
                  <input name="citta" value={form.citta} onChange={handleFormChange} style={inputStyle} placeholder="Milano" />
                </div>

                {/* CAP */}
                <div>
                  <label style={labelStyle}>CAP</label>
                  <input name="cap" value={form.cap} onChange={handleFormChange} style={inputStyle} placeholder="20100" maxLength={5} />
                </div>

                {/* Provincia */}
                <div>
                  <label style={labelStyle}>Provincia</label>
                  <input name="provincia" value={form.provincia} onChange={handleFormChange} style={inputStyle} placeholder="MI" maxLength={2} />
                </div>

                {/* Partita IVA */}
                <div>
                  <label style={labelStyle}>Partita IVA{form.tipo === 'azienda' ? ' *' : ''}</label>
                  <input name="partita_iva" value={form.partita_iva} onChange={handleFormChange} style={inputStyle} placeholder="IT12345678901" />
                </div>

                {/* Codice Fiscale */}
                <div>
                  <label style={labelStyle}>Codice Fiscale</label>
                  <input name="codice_fiscale" value={form.codice_fiscale} onChange={handleFormChange} style={inputStyle} placeholder="RSSMRA80A01H501U" />
                </div>

                {/* Note */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Note</label>
                  <textarea name="note" value={form.note} onChange={handleFormChange} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Note aggiuntive..." />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={closeModal} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', color: '#555', border: '1.5px solid #e0e4ef', borderRadius: '6px', height: '36px', padding: '0 24px', cursor: 'pointer', fontSize: '14px' }}>
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: editingId ? '#2e7d32' : primaryColor, color: '#fff', border: 'none', borderRadius: '6px', height: '36px', padding: '0 24px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Salvataggio...' : editingId ? 'Salva Modifiche' : 'Crea Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const btnSmall = (bg) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  height: '28px',
  padding: '0 10px',
  cursor: 'pointer',
  fontSize: '13px',
})

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#555',
  marginBottom: '6px',
  fontWeight: 500,
}

const inputStyle = {
  width: '100%',
  height: '36px',
  padding: '0 12px',
  border: '1.5px solid #e0e4ef',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
}
