import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornitureAPI, fornitoriAPI, prodottiAPI, categorieAPI, ubicazioniAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_FORNITURA_COLORS } from '../constants/colors'
import { CORRIERI } from '../constants/corrieri'
import { formatDate, formatCurrency } from '../utils/formatters'
import { generateSKU, STATO_MAP, LINGUA_MAP } from '../utils/skuGenerator'
import { normalizeSkuForCode39 } from '../utils/formatters'
import BarcodeScanner from '../components/BarcodeScanner'
import styles from './Forniture.module.css'

const STATI = ['bozza', 'confermato', 'spedito', 'ricevuto', 'annullato']

const PAGE_SIZE = 50
const emptyRiga = { tipo_voce: 'prodotto', prodotto_id: '', descrizione: '', quantita: 1, prezzo_unitario: 0 }
const emptyNuovoProdottoForm = {
  nome: '', descrizione: '', stato_conservazione: '', lingua: '',
  categoria_id: '', ubicazione_id: '',
  quantita: 1, quantita_minima: 0,
  prezzo_acquisto: '', prezzo_vendita: '',
  skuManuale: false, skuManualeValore: '',
}

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
  const [nuovoProdottoRigaIndex, setNuovoProdottoRigaIndex] = useState(null)
  const [nuovoProdottoForm, setNuovoProdottoForm] = useState(emptyNuovoProdottoForm)
  const [nuovoProdottoError, setNuovoProdottoError] = useState('')
  const [nuovoProdottoSaving, setNuovoProdottoSaving] = useState(false)
  const [skuGenerato, setSkuGenerato] = useState('')
  const [categorie, setCategorie] = useState([])
  const [ubicazioni, setUbicazioni] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [scannerRigaIndex, setScannerRigaIndex] = useState(null)
  const [scanError, setScanError] = useState('')
  const scanErrorTimerRef = useRef(null)

  useEffect(() => () => { if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current) }, [])

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
    categorieAPI.getAll().then(r => setCategorie(r.data)).catch(() => {})
    ubicazioniAPI.getAll().then(r => setUbicazioni(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (nuovoProdottoForm.skuManuale) return
    const gen = generateSKU(nuovoProdottoForm.nome, nuovoProdottoForm.stato_conservazione, nuovoProdottoForm.lingua)
    setSkuGenerato(normalizeSkuForCode39(gen))
  }, [nuovoProdottoForm.nome, nuovoProdottoForm.stato_conservazione, nuovoProdottoForm.lingua, nuovoProdottoForm.skuManuale])

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

  const handleScan = (value) => {
    setShowScanner(false)
    if (scannerRigaIndex !== null) {
      let prodotto = null
      if (/^prodotto:\d+$/i.test(value)) {
        const id = parseInt(value.split(':')[1])
        prodotto = prodotti.find(p => p.id === id)
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
      fetchForniture({ search: value, page: 1 })
      setPage(1)
    }
  }

  const openNewModal = () => {
    setForm({ fornitore_id: '', fornitore_nome: '', note: '', corriere: '', tracking_number: '', righe: [{ ...emptyRiga }] })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormError('')
    setNuovoProdottoRigaIndex(null)
    setNuovoProdottoForm({ ...emptyNuovoProdottoForm })
    setSkuGenerato('')
    setNuovoProdottoError('')
  }

  const handleRigaChange = (index, field, value) => {
    setForm(prev => {
      const righe = [...prev.righe]
      righe[index] = { ...righe[index], [field]: value }
      if (field === 'prodotto_id') {
        const prod = prodotti.find(p => p.id === parseInt(value))
        if (prod) righe[index].prezzo_unitario = prod.prezzo_acquisto || 0
      }
      if (field === 'tipo_voce' && value === 'packaging') {
        righe[index].prodotto_id = ''
        righe[index].descrizione = ''
      } else if (field === 'tipo_voce' && value === 'prodotto') {
        righe[index].descrizione = ''
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

  const handleSalvaNuovoProdotto = async (rigaIndex) => {
    setNuovoProdottoError('')
    if (!nuovoProdottoForm.nome.trim()) {
      setNuovoProdottoError('Il nome è obbligatorio')
      return
    }
    const skuFinale = nuovoProdottoForm.skuManuale ? nuovoProdottoForm.skuManualeValore : skuGenerato
    if (!skuFinale || !skuFinale.trim()) {
      setNuovoProdottoError('SKU non disponibile: inserisci un nome oppure attiva SKU manuale e inseriscilo manualmente')
      return
    }
    setNuovoProdottoSaving(true)
    try {
      const res = await prodottiAPI.create({
        nome: nuovoProdottoForm.nome.trim(),
        descrizione: nuovoProdottoForm.descrizione.trim() || null,
        sku: skuFinale.trim(),
        stato_conservazione: nuovoProdottoForm.stato_conservazione || null,
        lingua: nuovoProdottoForm.lingua || null,
        categoria_id: nuovoProdottoForm.categoria_id ? parseInt(nuovoProdottoForm.categoria_id) : null,
        ubicazione_id: nuovoProdottoForm.ubicazione_id ? parseInt(nuovoProdottoForm.ubicazione_id) : null,
        quantita: parseInt(nuovoProdottoForm.quantita) || 0,
        quantita_minima: parseInt(nuovoProdottoForm.quantita_minima) || 0,
        prezzo_acquisto: nuovoProdottoForm.prezzo_acquisto ? parseFloat(nuovoProdottoForm.prezzo_acquisto) : null,
        prezzo_vendita: nuovoProdottoForm.prezzo_vendita ? parseFloat(nuovoProdottoForm.prezzo_vendita) : null,
      })
      const nuovoProdotto = res.data
      setProdotti(prev => [...prev, nuovoProdotto])
      setForm(prev => {
        const righe = [...prev.righe]
        righe[rigaIndex] = {
          ...righe[rigaIndex],
          prodotto_id: String(nuovoProdotto.id),
          prezzo_unitario: nuovoProdotto.prezzo_acquisto || 0,
        }
        return { ...prev, righe }
      })
      setNuovoProdottoRigaIndex(null)
      setNuovoProdottoForm({ ...emptyNuovoProdottoForm })
      setSkuGenerato('')
    } catch (err) {
      setNuovoProdottoError(err?.response?.data?.detail || 'Errore nella creazione del prodotto')
    } finally {
      setNuovoProdottoSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const righe = form.righe.filter(r => r.tipo_voce === 'packaging' ? (r.descrizione || '').trim() : r.prodotto_id)
    if (!righe.length) { setFormError('Aggiungi almeno un prodotto o voce packaging'); return }
    setSubmitting(true)
    try {
      const payload = {
        fornitore_id: form.fornitore_id ? parseInt(form.fornitore_id) : null,
        fornitore_nome: form.fornitore_nome || null,
        note: form.note || null,
        corriere: form.corriere || null,
        tracking_number: form.tracking_number || null,
        righe: righe.map(r => ({
          tipo_voce: r.tipo_voce || 'prodotto',
          prodotto_id: r.tipo_voce === 'packaging' ? null : (r.prodotto_id ? parseInt(r.prodotto_id) : null),
          descrizione: r.descrizione || null,
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
        <button
          type="button"
          onClick={() => { setScannerRigaIndex(null); setShowScanner(true) }}
          title="Scansiona QR / barcode per cercare"
          className={styles.searchBtn}
          style={{ padding: '0 12px' }}
        >📷</button>
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
                      <div className={`${styles.tracking} ${styles.trackingRow}`}>
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
                          className={styles.editTrackingBtn}
                        >✏️</button>
                      </div>
                    ) : (
                      <div className={`${styles.tracking} ${styles.trackingRow}`}>
                        <span className={styles.trackingEmpty}>—</span>
                        <button
                          onClick={() => {
                            setTrackingFornituraModal(fornitura)
                            setTrackingFornituraForm({ corriere: fornitura.corriere || '', tracking_number: fornitura.tracking_number || '' })
                          }}
                          title="Modifica tracking"
                          className={styles.editTrackingBtn}
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
              <h3 className={styles.modalSubTitle}>Voci Fornitura</h3>
              {scanError && <div className={styles.modalError}>{scanError}</div>}
              {form.righe.map((riga, i) => (
                <div key={i} className={styles.rigaRow} style={{ flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                    <select
                      value={riga.tipo_voce || 'prodotto'}
                      onChange={e => handleRigaChange(i, 'tipo_voce', e.target.value)}
                      className={styles.formSelect}
                      style={{ flex: '0 0 auto', width: '220px', backgroundColor: riga.tipo_voce === 'packaging' ? '#fff8e1' : undefined }}
                    >
                      <option value="prodotto">📦 Prodotto magazzino</option>
                      <option value="packaging">🏷️ Packaging / Logistica</option>
                    </select>
                    {riga.tipo_voce === 'packaging' ? (
                      <input
                        value={riga.descrizione}
                        onChange={e => handleRigaChange(i, 'descrizione', e.target.value)}
                        placeholder="Descrizione (es. Nastro adesivo, DHL Express...)"
                        className={styles.formInput}
                        style={{ flex: 1 }}
                        required
                      />
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select value={riga.prodotto_id} onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)} className={styles.formSelect} style={{ flex: 1 }}>
                            <option value="">— Seleziona prodotto —</option>
                            {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome} (SKU: {p.sku})</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => { setScannerRigaIndex(i); setShowScanner(true) }}
                            title="Scansiona QR / barcode per selezionare prodotto"
                            style={{ padding: '6px 10px', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#1565c0' }}
                          >
                            📷
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNuovoProdottoRigaIndex(i)
                              setNuovoProdottoForm({ ...emptyNuovoProdottoForm })
                              setSkuGenerato('')
                              setNuovoProdottoError('')
                            }}
                            style={{ padding: '6px 10px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#2e7d32' }}
                            title="Crea nuovo prodotto"
                          >
                            ＋ Nuovo
                          </button>
                        </div>
                        {nuovoProdottoRigaIndex === i && (
                          <div style={{ fontSize: '0.8rem', color: '#2e7d32', fontStyle: 'italic' }}>
                            Compilare il form nel pannello sopra...
                          </div>
                        )}
                      </div>
                    )}
                    <input type="number" min="1" value={riga.quantita} onChange={e => handleRigaChange(i, 'quantita', e.target.value)} placeholder="Qtà" className={styles.formInput} style={{ width: '70px', flex: '0 0 auto' }} />
                    <input type="number" min="0" step="0.01" value={riga.prezzo_unitario} onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)} placeholder="Prezzo" className={styles.formInput} style={{ width: '90px', flex: '0 0 auto' }} />
                    <button type="button" onClick={() => removeRiga(i)} disabled={form.righe.length === 1} className={styles.removeRigaBtn} style={{ opacity: form.righe.length === 1 ? 0.3 : 1, cursor: form.righe.length === 1 ? 'not-allowed' : 'pointer' }}>🗑️</button>
                  </div>
                  {riga.tipo_voce === 'packaging' && (
                    <div style={{ fontSize: '0.8rem', color: '#e65100', backgroundColor: '#fff3e0', padding: '4px 8px', borderRadius: '4px', width: '100%' }}>
                      ⚠️ Questa voce verrà registrata come costo e non influenzerà le giacenze
                    </div>
                  )}
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

      {/* Nuovo Prodotto Modal */}
      {nuovoProdottoRigaIndex !== null && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 className={styles.modalTitle}>🆕 Nuovo prodotto</h2>
            {nuovoProdottoError && (
              <div className={styles.modalError}>{nuovoProdottoError}</div>
            )}
            <div className={styles.formGrid}>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Nome prodotto *</label>
                <input
                  value={nuovoProdottoForm.nome}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome prodotto"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Descrizione</label>
                <textarea
                  value={nuovoProdottoForm.descrizione}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, descrizione: e.target.value }))}
                  placeholder="Descrizione opzionale..."
                  className={styles.formInput}
                  rows={2}
                />
              </div>
              <div className={styles.formField}>
                <label>Stato di conservazione</label>
                <select
                  value={nuovoProdottoForm.stato_conservazione}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, stato_conservazione: e.target.value }))}
                  className={styles.formSelect}
                >
                  <option value="">— Seleziona —</option>
                  {Object.keys(STATO_MAP).map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Altro">Altro</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Lingua</label>
                <select
                  value={nuovoProdottoForm.lingua}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, lingua: e.target.value }))}
                  className={styles.formSelect}
                >
                  <option value="">— Seleziona —</option>
                  {Object.keys(LINGUA_MAP).map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="Altra">Altra</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>Categoria</label>
                <select
                  value={nuovoProdottoForm.categoria_id}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, categoria_id: e.target.value }))}
                  className={styles.formSelect}
                >
                  <option value="">— Nessuna categoria —</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className={styles.formField}>
                <label>Ubicazione</label>
                <select
                  value={nuovoProdottoForm.ubicazione_id}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, ubicazione_id: e.target.value }))}
                  className={styles.formSelect}
                >
                  <option value="">— Nessuna ubicazione —</option>
                  {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className={styles.formField}>
                <label>Quantità</label>
                <input
                  type="number" min="0"
                  value={nuovoProdottoForm.quantita}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, quantita: e.target.value }))}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label>Quantità minima</label>
                <input
                  type="number" min="0"
                  value={nuovoProdottoForm.quantita_minima}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, quantita_minima: e.target.value }))}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label>Prezzo acquisto (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={nuovoProdottoForm.prezzo_acquisto}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, prezzo_acquisto: e.target.value }))}
                  placeholder="0.00"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label>Prezzo vendita (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={nuovoProdottoForm.prezzo_vendita}
                  onChange={e => setNuovoProdottoForm(prev => ({ ...prev, prezzo_vendita: e.target.value }))}
                  placeholder="0.00"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>SKU generato automaticamente</label>
                {!nuovoProdottoForm.skuManuale ? (
                  <input
                    value={skuGenerato}
                    readOnly
                    placeholder="Verrà generato da nome, stato e lingua..."
                    className={styles.formInput}
                    style={{ backgroundColor: '#f5f5f5', color: skuGenerato ? '#1b5e20' : '#999', fontWeight: skuGenerato ? 600 : 400 }}
                  />
                ) : (
                  <input
                    value={nuovoProdottoForm.skuManualeValore}
                    onChange={e => setNuovoProdottoForm(prev => ({ ...prev, skuManualeValore: e.target.value }))}
                    placeholder="Inserisci SKU manuale..."
                    className={styles.formInput}
                  />
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={nuovoProdottoForm.skuManuale}
                    onChange={e => setNuovoProdottoForm(prev => ({ ...prev, skuManuale: e.target.checked, skuManualeValore: '' }))}
                  />
                  SKU manuale
                </label>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setNuovoProdottoRigaIndex(null)
                  setNuovoProdottoForm({ ...emptyNuovoProdottoForm })
                  setSkuGenerato('')
                  setNuovoProdottoError('')
                }}
                className={styles.cancelBtn}
                disabled={nuovoProdottoSaving}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => handleSalvaNuovoProdotto(nuovoProdottoRigaIndex)}
                disabled={nuovoProdottoSaving}
                className={styles.submitBtn}
              >
                {nuovoProdottoSaving ? 'Salvataggio...' : '✔ Salva prodotto'}
              </button>
            </div>
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
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
