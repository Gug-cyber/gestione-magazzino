import { useState, useEffect, useCallback } from 'react'
import { clientiAPI } from '../api/client'

const primaryColor = '#1a237e'
const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  flex: 1,
  minWidth: '140px',
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
  const [clienti, setClienti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [storico, setStorico] = useState(null)
  const [storicoLoading, setStoricoLoading] = useState(false)

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
    setEditingCliente(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (cliente) => {
    setEditingCliente(cliente)
    setForm({
      tipo: cliente.tipo || 'privato',
      nome: cliente.nome || '',
      cognome: cliente.cognome || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      indirizzo: cliente.indirizzo || '',
      citta: cliente.citta || '',
      cap: cliente.cap || '',
      provincia: cliente.provincia || '',
      partita_iva: cliente.partita_iva || '',
      codice_fiscale: cliente.codice_fiscale || '',
      note: cliente.note || '',
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCliente(null)
    setFormError('')
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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
      const data = { ...form }
      if (editingCliente) {
        await clientiAPI.update(editingCliente.id, data)
      } else {
        await clientiAPI.create(data)
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
    } catch {
      alert('Errore durante l\'eliminazione del cliente')
    }
  }

  const handleVediStorico = async (cliente) => {
    setSelectedCliente(cliente)
    setStoricoLoading(true)
    try {
      const res = await clientiAPI.getStorico(cliente.id)
      setStorico(res.data)
    } catch {
      setStorico(null)
    } finally {
      setStoricoLoading(false)
    }
  }

  const handleTornaLista = () => {
    setSelectedCliente(null)
    setStorico(null)
  }

  // Stats
  const totaleClienti = clienti.length
  const numAziende = clienti.filter((c) => c.tipo === 'azienda').length
  const numPrivati = clienti.filter((c) => c.tipo === 'privato').length
  const fatturatoTotale = clienti.reduce((sum, c) => sum + (c.totale_speso || 0), 0)

  // ---- STORICO VIEW ----
  if (selectedCliente) {
    const stats = storico || {}
    const fatture = storico?.fatture || []
    const nomeCompleto = selectedCliente.cognome
      ? `${selectedCliente.nome} ${selectedCliente.cognome}`
      : selectedCliente.nome

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={handleTornaLista}
            style={{
              backgroundColor: '#fff',
              border: `1px solid ${primaryColor}`,
              color: primaryColor,
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ← Torna alla lista
          </button>
          <h1 style={{ color: primaryColor, margin: 0, fontSize: '1.6rem' }}>
            👤 {nomeCompleto}
          </h1>
          <span style={{
            backgroundColor: selectedCliente.tipo === 'azienda' ? '#ede7f6' : '#e3f2fd',
            color: selectedCliente.tipo === 'azienda' ? '#6a1b9a' : '#1565c0',
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '0.82rem',
            fontWeight: 'bold',
          }}>
            {selectedCliente.tipo === 'azienda' ? '🏢 Azienda' : '👤 Privato'}
          </span>
        </div>

        {/* Dati cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, flex: 'unset' }}>
            <h3 style={{ color: primaryColor, marginTop: 0 }}>📋 Dati Anagrafici</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Email', selectedCliente.email],
                  ['Telefono', selectedCliente.telefono],
                  ['Indirizzo', selectedCliente.indirizzo],
                  ['Città', selectedCliente.citta],
                  ['CAP', selectedCliente.cap],
                  ['Provincia', selectedCliente.provincia],
                  ['Partita IVA', selectedCliente.partita_iva],
                  ['Codice Fiscale', selectedCliente.codice_fiscale],
                ].map(([label, value]) => value ? (
                  <tr key={label}>
                    <td style={{ padding: '6px 0', color: '#666', width: '140px', fontWeight: 500 }}>{label}:</td>
                    <td style={{ padding: '6px 0', color: '#333' }}>{value}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
            {selectedCliente.note && (
              <div style={{ marginTop: '12px', color: '#555', fontSize: '0.9rem' }}>
                <strong>Note:</strong> {selectedCliente.note}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: '💰 Totale Speso', value: formatCurrency(stats.totale_speso || 0), color: '#e8f5e9', textColor: '#2e7d32' },
              { label: '🧾 N. Fatture', value: stats.num_fatture || 0, color: '#e3f2fd', textColor: '#1565c0' },
              { label: '✅ Fatture Pagate', value: stats.num_fatture_pagate || 0, color: '#f3e5f5', textColor: '#6a1b9a' },
              { label: '📅 Ultima Transazione', value: formatDate(stats.ultima_fattura), color: '#fff8e1', textColor: '#e65100' },
            ].map(({ label, value, color, textColor }) => (
              <div key={label} style={{ backgroundColor: color, borderRadius: '8px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: textColor }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Storico fatture */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
            <h3 style={{ color: primaryColor, margin: 0 }}>📋 Storico Fatture</h3>
          </div>
          {storicoLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Caricamento...</div>
          ) : fatture.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              Nessuna fattura collegata a questo cliente
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    {['Numero', 'Data', 'Importo', 'Tipo', 'Stato', 'File'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fatture.map((f) => (
                    <tr key={f.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{f.numero_fattura}</td>
                      <td style={{ padding: '12px 16px', color: '#555' }}>{formatDate(f.data_fattura)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: primaryColor }}>{formatCurrency(f.importo)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: f.tipo === 'attiva' ? '#e8f5e9' : '#fce4ec',
                          color: f.tipo === 'attiva' ? '#2e7d32' : '#c62828',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}>
                          {f.tipo === 'attiva' ? '↑ Attiva' : '↓ Passiva'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: f.pagata ? '#e8f5e9' : '#fff8e1',
                          color: f.pagata ? '#2e7d32' : '#e65100',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}>
                          {f.pagata ? '✅ Pagata' : '⏳ Da pagare'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#777', fontSize: '0.85rem' }}>
                        {f.nome_file || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- LIST VIEW ----
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: primaryColor, margin: 0, fontSize: '1.8rem' }}>👥 Clienti</h1>
        <button
          onClick={openNewModal}
          style={{
            backgroundColor: primaryColor,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.95rem',
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
          { label: '💰 Fatturato Totale', value: formatCurrency(fatturatoTotale), color: '#fff8e1', textColor: '#e65100' },
        ].map(({ label, value, color, textColor }) => (
          <div key={label} style={{ ...cardStyle, backgroundColor: color }}>
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
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleSearch}
            style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔍 Cerca
          </button>
          <button
            onClick={handleReset}
            style={{ backgroundColor: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}
          >
            ✕ Reset
          </button>
        </div>
      </div>

      {/* Table */}
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
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  {['#', 'Nome', 'Tipo', 'Email', 'Telefono', 'Città', 'Fatture', 'Totale Speso', 'Azioni'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clienti.map((c, idx) => {
                  const nomeCompleto = c.cognome ? `${c.nome} ${c.cognome}` : c.nome
                  return (
                    <tr key={c.id} style={{ borderTop: '1px solid #f0f0f0', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td style={{ padding: '12px 16px', color: '#999', fontSize: '0.85rem' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#333' }}>{nomeCompleto}</td>
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
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: primaryColor }}>{c.num_fatture || 0}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2e7d32' }}>
                        {formatCurrency(c.totale_speso || 0)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleVediStorico(c)}
                            title="Vedi storico"
                            style={{ backgroundColor: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            title="Modifica"
                            style={{ backgroundColor: '#fff8e1', color: '#e65100', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            title="Elimina"
                            style={{ backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: primaryColor, margin: 0 }}>
                {editingCliente ? '✏️ Modifica Cliente' : '➕ Nuovo Cliente'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                <button type="button" onClick={closeModal} style={{ backgroundColor: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '6px', padding: '10px 24px', cursor: 'pointer' }}>
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Salvataggio...' : editingCliente ? 'Aggiorna' : 'Crea Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
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
