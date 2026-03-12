import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientiAPI } from '../api/client'

const primaryColor = '#1a237e'

const STATO_COLORS = {
  bozza: { bg: '#f5f5f5', color: '#757575' },
  confermato: { bg: '#e3f2fd', color: '#1565c0' },
  spedito: { bg: '#fff3e0', color: '#e65100' },
  completato: { bg: '#e8f5e9', color: '#2e7d32' },
  annullato: { bg: '#ffebee', color: '#c62828' },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

function formatCurrency(amount) {
  return Number(amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#555',
  marginBottom: '6px',
  fontWeight: 500,
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none',
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
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente? L\'operazione non può essere annullata.')) return
    try {
      await clientiAPI.delete(id)
      navigate('/clienti')
    } catch {
      alert('Errore durante l\'eliminazione del cliente')
    }
  }

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>Caricamento...</div>
  }

  if (error || !scheda) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#c62828', fontSize: '1.1rem' }}>{error || 'Dati non disponibili'}</p>
        <button
          onClick={() => navigate('/clienti')}
          style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Torna ai Clienti
        </button>
      </div>
    )
  }

  const nomeCompleto = scheda.cognome ? `${scheda.nome} ${scheda.cognome}` : scheda.nome
  const ordini = scheda.ordini || []
  const fatture = scheda.fatture || []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/clienti')}
          style={{ backgroundColor: '#fff', border: `1px solid ${primaryColor}`, color: primaryColor, borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← Torna ai Clienti
        </button>
        <h1 style={{ color: primaryColor, margin: 0, flex: 1, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}>
          👤 {nomeCompleto}
        </h1>
        <span style={{
          backgroundColor: scheda.tipo === 'azienda' ? '#ede7f6' : '#e3f2fd',
          color: scheda.tipo === 'azienda' ? '#6a1b9a' : '#1565c0',
          borderRadius: '12px',
          padding: '4px 12px',
          fontSize: '0.82rem',
          fontWeight: 'bold',
        }}>
          {scheda.tipo === 'azienda' ? '🏢 Azienda' : '👤 Privato'}
        </span>
        <button
          onClick={handleEditOpen}
          style={{ backgroundColor: '#fff8e1', color: '#e65100', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✏️ Modifica
        </button>
        <button
          onClick={handleDelete}
          style={{ backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          🗑️ Elimina
        </button>
      </div>

      {/* Dati anagrafici + Statistiche */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Dati anagrafici */}
        <div style={cardStyle}>
          <h3 style={{ color: primaryColor, marginTop: 0 }}>📋 Dati Anagrafici</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Email', scheda.email],
                ['Telefono', scheda.telefono],
                ['Indirizzo', scheda.indirizzo],
                ['Città', scheda.citta],
                ['CAP', scheda.cap],
                ['Provincia', scheda.provincia],
                ['Partita IVA', scheda.partita_iva],
                ['Codice Fiscale', scheda.codice_fiscale],
              ].map(([label, value]) => value ? (
                <tr key={label}>
                  <td style={{ padding: '6px 0', color: '#666', width: '140px', fontWeight: 500 }}>{label}:</td>
                  <td style={{ padding: '6px 0', color: '#333' }}>{value}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
          {scheda.note && (
            <div style={{ marginTop: '12px', color: '#555', fontSize: '0.9rem' }}>
              <strong>Note:</strong> {scheda.note}
            </div>
          )}
        </div>

        {/* Statistiche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: '📋 Fatture', value: scheda.num_fatture || 0, color: '#e3f2fd', textColor: '#1565c0' },
            { label: '💰 Totale Speso', value: formatCurrency(scheda.totale_speso || 0), color: '#e8f5e9', textColor: '#2e7d32' },
            { label: '🛒 Ordini', value: scheda.num_ordini || 0, color: '#fff8e1', textColor: '#e65100' },
            { label: '✅ Completati', value: scheda.num_ordini_completati || 0, color: '#f3e5f5', textColor: '#6a1b9a' },
          ].map(({ label, value, color, textColor }) => (
            <div key={label} style={{ backgroundColor: color, borderRadius: '8px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: textColor }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Storico ordini */}
      <div style={{ ...cardStyle, padding: 0, marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ color: primaryColor, margin: 0 }}>🛒 Storico Ordini</h3>
        </div>
        {ordini.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Nessun ordine registrato</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  {['N° Ordine', 'Data', 'Stato', 'Totale'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordini.map((o) => (
                  <tr key={o.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}><code>{o.numero_ordine}</code></td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{formatDate(o.data_ordine)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        backgroundColor: STATO_COLORS[o.stato]?.bg || '#eee',
                        color: STATO_COLORS[o.stato]?.color || '#333',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {o.stato}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2e7d32' }}>{formatCurrency(o.totale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Storico fatture */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ color: primaryColor, margin: 0 }}>📄 Storico Fatture</h3>
        </div>
        {fatture.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Nessuna fattura registrata</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  {['N° Fattura', 'Data', 'Importo', 'Pagata'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fatture.map((f) => (
                  <tr key={f.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px 16px' }}><code>{f.numero_fattura}</code></td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{formatDate(f.data_fattura)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2e7d32' }}>{formatCurrency(f.importo)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        backgroundColor: f.pagata ? '#e8f5e9' : '#ffebee',
                        color: f.pagata ? '#2e7d32' : '#c62828',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}>
                        {f.pagata ? '✅ Sì' : '❌ No'}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: primaryColor, margin: 0 }}>✏️ Modifica Cliente</h2>
              <button onClick={handleEditClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleFormChange} style={inputStyle}>
                    <option value="privato">👤 Privato</option>
                    <option value="azienda">🏢 Azienda</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>{form.tipo === 'azienda' ? 'Ragione Sociale *' : 'Nome *'}</label>
                  <input name="nome" value={form.nome} onChange={handleFormChange} required style={inputStyle} placeholder={form.tipo === 'azienda' ? 'Ragione sociale' : 'Nome'} />
                </div>

                {form.tipo === 'privato' && (
                  <div>
                    <label style={labelStyle}>Cognome</label>
                    <input name="cognome" value={form.cognome} onChange={handleFormChange} style={inputStyle} placeholder="Cognome" />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} style={inputStyle} placeholder="email@esempio.it" />
                </div>

                <div>
                  <label style={labelStyle}>Telefono</label>
                  <input name="telefono" value={form.telefono} onChange={handleFormChange} style={inputStyle} placeholder="+39 000 0000000" />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Indirizzo</label>
                  <input name="indirizzo" value={form.indirizzo} onChange={handleFormChange} style={inputStyle} placeholder="Via Roma, 1" />
                </div>

                <div>
                  <label style={labelStyle}>Città</label>
                  <input name="citta" value={form.citta} onChange={handleFormChange} style={inputStyle} placeholder="Milano" />
                </div>

                <div>
                  <label style={labelStyle}>CAP</label>
                  <input name="cap" value={form.cap} onChange={handleFormChange} style={inputStyle} placeholder="20100" maxLength={5} />
                </div>

                <div>
                  <label style={labelStyle}>Provincia</label>
                  <input name="provincia" value={form.provincia} onChange={handleFormChange} style={inputStyle} placeholder="MI" maxLength={2} />
                </div>

                <div>
                  <label style={labelStyle}>Partita IVA{form.tipo === 'azienda' ? ' *' : ''}</label>
                  <input name="partita_iva" value={form.partita_iva} onChange={handleFormChange} required={form.tipo === 'azienda'} style={inputStyle} placeholder="IT12345678901" />
                </div>

                <div>
                  <label style={labelStyle}>Codice Fiscale</label>
                  <input name="codice_fiscale" value={form.codice_fiscale} onChange={handleFormChange} style={inputStyle} placeholder="RSSMRA80A01H501U" />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Note</label>
                  <textarea name="note" value={form.note} onChange={handleFormChange} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Note aggiuntive..." />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={handleEditClose} style={{ backgroundColor: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}>
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: submitting ? 0.7 : 1 }}
                >
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
