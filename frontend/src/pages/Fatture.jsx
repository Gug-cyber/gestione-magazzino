import { useState, useEffect, useCallback } from 'react'
import { fattureAPI } from '../api/client'
import { formatDate, formatCurrency } from '../utils/formatters'
import { PRIMARY_COLOR } from '../constants/colors'

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  flex: 1,
  minWidth: '140px',
}

const emptyForm = {
  numero_fattura: '',
  data_fattura: '',
  cliente: '',
  importo: '',
  tipo: 'attiva',
  pagata: false,
  note: '',
  file: null,
}

export default function Fatture() {
  const [fatture, setFatture] = useState([])
  const [totalFatture, setTotalFatture] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingFattura, setEditingFattura] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Filters
  const [filterCliente, setFilterCliente] = useState('')
  const [filterDataDa, setFilterDataDa] = useState('')
  const [filterDataA, setFilterDataA] = useState('')

  const PAGE_SIZE = 50
  const totalPages = Math.max(1, Math.ceil(totalFatture / PAGE_SIZE))

  const fetchFatture = useCallback(async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const res = await fattureAPI.getAll({ ...params, skip: ((params.page || 1) - 1) * PAGE_SIZE, limit: PAGE_SIZE })
      setFatture(res.data)
      const tc = parseInt(res.headers['x-total-count'] ?? '0', 10)
      setTotalFatture(isNaN(tc) ? res.data.length : tc)
    } catch {
      setError('Errore nel caricamento delle fatture')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFatture({ page })
  }, [fetchFatture, page])

  const handleSearch = () => {
    setPage(1)
    const params = {}
    if (filterCliente) params.cliente = filterCliente
    if (filterDataDa) params.data_da = filterDataDa
    if (filterDataA) params.data_a = filterDataA
    fetchFatture({ ...params, page: 1 })
  }

  const handleReset = () => {
    setFilterCliente('')
    setFilterDataDa('')
    setFilterDataA('')
    setPage(1)
    fetchFatture({ page: 1 })
  }

  const openNewModal = () => {
    setEditingFattura(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (fattura) => {
    setEditingFattura(fattura)
    setForm({
      numero_fattura: fattura.numero_fattura,
      data_fattura: fattura.data_fattura,
      cliente: fattura.cliente,
      importo: fattura.importo,
      tipo: fattura.tipo,
      pagata: fattura.pagata,
      note: fattura.note || '',
      file: null,
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingFattura(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked, files } = e.target
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'file') {
      setForm(prev => ({ ...prev, file: files[0] || null }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.numero_fattura || !form.data_fattura || !form.cliente || !form.importo) {
      setFormError('Compila tutti i campi obbligatori')
      return
    }
    setSubmitting(true)
    try {
      if (editingFattura) {
        const updateData = {
          numero_fattura: form.numero_fattura,
          data_fattura: form.data_fattura,
          cliente: form.cliente,
          importo: parseFloat(form.importo),
          tipo: form.tipo,
          pagata: form.pagata,
          note: form.note || null,
        }
        const res = await fattureAPI.update(editingFattura.id, updateData)
        setFatture(prev => prev.map(f => f.id === editingFattura.id ? res.data : f))
      } else {
        const formData = new FormData()
        formData.append('numero_fattura', form.numero_fattura)
        formData.append('data_fattura', form.data_fattura)
        formData.append('cliente', form.cliente)
        formData.append('importo', parseFloat(form.importo))
        formData.append('tipo', form.tipo)
        formData.append('pagata', form.pagata)
        if (form.note) formData.append('note', form.note)
        if (form.file) formData.append('file', form.file)
        const res = await fattureAPI.create(formData)
        setFatture(prev => [res.data, ...prev])
      }
      closeModal()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePagata = async (fattura) => {
    try {
      const res = await fattureAPI.togglePagata(fattura.id)
      setFatture(prev => prev.map(f => f.id === fattura.id ? res.data : f))
    } catch {
      setError('Errore nel cambio stato pagamento')
    }
  }

  const handleDelete = async (fattura) => {
    if (fattura.auto_generata) {
      setError('Le fatture generate automaticamente non possono essere eliminate singolarmente. Usa "Elimina Tutte" per rimuoverle.')
      return
    }
    if (!window.confirm(`Eliminare la fattura ${fattura.numero_fattura}?`)) return
    try {
      await fattureAPI.delete(fattura.id)
      setFatture(prev => prev.filter(f => f.id !== fattura.id))
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Errore durante l\'eliminazione'
      setError(errorMessage)
    }
  }

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'ELIMINA') {
      return
    }
    setIsDeleting(true)
    try {
      await fattureAPI.deleteAll()
      setFatture([])
      setTotalFatture(0)
      setShowDeleteAllModal(false)
      setDeleteAllConfirmText('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'eliminazione di tutte le fatture')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = (fattura) => {
    const token = localStorage.getItem('token')
    const url = fattureAPI.getDownloadUrl(fattura.id)
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Download fallito')
        return res.blob()
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fattura.nome_file || 'fattura.pdf'
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
      .catch(() => setError('Errore durante il download del PDF'))
  }

  // Stats
  const totale = fatture.length
  const pagate = fatture.filter(f => f.pagata).length
  const daPagare = totale - pagate
  const importoTotale = fatture.reduce((sum, f) => sum + (f.importo || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: PRIMARY_COLOR, margin: 0 }}>🧾 Fatture</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            disabled={totalFatture === 0 || isDeleting}
            style={{
              backgroundColor: totalFatture === 0 || isDeleting ? '#b0bec5' : '#c62828',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: totalFatture === 0 || isDeleting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: totalFatture === 0 || isDeleting ? 0.6 : 1,
            }}
            title={totalFatture === 0 ? 'Nessuna fattura da eliminare' : 'Elimina tutte le fatture'}
          >
            🗑️ Elimina Tutte
          </button>
          <button
            onClick={openNewModal}
            style={{
              backgroundColor: PRIMARY_COLOR,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            ➕ Nuova Fattura
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>📄 Totale fatture</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: PRIMARY_COLOR }}>{totale}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>✅ Pagate</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>{pagate}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>⏳ Da pagare</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>{daPagare}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>💰 Totale importo</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: PRIMARY_COLOR }}>{formatCurrency(importoTotale)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Cliente 🔍</label>
          <input
            type="text"
            value={filterCliente}
            onChange={e => setFilterCliente(e.target.value)}
            placeholder="Cerca cliente..."
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100%' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Data da 📅</label>
          <input
            type="date"
            value={filterDataDa}
            onChange={e => setFilterDataDa(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100%' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '130px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Data a 📅</label>
          <input
            type="date"
            value={filterDataA}
            onChange={e => setFilterDataA(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', width: '100%' }}
          />
        </div>
        <button
          onClick={handleSearch}
          style={{
            backgroundColor: PRIMARY_COLOR,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Cerca
        </button>
        <button
          onClick={handleReset}
          style={{
            backgroundColor: '#fff',
            color: PRIMARY_COLOR,
            border: `1px solid ${PRIMARY_COLOR}`,
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Reset
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Caricamento...</div>
        ) : fatture.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Nessuna fattura trovata</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: PRIMARY_COLOR, color: '#fff' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Numero</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Importo</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Pagata</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {fatture.map((f, i) => (
                <tr
                  key={f.id}
                  style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9' }}
                >
                  <td style={tdStyle}>{f.id}</td>
                  <td style={tdStyle}>{f.numero_fattura}</td>
                  <td style={tdStyle}>{formatDate(f.data_fattura)}</td>
                  <td style={tdStyle}>{f.cliente}</td>
                  <td style={tdStyle}>{formatCurrency(f.importo)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: f.tipo === 'attiva' ? '#e8f5e9' : '#ffebee',
                      color: f.tipo === 'attiva' ? '#2e7d32' : '#c62828',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {f.tipo === 'attiva' ? '📈 Attiva' : '📉 Passiva'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span
                      onClick={() => handleTogglePagata(f)}
                      title="Clicca per cambiare stato"
                      style={{
                        backgroundColor: f.pagata ? '#e8f5e9' : '#fff3e0',
                        color: f.pagata ? '#2e7d32' : '#e65100',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      {f.pagata ? '✅ Pagata' : '⏳ Da pagare'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleDownload(f)}
                        title="Scarica PDF"
                        style={actionBtnStyle('#1565c0')}
                      >
                        📥
                      </button>
                      <button
                        onClick={() => openEditModal(f)}
                        title="Modifica"
                        style={actionBtnStyle('#f57f17')}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        title={f.auto_generata ? "Le fatture generate automaticamente non possono essere eliminate manualmente" : "Elimina"}
                        disabled={f.auto_generata}
                        style={{
                          ...actionBtnStyle('#c62828'),
                          opacity: f.auto_generata ? 0.5 : 1,
                          cursor: f.auto_generata ? 'not-allowed' : 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', fontSize: '0.9rem', color: '#555' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ backgroundColor: page === 1 ? '#b0bec5' : PRIMARY_COLOR, color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: page === 1 ? 'default' : 'pointer' }}
          >← Precedente</button>
          <span>Pagina {page} di {totalPages} ({totalFatture} fatture)</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ backgroundColor: page === totalPages ? '#b0bec5' : PRIMARY_COLOR, color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: page === totalPages ? 'default' : 'pointer' }}
          >Successiva →</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, marginBottom: '20px' }}>
              {editingFattura ? '✏️ Modifica Fattura' : '➕ Nuova Fattura'}
            </h2>

            {formError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Numero fattura *</label>
                <input
                  type="text"
                  name="numero_fattura"
                  value={form.numero_fattura}
                  onChange={handleFormChange}
                  placeholder="Es. 2024/001"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Data fattura *</label>
                <input
                  type="date"
                  name="data_fattura"
                  value={form.data_fattura}
                  onChange={handleFormChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Cliente *</label>
                <input
                  type="text"
                  name="cliente"
                  value={form.cliente}
                  onChange={handleFormChange}
                  placeholder="Nome cliente/fornitore"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Importo € *</label>
                <input
                  type="number"
                  name="importo"
                  value={form.importo}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Tipo *</label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleFormChange}
                  style={inputStyle}
                >
                  <option value="attiva">📈 Attiva (vendita)</option>
                  <option value="passiva">📉 Passiva (acquisto)</option>
                </select>
              </div>

              <div style={{ ...fieldStyle, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  name="pagata"
                  id="pagata"
                  checked={form.pagata}
                  onChange={handleFormChange}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="pagata" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
                  Pagata
                </label>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Note</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleFormChange}
                  placeholder="Note opzionali..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {!editingFattura && (
                <div style={fieldStyle}>
                  <label style={labelStyle}>Carica PDF (opzionale)</label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf"
                    onChange={handleFormChange}
                    style={{ fontSize: '14px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    backgroundColor: '#fff',
                    color: '#555',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: PRIMARY_COLOR,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Salvataggio...' : (editingFattura ? 'Aggiorna' : 'Crea Fattura')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Elimina Tutte */}
      {showDeleteAllModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ color: '#c62828', marginTop: 0, marginBottom: '20px' }}>
              ⚠️ Elimina Tutte le Fatture
            </h2>

            <div style={{ backgroundColor: '#ffebee', padding: '16px', borderRadius: '4px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#c62828' }}>
                Attenzione: Questa operazione è IRREVERSIBILE!
              </p>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.9rem', color: '#c62828' }}>
                <li>Eliminerà <strong>{totalFatture} fatture</strong></li>
                <li>Include le fatture <strong>auto-generate</strong></li>
                <li>Non può essere annullata</li>
              </ul>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Per confermare, digita la parola: <span style={{ color: '#c62828' }}>ELIMINA</span>
              </label>
              <input
                type="text"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="Digita ELIMINA"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteAllModal(false)
                  setDeleteAllConfirmText('')
                }}
                disabled={isDeleting}
                style={{
                  backgroundColor: '#fff',
                  color: '#555',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleteAllConfirmText !== 'ELIMINA' || isDeleting}
                style={{
                  backgroundColor: deleteAllConfirmText !== 'ELIMINA' || isDeleting ? '#b0bec5' : '#c62828',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 20px',
                  cursor: deleteAllConfirmText !== 'ELIMINA' || isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: deleteAllConfirmText !== 'ELIMINA' || isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? 'Eliminazione...' : 'Elimina Tutto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '13px',
}

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  verticalAlign: 'middle',
}

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '16px',
}

const labelStyle = {
  fontSize: '13px',
  color: '#444',
  marginBottom: '6px',
  fontWeight: '500',
}

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  outline: 'none',
}

const actionBtnStyle = (color) => ({
  backgroundColor: color,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: '14px',
  lineHeight: 1,
})
