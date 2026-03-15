import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornitureAPI, fornitoriAPI, prodottiAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_FORNITURA_COLORS } from '../constants/colors'
import { CORRIERI } from '../constants/corrieri'
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
  const [fornitori, setFornitori] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [form, setForm] = useState({ fornitore_id: '', fornitore_nome: '', note: '', corriere: '', tracking_number: '', righe: [{ ...emptyRiga }] })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [trackingFornituraModal, setTrackingFornituraModal] = useState(null)
  const [trackingFornituraForm, setTrackingFornituraForm] = useState({ corriere: '', tracking_number: '' })
  const [trackingFornituraLoading, setTrackingFornituraLoading] = useState(false)

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

  const openNewModal = () => {
    setForm({ fornitore_id: '', fornitore_nome: '', note: '', corriere: '', tracking_number: '', righe: [{ ...emptyRiga }] })
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
        corriere: form.corriere || null,
        tracking_number: form.tracking_number || null,
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
        <button onClick={openNewModal} className={styles.newBtn}>+ Nuova Fornitura</button>
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
                {['N° Fornitura', 'Fornitore', 'Stato', 'Prodotti', 'Totale €', 'Corriere / Tracking', 'Data', 'Azioni'].map(h => (
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
                  <td className={styles.td}>
                    {fornitura.tracking_number ? (
                      <div className={styles.tracking}>
                        <span className={styles.trackingCorriere}>{fornitura.corriere || '—'}</span>
                        {(() => {
                          const corriere = CORRIERI.find(c => c.value === fornitura.corriere)
                          const url = corriere ? corriere.url(fornitura.tracking_number) : null
                          return url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.trackingLink}>
                              {fornitura.tracking_number} 🔗
                            </a>
                          ) : (
                            <span className={styles.trackingNum}>{fornitura.tracking_number}</span>
                          )
                        })()}
                        <button
                          onClick={() => {
                            setTrackingFornituraModal(fornitura)
                            setTrackingFornituraForm({ corriere: fornitura.corriere || '', tracking_number: fornitura.tracking_number || '' })
                          }}
                          title="Modifica tracking"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '4px' }}
                        >✏️</button>
                      </div>
                    ) : (
                      <div className={styles.tracking}>
                        <span className={styles.trackingEmpty}>—</span>
                        <button
                          onClick={() => {
                            setTrackingFornituraModal(fornitura)
                            setTrackingFornituraForm({ corriere: fornitura.corriere || '', tracking_number: fornitura.tracking_number || '' })
                          }}
                          title="Modifica tracking"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '4px' }}
                        >✏️</button>
                      </div>
                    )}
                  </td>
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
      {showModal && (
        <div className={styles.modalOverlay}>
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
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Corriere (opzionale)</label>
                  <select value={form.corriere} onChange={e => setForm(prev => ({ ...prev, corriere: e.target.value }))} className={styles.formSelect}>
                    <option value="">— Nessun corriere —</option>
                    {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Tracking spedizione (opzionale)</label>
                  <input value={form.tracking_number} onChange={e => setForm(prev => ({ ...prev, tracking_number: e.target.value }))} placeholder="Numero tracking..." className={styles.formInput} />
                </div>
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

      {/* Tracking Edit Modal */}
      {trackingFornituraModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '400px' }}>
            <h3 className={styles.modalTitle}>✏️ Modifica Tracking — {trackingFornituraModal.numero_fornitura}</h3>
            <div className={styles.formField} style={{ marginBottom: '12px' }}>
              <label>Corriere</label>
              <select value={trackingFornituraForm.corriere} onChange={e => setTrackingFornituraForm(prev => ({ ...prev, corriere: e.target.value }))} className={styles.formSelect}>
                <option value="">— Nessun corriere —</option>
                {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className={styles.formField} style={{ marginBottom: '16px' }}>
              <label>Numero Tracking</label>
              <input value={trackingFornituraForm.tracking_number} onChange={e => setTrackingFornituraForm(prev => ({ ...prev, tracking_number: e.target.value }))} placeholder="Codice tracking..." className={styles.formInput} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setTrackingFornituraModal(null)} className={styles.cancelBtn} disabled={trackingFornituraLoading}>Annulla</button>
              <button
                onClick={async () => {
                  setTrackingFornituraLoading(true)
                  try {
                    await fornitureAPI.update(trackingFornituraModal.id, {
                      corriere: trackingFornituraForm.corriere || null,
                      tracking_number: trackingFornituraForm.tracking_number || null,
                    })
                    setForniture(prev => prev.map(f => f.id === trackingFornituraModal.id ? { ...f, corriere: trackingFornituraForm.corriere, tracking_number: trackingFornituraForm.tracking_number } : f))
                    setTrackingFornituraModal(null)
                  } catch (err) {
                    alert(err?.response?.data?.detail || 'Errore nel salvataggio')
                  } finally {
                    setTrackingFornituraLoading(false)
                  }
                }}
                className={styles.submitBtn}
                disabled={trackingFornituraLoading}
              >
                {trackingFornituraLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
