import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordiniAPI, clientiAPI, prodottiAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_ORDINE_COLORS } from '../constants/colors'
import { formatDate, formatCurrency } from '../utils/formatters'
import styles from './Ordini.module.css'

const STATI = ['bozza', 'confermato', 'spedito', 'completato', 'annullato']

const CORRIERI = [
  { value: 'BRT',                label: 'BRT',                url: (n) => `https://vas.brt.it/vas/sped_det_show.hsm?referer=sped_numspe_input.hsm&Nspedizione=${n}` },
  { value: 'DHL',                label: 'DHL',                url: (n) => `https://www.dhl.com/it-it/home/tracking.html?tracking-id=${n}` },
  { value: 'SDA',                label: 'SDA',                url: (n) => `https://www.sda.it/wps/portal/Servizi-per-te/Cerca-spedizione?spedizione=${n}` },
  { value: 'GLS',                label: 'GLS',                url: (n) => `https://gls-group.com/track/${n}` },
  { value: 'Poste Italiane',     label: 'Poste Italiane',     url: (n) => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${n}` },
  { value: 'UPS',                label: 'UPS',                url: (n) => `https://www.ups.com/track?tracknum=${n}` },
  { value: 'FedEx',              label: 'FedEx',              url: (n) => `https://www.fedex.com/fedextrack/?tracknumbers=${n}` },
  { value: 'Amazon Logistics',   label: 'Amazon Logistics',   url: (n) => `https://track.amazon.it/tracking/${n}` },
  { value: 'TNT',                label: 'TNT',                url: (n) => `https://www.tnt.com/express/it_it/site/tracking.html?searchType=CON&cons=${n}` },
  { value: 'InPost',             label: 'InPost',             url: (n) => `https://inpost.it/tracking?number=${n}` },
  { value: 'Altro',              label: 'Altro',              url: () => null },
]

const PAGE_SIZE = 50
const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }

export default function Ordini() {
  const navigate = useNavigate()
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
  const [form, setForm] = useState({ cliente_id: '', cliente_nome: '', note: '', righe: [{ ...emptyRiga }] })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const openNewModal = () => {
    setForm({ cliente_id: '', cliente_nome: '', note: '', righe: [{ ...emptyRiga }] })
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🛒 Ordini</h1>
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
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Cerca per N° ordine o cliente..."
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
        ) : ordini.length === 0 ? (
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
              {ordini.map(ordine => (
                <tr key={ordine.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.ordineNum}`}>{ordine.numero_ordine}</td>
                  <td className={styles.td}>{ordine.cliente_nome || '—'}</td>
                  <td className={styles.td}>
                    <StatoBadge value={ordine.stato} colors={STATO_ORDINE_COLORS} capitalize />
                  </td>
                  <td className={styles.td}>
                    {ordine.tracking_number ? (
                      <div className={styles.tracking}>
                        <span className={styles.trackingCorriere}>{ordine.corriere || '—'}</span>
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
                      </div>
                    ) : (
                      <span className={styles.trackingEmpty}>—</span>
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
              <h3 className={styles.modalTitle} style={{ fontSize: '1rem', marginBottom: '12px' }}>Prodotti</h3>
              {form.righe.map((riga, i) => (
                <div key={i} className={styles.rigaRow}>
                  <select value={riga.prodotto_id} onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)} className={styles.formSelect}>
                    <option value="">— Seleziona prodotto —</option>
                    {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome} (disp: {p.quantita})</option>)}
                  </select>
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
    </div>
  )
}
