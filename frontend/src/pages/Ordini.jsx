import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ordiniAPI, clientiAPI, prodottiAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_ORDINE_COLORS } from '../constants/colors'
import { CORRIERI } from '../constants/corrieri'
import { formatDate, formatCurrency, normalizeSkuForCode39 } from '../utils/formatters'
import BarcodeScanner from '../components/BarcodeScanner'
import styles from './Ordini.module.css'
import { pendingOrders } from '../utils/alertHelpers'

const STATI = ['bozza', 'confermato', 'spedito', 'completato', 'annullato']

const PAGE_SIZE = 50
const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }

export default function Ordini() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const alertFilter = searchParams.get('alert')
  const [ordini, setOrdini] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [clienti, setClienti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [form, setForm] = useState({ cliente_id: '', cliente_nome: '', note: '', corriere: '', tracking_number: '', righe: [{ ...emptyRiga }] })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [trackingModal, setTrackingModal] = useState(null)
  const [trackingForm, setTrackingForm] = useState({ corriere: '', tracking_number: '' })
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerRigaIndex, setScannerRigaIndex] = useState(null)
  const [scanError, setScanError] = useState('')
  const scanErrorTimerRef = useRef(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => () => { if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current) }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchOrdini = useCallback(async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const res = await ordiniAPI.getAll({ ...params, skip: ((params.page || 1) - 1) * PAGE_SIZE, limit: PAGE_SIZE })
      setOrdini(res.data)
      const totalCount = parseInt(res.headers['x-total-count'] ?? '0', 10)
      setTotal(isNaN(totalCount) ? res.data.length : totalCount)
    } catch {
      setError('Errore nel caricamento degli ordini')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = {}
    if (search) params.search = search
    if (filtroStato) params.stato = filtroStato
    params.page = page
    fetchOrdini(params)
  }, [page, fetchOrdini]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clientiAPI.getAll().then(r => setClienti(r.data)).catch(() => {})
    prodottiAPI.getAll({ limit: 200 }).then(r => setProdotti(r.data)).catch(() => {})
  }, [])

  const handleSearch = () => {
    setPage(1)
    const params = {}
    if (search) params.search = search
    if (filtroStato) params.stato = filtroStato
    params.page = 1
    fetchOrdini(params)
  }

  const handleReset = () => {
    setSearch('')
    setFiltroStato('')
    setPage(1)
    fetchOrdini({ page: 1 })
  }

  const handleQuickStateChange = (ordine) => {
    const stateFlow = {
      'bozza': 'confermato',
      'confermato': 'spedito',
      'spedito': 'completato',
      'completato': null,
      'annullato': null,
    }

    const nextState = stateFlow[ordine.stato]

    if (!nextState) {
      alert(`L'ordine è già nello stato finale: ${ordine.stato}`)
      return
    }

    const confirmed = window.confirm(
      `Cambiare stato ordine ${ordine.numero_ordine} da "${ordine.stato}" a "${nextState}"?`
    )

    if (!confirmed) return

    ordiniAPI.updateStato(ordine.id, nextState)
      .then(() => {
        setOrdini(prev => prev.map(o =>
          o.id === ordine.id ? { ...o, stato: nextState } : o
        ))
      })
      .catch(err => {
        alert(err?.response?.data?.detail || 'Errore nel cambio stato')
      })
  }

  const handleScan = (value) => {
    setShowScanner(false)
    if (scannerRigaIndex !== null) {
      let prodotto = null
      if (/^prodotto:\d+$/i.test(value)) {
        const id = parseInt(value.split(':')[1])
        prodotto = prodotti.find(p => p.id === id)
        if (!prodotto) {
          prodottiAPI.getById(id)
            .then(res => {
              if (!res.data?.id) throw new Error('not found')
              handleRigaChange(scannerRigaIndex, 'prodotto_id', String(res.data.id))
            })
            .catch(() => {
              setScanError(`Prodotto non trovato per il codice: "${value}"`)
              if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current)
              scanErrorTimerRef.current = setTimeout(() => setScanError(''), 4000)
            })
            .finally(() => setScannerRigaIndex(null))
          return
        }
      }
      if (!prodotto) {
        const normalized = normalizeSkuForCode39(value)
        prodotto = prodotti.find(p =>
          p.barcode === value || p.sku === value || p.sku === normalized
        )
      }
      if (prodotto) {
        handleRigaChange(scannerRigaIndex, 'prodotto_id', String(prodotto.id))
      } else {
        setScanError(`Prodotto non trovato per il codice: "${value}"`)
        if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current)
        scanErrorTimerRef.current = setTimeout(() => setScanError(''), 4000)
      }
      setScannerRigaIndex(null)
    } else {
      setSearch(value)
      fetchOrdini({ search: value, page: 1 })
      setPage(1)
    }
  }

  const openNewModal = () => {
    setForm({ cliente_id: '', cliente_nome: '', note: '', corriere: '', tracking_number: '', righe: [{ ...emptyRiga }] })
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
        if (prod) righe[index].prezzo_unitario = prod.prezzo_vendita || 0
      }
      return { ...prev, righe }
    })
  }

  const addRiga = () => setForm(prev => ({ ...prev, righe: [...prev.righe, { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }] }))

  const removeRiga = (index) => setForm(prev => ({
    ...prev,
    righe: prev.righe.filter((_, i) => i !== index),
  }))

  const totaleOrdine = form.righe.reduce((acc, r) => acc + (Number(r.quantita) * Number(r.prezzo_unitario)), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const righe = form.righe.filter(r => r.prodotto_id)
    if (!righe.length) { setFormError('Aggiungi almeno un prodotto'); return }
    setSubmitting(true)
    try {
      const payload = {
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        cliente_nome: form.cliente_nome || null,
        note: form.note || null,
        corriere: form.corriere || null,
        tracking_number: form.tracking_number || null,
        righe: righe.map(r => ({
          prodotto_id: parseInt(r.prodotto_id),
          quantita: parseInt(r.quantita),
          prezzo_unitario: parseFloat(r.prezzo_unitario),
        })),
      }
      await ordiniAPI.create(payload)
      closeModal()
      handleReset()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Errore nella creazione dell\'ordine')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats locali sulla pagina corrente
  const totaleBozze = ordini.filter(o => o.stato === 'bozza').length
  const totaleCompletati = ordini.filter(o => o.stato === 'completato').length
  const fatturatoTotale = ordini.filter(o => o.stato === 'completato').reduce((acc, o) => acc + (o.totale || 0), 0)

  const ordiniFiltrati = alertFilter === 'da_completare'
    ? pendingOrders(ordini)
    : ordini

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🛒 Ordini di Vendita</h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Gestisci le vendite al cliente</p>
        </div>
        <button onClick={() => navigate('/ordini/nuovo')} className={styles.newBtn}>+ Nuovo Ordine</button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Totale Ordini</div>
          <div className={styles.statValue}>{total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Bozza</div>
          <div className={styles.statValue} style={{ color: '#757575' }}>{totaleBozze}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completati</div>
          <div className={styles.statValue} style={{ color: '#2e7d32' }}>{totaleCompletati}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Fatturato (completati)</div>
          <div className={styles.statValue}>{formatCurrency(fatturatoTotale)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        {/* Search + Scanner row */}
        <div className={styles.filterInputWrapper}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Cerca per N° ordine o cliente..."
            className={styles.filterInput}
          />
          <button
            type="button"
            onClick={() => { setScannerRigaIndex(null); setShowScanner(true) }}
            title="Scansiona QR / barcode per cercare"
            className={styles.scannerBtn}
          >📷</button>
        </div>
        {/* Filter select */}
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className={styles.filterSelect}>
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {/* Action buttons row */}
        <div className={styles.filterActions}>
          <button onClick={handleSearch} className={styles.searchBtn}>Cerca</button>
          <button onClick={handleReset} className={styles.resetBtn}>Reset</button>
        </div>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {alertFilter === 'da_completare' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', marginBottom: '16px', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: '8px', fontSize: '13px', color: '#fbbf24' }}>
          <span>Filtro attivo: Ordini da completare (confermato / spedito)</span>
          <Link to="/ordini" style={{ marginLeft: 'auto', color: 'var(--color-text-secondary)', fontSize: '12px', textDecoration: 'none', padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: '4px' }}>✕ Rimuovi filtro</Link>
        </div>
      )}

      {/* Mobile Cards */}
      {isMobile && (
        <div className={styles.mobileCards}>
          {loading ? (
            <div className={styles.emptyMsg}>Caricamento...</div>
          ) : ordiniFiltrati.length === 0 ? (
            <div className={styles.emptyMsg}>Nessun ordine trovato</div>
          ) : ordiniFiltrati.map(ordine => (
            <div key={ordine.id} className={styles.mobileCard}>
              {/* Header: numero ordine + badge stato */}
              <div className={styles.mobileCardHeader}>
                <div className={styles.mobileCardTitle}>
                  <span className={styles.mobileCardNumber}>{ordine.numero_ordine}</span>
                  <span className={styles.mobileCardCliente}>{ordine.cliente_nome || '—'}</span>
                </div>
                <button
                  onClick={() => handleQuickStateChange(ordine)}
                  className={styles.statoBadgeBtn}
                  title="Clicca per cambiare stato"
                >
                  <StatoBadge value={ordine.stato} colors={STATO_ORDINE_COLORS} capitalize />
                </button>
              </div>
              {/* Detail rows */}
              <div className={styles.mobileCardRow}>
                <span className={styles.mobileCardLabel}>Prodotti</span>
                <span className={styles.mobileCardValue}>{ordine.righe?.length || 0} prodotti</span>
              </div>
              <div className={styles.mobileCardRow}>
                <span className={styles.mobileCardLabel}>Totale</span>
                <span className={styles.mobileCardValueSuccess}>{formatCurrency(ordine.totale)}</span>
              </div>
              <div className={styles.mobileCardRow}>
                <span className={styles.mobileCardLabel}>Data</span>
                <span className={styles.mobileCardValue}>{formatDate(ordine.data_ordine)}</span>
              </div>
              {ordine.tracking_number && (
                <div className={styles.mobileCardRow}>
                  <span className={styles.mobileCardLabel}>Tracking</span>
                  <span className={styles.mobileCardValue} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {ordine.corriere ? `${ordine.corriere}: ` : ''}{ordine.tracking_number}
                  </span>
                </div>
              )}
              {/* Footer actions */}
              <div className={styles.mobileCardActions}>
                <button
                  onClick={() => {
                    setTrackingModal(ordine)
                    setTrackingForm({ corriere: ordine.corriere || '', tracking_number: ordine.tracking_number || '' })
                  }}
                  className={styles.mobileActionBtn}
                >
                  Tracking
                </button>
                <button
                  onClick={() => navigate(`/ordini/${ordine.id}`)}
                  className={styles.mobileDetailBtn}
                >
                  Vedi Dettaglio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table - Desktop only */}
      <div className={styles.tableWrapper} style={isMobile ? { display: 'none' } : {}}>
        {loading ? (
          <div className={styles.emptyMsg}>Caricamento...</div>
        ) : ordiniFiltrati.length === 0 ? (
          <div className={styles.emptyMsg}>Nessun ordine trovato</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {['N° Ordine', 'Cliente', 'Stato', 'Tracking', 'Prodotti', 'Totale €', 'Data', 'Azioni'].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordiniFiltrati.map(ordine => (
                <tr key={ordine.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.ordineNum}`}>{ordine.numero_ordine}</td>
                  <td className={styles.td}>{ordine.cliente_nome || '—'}</td>
                  <td className={styles.td}>
                    <button
                      onClick={() => handleQuickStateChange(ordine)}
                      className={styles.statoBadgeBtn}
                      title="Clicca per cambiare stato"
                      aria-label={`Cambia stato ordine ${ordine.numero_ordine} (attuale: ${ordine.stato})`}
                    >
                      <StatoBadge value={ordine.stato} colors={STATO_ORDINE_COLORS} capitalize />
                    </button>
                  </td>
                  <td className={styles.td}>
                    {ordine.tracking_number ? (
                      <div className={`${styles.tracking} ${styles.trackingRow}`}>
                        <span className={styles.trackingCorriere}>{ordine.corriere || '—'}</span>
                        <div className={styles.trackingButtonContainer}>
                          {(() => {
                            const corriere = CORRIERI.find(c => c.value === ordine.corriere)
                            const url = corriere ? corriere.url(ordine.tracking_number) : null
                            return url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" className={styles.trackingLink}>
                                {ordine.tracking_number} 🔗
                              </a>
                            ) : (
                              <span className={styles.trackingNum}>{ordine.tracking_number}</span>
                            )
                          })()}
                          {ordine.corriere && ordine.corriere !== 'Altro' && ordine.tracking_number && (
                            <button
                              onClick={() => navigate(`/tracking/${encodeURIComponent(ordine.corriere)}/${encodeURIComponent(ordine.tracking_number)}`)}
                              title="Storico tracking"
                              className={styles.editTrackingBtn}
                            >📦</button>
                          )}
                          <button
                            onClick={() => {
                              setTrackingModal(ordine)
                              setTrackingForm({ corriere: ordine.corriere || '', tracking_number: ordine.tracking_number || '' })
                            }}
                            title="Modifica tracking"
                            className={styles.editTrackingBtn}
                          >✏️</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${styles.tracking} ${styles.trackingRow}`}>
                        <span className={styles.trackingEmpty}>—</span>
                        <button
                          onClick={() => {
                            setTrackingModal(ordine)
                            setTrackingForm({ corriere: ordine.corriere || '', tracking_number: ordine.tracking_number || '' })
                          }}
                          title="Modifica tracking"
                          className={styles.editTrackingBtn}
                        >✏️</button>
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>{ordine.righe?.length || 0} prodotti</td>
                  <td className={`${styles.td} ${styles.totalCell}`}>{formatCurrency(ordine.totale)}</td>
                  <td className={`${styles.td} ${styles.dateCell}`}>{formatDate(ordine.data_ordine)}</td>
                  <td className={styles.td}>
                    <button onClick={() => navigate(`/ordini/${ordine.id}`)} title="Vedi dettaglio" className={styles.detailBtn}>🔍</button>
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
          <span>Pagina {page} di {totalPages} ({total} ordini)</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Successiva →</button>
        </div>
      )}

      {/* New Order Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Nuovo Ordine</h2>
            {formError && <div className={styles.modalError}>{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Cliente (da anagrafica)</label>
                  <select value={form.cliente_id} onChange={e => setForm(prev => ({ ...prev, cliente_id: e.target.value }))} className={styles.formSelect}>
                    <option value="">— Nessun cliente —</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}{c.cognome ? ` ${c.cognome}` : ''}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Nome cliente (testo libero)</label>
                  <input value={form.cliente_nome} onChange={e => setForm(prev => ({ ...prev, cliente_nome: e.target.value }))} placeholder="Es. Mario Rossi" className={styles.formInput} />
                </div>
              </div>
              <div className={styles.formField} style={{ marginBottom: '16px' }}>
                <label>Note (opzionale)</label>
                <input value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Note sull'ordine..." className={styles.formInput} />
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
              <h3 className={styles.modalTitle} style={{ fontSize: '1rem', marginBottom: '12px' }}>Prodotti</h3>
              {scanError && <div className={styles.modalError}>{scanError}</div>}
              {form.righe.map((riga, i) => (
                <div key={i} className={styles.rigaRow}>
                  <select value={riga.prodotto_id} onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)} className={styles.formSelect}>
                    <option value="">— Seleziona prodotto —</option>
                    {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome} — SKU: {p.sku} (disp: {p.quantita})</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setScannerRigaIndex(i); setShowScanner(true) }}
                    title="Scansiona QR / barcode per selezionare prodotto"
                    className={styles.formSelect}
                    style={{ flex: '0 0 auto', padding: '0 10px', cursor: 'pointer' }}
                  >📷</button>
                  <input type="number" min="1" value={riga.quantita} onChange={e => handleRigaChange(i, 'quantita', e.target.value)} placeholder="Qtà" className={styles.formInput} />
                  <input type="number" min="0" step="0.01" value={riga.prezzo_unitario} onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)} placeholder="Prezzo" className={styles.formInput} />
                  <button type="button" onClick={() => removeRiga(i)} disabled={form.righe.length === 1} className={styles.removeRigaBtn} style={{ opacity: form.righe.length === 1 ? 0.3 : 1, cursor: form.righe.length === 1 ? 'not-allowed' : 'pointer' }}>🗑️</button>
                </div>
              ))}
              <button type="button" onClick={addRiga} className={styles.addRigaBtn}>+ Aggiungi Prodotto</button>
              <div className={styles.totaleOrdine}>Totale: {formatCurrency(totaleOrdine)}</div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelBtn}>Annulla</button>
                <button type="submit" disabled={submitting} className={styles.submitBtn}>{submitting ? 'Salvataggio...' : 'Salva come Bozza'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Tracking Edit Modal */}
      {trackingModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: '400px' }}>
            <h3 className={styles.modalTitle}>✏️ Modifica Tracking — {trackingModal.numero_ordine}</h3>
            <div className={styles.formField} style={{ marginBottom: '12px' }}>
              <label>Corriere</label>
              <select value={trackingForm.corriere} onChange={e => setTrackingForm(prev => ({ ...prev, corriere: e.target.value }))} className={styles.formSelect}>
                <option value="">— Nessun corriere —</option>
                {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className={styles.formField} style={{ marginBottom: '16px' }}>
              <label>Numero Tracking</label>
              <input value={trackingForm.tracking_number} onChange={e => setTrackingForm(prev => ({ ...prev, tracking_number: e.target.value }))} placeholder="Codice tracking..." className={styles.formInput} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setTrackingModal(null)} className={styles.cancelBtn} disabled={trackingLoading}>Annulla</button>
              <button
                onClick={async () => {
                  setTrackingLoading(true)
                  try {
                    await ordiniAPI.updateTracking(trackingModal.id, {
                      corriere: trackingForm.corriere || null,
                      tracking_number: trackingForm.tracking_number || null,
                    })
                    setOrdini(prev => prev.map(o => o.id === trackingModal.id ? { ...o, corriere: trackingForm.corriere, tracking_number: trackingForm.tracking_number } : o))
                    setTrackingModal(null)
                  } catch (err) {
                    alert(err?.response?.data?.detail || 'Errore nel salvataggio')
                  } finally {
                    setTrackingLoading(false)
                  }
                }}
                className={styles.submitBtn}
                disabled={trackingLoading}
              >
                {trackingLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
