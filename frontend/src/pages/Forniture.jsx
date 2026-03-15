import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornitureAPI, fornitoriAPI, prodottiAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_FORNITURA_COLORS } from '../constants/colors'
import { formatDate, formatCurrency } from '../utils/formatters'
import styles from './Forniture.module.css'

const STATI = ['bozza', 'confermato', 'spedito', 'ricevuto', 'annullato']

const PAGE_SIZE = 50
const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }

export default function Forniture() {
  const navigate = useNavigate()
  const [forniture, setForniture] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [fornitori, setFornitori] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [form, setForm] = useState({ fornitore_id: '', fornitore_nome: '', note: '', righe: [{ ...emptyRiga }] })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchForniture = useCallback(async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const res = await fornitureAPI.getAll({ ...params, skip: ((params.page || 1) - 1) * PAGE_SIZE, limit: PAGE_SIZE })
      setForniture(res.data)
      const totalCount = parseInt(res.headers['x-total-count'] ?? '0', 10)
      setTotal(isNaN(totalCount) ? res.data.length : totalCount)
    } catch {
      setError('Errore nel caricamento delle forniture')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = {}
    if (search) params.search = search
    if (filtroStato) params.stato = filtroStato
    params.page = page
    fetchForniture(params)
  }, [page, fetchForniture]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fornitoriAPI.getAll().then(r => setFornitori(r.data)).catch(() => {})
    prodottiAPI.getAll({ limit: 500 }).then(r => setProdotti(r.data)).catch(() => {})
  }, [])

  const handleSearch = () => {
    setPage(1)
    const params = {}
    if (search) params.search = search
    if (filtroStato) params.stato = filtroStato
    params.page = 1
    fetchForniture(params)
  }

  const handleReset = () => {
    setSearch('')
    setFiltroStato('')
    setPage(1)
    fetchForniture({ page: 1 })
  }

  const handleDeleteAll = () => {
    const confirmed = window.confirm(
      `⚠️ ATTENZIONE!\n\nStai per eliminare TUTTE le ${total} forniture.\n\nQuesta operazione è IRREVERSIBILE.\n\nVuoi continuare?`
    )
    if (!confirmed) return
    setShowDeleteAllModal(true)
    setDeleteConfirmText('')
  }

  const confirmDeleteAll = async () => {
    if (deleteConfirmText !== 'ELIMINA') {
      alert('Devi digitare esattamente la parola "ELIMINA" per confermare.')
      return
    }
    setIsDeleting(true)
    setError('')
    try {
      const response = await fornitureAPI.deleteAll()
      const deletedCount = response.data?.deleted_count ?? 0
      setShowDeleteAllModal(false)
      setDeleteConfirmText('')
      alert(`✅ Operazione completata!\n\n${deletedCount} forniture eliminate con successo.`)
      setPage(1)
      fetchForniture({ page: 1 })
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'eliminazione massiva delle forniture")
      setShowDeleteAllModal(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const openNewModal = () => {
    setForm({ fornitore_id: '', fornitore_nome: '', note: '', righe: [{ ...emptyRiga }] })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormError('')
  }

  const handleRigaChange = (index, field, value) => {
    setForm(prev => {
      const righe = [...prev.righe]
      righe[index] = { ...righe[index], [field]: value }
      if (field === 'prodotto_id') {
        const prod = prodotti.find(p => p.id === parseInt(value))
        if (prod) righe[index].prezzo_unitario = prod.prezzo_acquisto || 0
      }
      return { ...prev, righe }
    })
  }

  const addRiga = () => setForm(prev => ({ ...prev, righe: [...prev.righe, { ...emptyRiga }] }))

  const removeRiga = (index) => setForm(prev => ({
    ...prev,
    righe: prev.righe.filter((_, i) => i !== index),
  }))

  const totaleFornitura = form.righe.reduce((acc, r) => acc + (Number(r.quantita) * Number(r.prezzo_unitario)), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const righe = form.righe.filter(r => r.prodotto_id)
    if (!righe.length) { setFormError('Aggiungi almeno un prodotto'); return }
    setSubmitting(true)
    try {
      const payload = {
        fornitore_id: form.fornitore_id ? parseInt(form.fornitore_id) : null,
        fornitore_nome: form.fornitore_nome || null,
        note: form.note || null,
        righe: righe.map(r => ({
          prodotto_id: parseInt(r.prodotto_id),
          quantita: parseInt(r.quantita),
          prezzo_unitario: parseFloat(r.prezzo_unitario),
        })),
      }
      await fornitureAPI.create(payload)
      closeModal()
      handleReset()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Errore nella creazione della fornitura')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats locali sulla pagina corrente
  const totaleBozze = forniture.filter(o => o.stato === 'bozza').length
  const totaleInAttesa = forniture.filter(o => o.stato === 'confermato' || o.stato === 'spedito').length
  const totaleRicevute = forniture.filter(o => o.stato === 'ricevuto').length

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🚚 Forniture</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={openNewModal} className={styles.newBtn}>+ Nuova Fornitura</button>
          <button
            onClick={handleDeleteAll}
            disabled={total === 0 || isDeleting}
            style={{
              backgroundColor: total === 0 || isDeleting ? '#ccc' : '#c62828',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: total === 0 || isDeleting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              opacity: total === 0 || isDeleting ? 0.6 : 1,
            }}
            title={total === 0 ? 'Nessuna fornitura da eliminare' : `Elimina tutte le ${total} forniture`}
          >
            🗑️ Elimina Tutte
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Totale Forniture</div>
          <div className={styles.statValue}>{total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Bozza</div>
          <div className={styles.statValue} style={{ color: '#1565c0' }}>{totaleBozze}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Attesa</div>
          <div className={styles.statValue} style={{ color: '#e65100' }}>{totaleInAttesa}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Ricevute</div>
          <div className={styles.statValue} style={{ color: '#2e7d32' }}>{totaleRicevute}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Cerca per N° fornitura o fornitore..."
          className={styles.filterInput}
        />
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className={styles.filterSelect}>
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button onClick={handleSearch} className={styles.searchBtn}>Cerca</button>
        <button onClick={handleReset} className={styles.resetBtn}>Reset</button>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Table */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.emptyMsg}>Caricamento...</div>
        ) : forniture.length === 0 ? (
          <div className={styles.emptyMsg}>Nessuna fornitura trovata</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {['N° Fornitura', 'Fornitore', 'Stato', 'Prodotti', 'Totale €', 'Data', 'Azioni'].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forniture.map(fornitura => (
                <tr key={fornitura.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.fornituraNum}`}>{fornitura.numero_fornitura}</td>
                  <td className={styles.td}>{fornitura.fornitore_nome || '—'}</td>
                  <td className={styles.td}>
                    <StatoBadge value={fornitura.stato} colors={STATO_FORNITURA_COLORS} capitalize />
                  </td>
                  <td className={styles.td}>{fornitura.righe?.length || 0} prodotti</td>
                  <td className={`${styles.td} ${styles.totalCell}`}>{formatCurrency(fornitura.totale)}</td>
                  <td className={`${styles.td} ${styles.dateCell}`}>{formatDate(fornitura.data_fornitura)}</td>
                  <td className={styles.td}>
                    <button onClick={() => navigate(`/forniture/${fornitura.id}`)} title="Vedi dettaglio" className={styles.detailBtn}>👁️ Dettaglio</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Precedente</button>
          <span>Pagina {page} di {totalPages} ({total} forniture)</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Successiva →</button>
        </div>
      )}

      {/* New Fornitura Modal */}
      {showModal && (        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Nuova Fornitura</h2>
            {formError && <div className={styles.modalError}>{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Fornitore (da anagrafica)</label>
                  <select value={form.fornitore_id} onChange={e => setForm(prev => ({ ...prev, fornitore_id: e.target.value }))} className={styles.formSelect}>
                    <option value="">— Nessun fornitore —</option>
                    {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Nome fornitore (testo libero)</label>
                  <input value={form.fornitore_nome} onChange={e => setForm(prev => ({ ...prev, fornitore_nome: e.target.value }))} placeholder="Es. Fornitore SRL" className={styles.formInput} />
                </div>
              </div>
              <div className={styles.formField} style={{ marginBottom: '16px' }}>
                <label>Note (opzionale)</label>
                <textarea value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Note sulla fornitura..." className={styles.formInput} rows={2} />
              </div>
              <h3 className={styles.modalSubTitle}>Prodotti</h3>
              {form.righe.map((riga, i) => (
                <div key={i} className={styles.rigaRow}>
                  <select value={riga.prodotto_id} onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)} className={styles.formSelect}>
                    <option value="">— Seleziona prodotto —</option>
                    {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome} (SKU: {p.sku})</option>)}
                  </select>
                  <input type="number" min="1" value={riga.quantita} onChange={e => handleRigaChange(i, 'quantita', e.target.value)} placeholder="Qtà" className={styles.formInput} />
                  <input type="number" min="0" step="0.01" value={riga.prezzo_unitario} onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)} placeholder="Prezzo" className={styles.formInput} />
                  <button type="button" onClick={() => removeRiga(i)} disabled={form.righe.length === 1} className={styles.removeRigaBtn} style={{ opacity: form.righe.length === 1 ? 0.3 : 1, cursor: form.righe.length === 1 ? 'not-allowed' : 'pointer' }}>🗑️</button>
                </div>
              ))}
              <button type="button" onClick={addRiga} className={styles.addRigaBtn}>+ Aggiungi Riga</button>
              <div className={styles.totaleFornitura}>Totale: {formatCurrency(totaleFornitura)}</div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelBtn}>Annulla</button>
                <button type="submit" disabled={submitting} className={styles.submitBtn}>{submitting ? 'Salvataggio...' : 'Crea Fornitura'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Forniture Modal */}
      {showDeleteAllModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ color: '#c62828', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ ATTENZIONE: Eliminazione massiva
            </h2>
            <p style={{ color: '#333', marginBottom: '16px', lineHeight: 1.6 }}>
              Stai per eliminare <strong>TUTTE le {total} forniture</strong> dal database.
            </p>
            <div style={{
              backgroundColor: '#ffebee',
              border: '1px solid #ef9a9a',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#c62828' }}>
                <strong>Questa operazione:</strong>
              </p>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.9rem', color: '#c62828' }}>
                <li>Eliminerà <strong>{total} forniture</strong></li>
                <li>È <strong>IRREVERSIBILE</strong></li>
                <li>Non può essere annullata</li>
              </ul>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Per confermare, digita la parola: <span style={{ color: '#c62828' }}>ELIMINA</span>
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digita ELIMINA"
                disabled={isDeleting}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ccc',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDeleteAllModal(false); setDeleteConfirmText('') }}
                disabled={isDeleting}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                }}
              >
                Annulla
              </button>
              <button
                onClick={confirmDeleteAll}
                disabled={isDeleting || deleteConfirmText !== 'ELIMINA'}
                style={{
                  backgroundColor: deleteConfirmText === 'ELIMINA' && !isDeleting ? '#c62828' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: deleteConfirmText === 'ELIMINA' && !isDeleting ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  opacity: deleteConfirmText === 'ELIMINA' && !isDeleting ? 1 : 0.6,
                }}
              >
                {isDeleting ? '⏳ Eliminazione...' : '🗑️ Conferma Eliminazione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
