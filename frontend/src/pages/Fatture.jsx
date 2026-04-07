import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { fattureAPI } from '../api/client'
import { formatDate, formatCurrency } from '../utils/formatters'
import '../styles/shared.css'

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
  const [searchParams] = useSearchParams()
  const alertFilter = searchParams.get('alert')
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
    if (!window.confirm(`Eliminare la fattura ${fattura.numero_fattura}?`)) return
    try {
      await fattureAPI.delete(fattura.id)
      setFatture(prev => prev.filter(f => f.id !== fattura.id))
    } catch {
      setError('Errore durante l\'eliminazione')
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

  const totale = fatture.length
  const pagate = fatture.filter(f => f.pagata).length
  const daPagare = totale - pagate
  const importoTotale = fatture.reduce((sum, f) => sum + (f.importo || 0), 0)

  const fattureFiltrate = alertFilter === 'da_pagare'
    ? fatture.filter(f => f.pagata === false)
    : fatture

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="page-title-section">
          <div className="page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Fatture</h1>
            <p className="page-subtitle">Gestione fatture attive e passive</p>
          </div>
        </div>
        <button onClick={openNewModal} className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuova Fattura
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="card stat-card-blue">
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{totale}</span>
            <span className="stat-label">Totale fatture</span>
          </div>
        </div>
        <div className="card stat-card-green">
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value" style={{ color: 'var(--success)' }}>{pagate}</span>
            <span className="stat-label">Pagate</span>
          </div>
        </div>
        <div className="card stat-card-amber">
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value" style={{ color: 'var(--warning)' }}>{daPagare}</span>
            <span className="stat-label">Da pagare</span>
          </div>
        </div>
        <div className="card stat-card-purple">
          <div className="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value" style={{ color: '#8b5cf6' }}>{formatCurrency(importoTotale)}</span>
            <span className="stat-label">Totale importo</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-input-wrapper">
            <svg className="filter-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={filterCliente}
              onChange={e => setFilterCliente(e.target.value)}
              placeholder="Cerca cliente..."
              className="filter-input"
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <input
              type="date"
              value={filterDataDa}
              onChange={e => setFilterDataDa(e.target.value)}
              className="form-input"
              title="Data da"
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <input
              type="date"
              value={filterDataA}
              onChange={e => setFilterDataA(e.target.value)}
              className="form-input"
              title="Data a"
            />
          </div>
          <button onClick={handleSearch} className="btn-primary">Cerca</button>
          <button onClick={handleReset} className="btn-secondary">Reset</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {alertFilter === 'da_pagare' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', marginBottom: '16px', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: '8px', fontSize: '13px', color: '#fbbf24' }}>
          <span>Filtro attivo: Fatture da pagare</span>
          <Link to="/fatture" style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)', fontSize: '12px', textDecoration: 'none', padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}>✕ Rimuovi filtro</Link>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-state">Caricamento...</div>
        ) : fattureFiltrate.length === 0 ? (
          <div className="loading-state">Nessuna fattura trovata</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Numero</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Importo</th>
                  <th>Tipo</th>
                  <th>Pagata</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {fattureFiltrate.map((f) => (
                  <tr key={f.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{f.id}</td>
                    <td className="text-bold">{f.numero_fattura}</td>
                    <td>{formatDate(f.data_fattura)}</td>
                    <td>{f.cliente}</td>
                    <td style={{ fontWeight: '600' }}>{formatCurrency(f.importo)}</td>
                    <td>
                      <span className={`badge ${f.tipo === 'attiva' ? 'badge-success' : 'badge-danger'}`}>
                        {f.tipo === 'attiva' ? 'Attiva' : 'Passiva'}
                      </span>
                    </td>
                    <td>
                      <span
                        onClick={() => handleTogglePagata(f)}
                        title="Clicca per cambiare stato"
                        className={`badge ${f.pagata ? 'badge-success' : 'badge-warning'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {f.pagata ? 'Pagata' : 'Da pagare'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleDownload(f)}
                          title="Scarica PDF"
                          className="btn-icon btn-icon-blue"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditModal(f)}
                          title="Modifica"
                          className="btn-icon btn-icon-blue"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          title="Elimina"
                          className="btn-icon btn-icon-red"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{ opacity: page === 1 ? 0.5 : 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Precedente
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Pagina {page} di {totalPages} ({totalFatture} fatture)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
            style={{ opacity: page === totalPages ? 0.5 : 1 }}
          >
            Successiva
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingFattura ? 'Modifica Fattura' : 'Nuova Fattura'}
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
                  <label className="form-label">Numero fattura *</label>
                  <input
                    type="text"
                    name="numero_fattura"
                    value={form.numero_fattura}
                    onChange={handleFormChange}
                    placeholder="Es. 2024/001"
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Data fattura *</label>
                  <input
                    type="date"
                    name="data_fattura"
                    value={form.data_fattura}
                    onChange={handleFormChange}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Cliente *</label>
                  <input
                    type="text"
                    name="cliente"
                    value={form.cliente}
                    onChange={handleFormChange}
                    placeholder="Nome cliente/fornitore"
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Importo € *</label>
                  <input
                    type="number"
                    name="importo"
                    value={form.importo}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Tipo *</label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleFormChange}
                    className="form-input"
                  >
                    <option value="attiva">Attiva (vendita)</option>
                    <option value="passiva">Passiva (acquisto)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                  <input
                    type="checkbox"
                    id="pagata"
                    name="pagata"
                    checked={form.pagata}
                    onChange={handleFormChange}
                  />
                  <label htmlFor="pagata" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Fattura pagata
                  </label>
                </div>

                <div className="form-full">
                  <label className="form-label">Note</label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleFormChange}
                    placeholder="Note aggiuntive..."
                    className="form-input form-textarea"
                    rows="3"
                  />
                </div>

                {!editingFattura && (
                  <div className="form-full">
                    <label className="form-label">Allegato PDF</label>
                    <input
                      type="file"
                      name="file"
                      accept=".pdf"
                      onChange={handleFormChange}
                      className="form-input"
                      style={{ padding: '8px' }}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Annulla
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Salvataggio...' : (editingFattura ? 'Salva Modifiche' : 'Crea Fattura')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
