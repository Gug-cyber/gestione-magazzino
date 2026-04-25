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

const SCAN_ERROR_TIMEOUT_MS = 4000
const FOCUS_DELAY_MS = 60

function BarcodeInputPanel({ onConfirm, onCancel, onOpenCamera, scanError, clearScanError }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => { if (inputRef.current) inputRef.current.focus() }, FOCUS_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) onConfirm(value.trim())
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-lg, 10px)',
        padding: '28px',
        maxWidth: '440px',
        width: '90%',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h3 style={{ margin: '0 0 4px', color: 'var(--color-text)', fontSize: '1rem', fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
            <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
            <rect x="3" y="16" width="5" height="5"/>
            <path d="M21 16h-3a2 2 0 00-2 2v3M21 21v.01M12 7v3a2 2 0 01-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1a2 2 0 012 2v1"/>
          </svg>
          Scansiona barcode / QR
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Scansiona con scanner USB oppure digita il codice manualmente — o apri la webcam
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={e => { setValue(e.target.value); if (clearScanError) clearScanError() }}
          onKeyDown={handleKeyDown}
          placeholder="Barcode / SKU / QR code..."
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            height: '44px', padding: '0 14px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius, 6px)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text)',
            fontSize: '1rem',
            marginBottom: '10px',
            outline: 'none',
          }}
          autoComplete="off"
        />
        {scanError && (
          <div style={{
            color: 'var(--color-danger)', fontSize: '0.85rem',
            padding: '8px 12px', background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--border-radius, 6px)',
            marginBottom: '12px',
          }}>
            {scanError}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { if (value.trim()) onConfirm(value.trim()) }}
            disabled={!value.trim()}
            style={{
              flex: 1, height: '40px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--border-radius, 6px)',
              cursor: value.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 500, fontSize: '0.875rem',
              opacity: value.trim() ? 1 : 0.5,
              transition: 'opacity 0.15s',
            }}
          >
            Conferma
          </button>
          <button
            type="button"
            onClick={onOpenCamera}
            style={{
              flex: 1, height: '40px',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius, 6px)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontSize: '0.875rem', fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Webcam
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: '40px', padding: '0 16px',
              background: 'var(--color-surface)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius, 6px)',
              cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

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
        if (!prodotto) {
          prodottiAPI.getById(id)
            .then(res => {
              if (!res.data?.id) throw new Error('not found')
              handleRigaChange(scannerRigaIndex, 'prodotto_id', String(res.data.id))
              setScannerRigaIndex(null)
            })
            .catch(() => {
              setScanError(`Prodotto non trovato per il codice: "${value}"`)
              if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current)
              scanErrorTimerRef.current = setTimeout(() => setScanError(''), SCAN_ERROR_TIMEOUT_MS)
            })
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
        setScannerRigaIndex(null)
      } else {
        setScanError(`Prodotto non trovato per il codice: "${value}"`)
        if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current)
        scanErrorTimerRef.current = setTimeout(() => setScanError(''), SCAN_ERROR_TIMEOUT_MS)
      }
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
        barcode: nuovoProdottoForm.barcode ? nuovoProdottoForm.barcode.trim() || null : null,
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
        <div>
          <h1 className={styles.title}>🚚 Forniture &amp; Approvvigionamenti</h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Traccia gli acquisti dai fornitori</p>
        </div>
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
        {/* Search + Scanner row */}
        <div className={styles.filterInputWrapper}>
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

      {/* Mobile Cards */}
      <div className={styles.mobileCards}>
        {loading ? (
          <div className={styles.emptyMsg}>Caricamento...</div>
        ) : forniture.length === 0 ? (
          <div className={styles.emptyMsg}>Nessuna fornitura trovata</div>
        ) : forniture.map(fornitura => (
          <div key={fornitura.id} className={styles.mobileCard}>
            <div className={styles.mobileCardHeader}>
              <div className={styles.mobileCardTitle}>
                <span className={styles.mobileCardNumber}>{fornitura.numero_fornitura}</span>
                <span className={styles.mobileCardFornitore}>{fornitura.fornitore_nome || 'Fornitore non specificato'}</span>
              </div>
              <div className={styles.mobileCardBadge}>
                <StatoBadge value={fornitura.stato} colors={STATO_FORNITURA_COLORS} capitalize />
              </div>
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardLabel}>Prodotti</span>
              <span className={styles.mobileCardValue}>{fornitura.righe?.length || 0}</span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardLabel}>Totale</span>
              <span className={styles.mobileCardValueSuccess}>{formatCurrency(fornitura.totale)}</span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className={styles.mobileCardLabel}>Data</span>
              <span className={styles.mobileCardValue}>{formatDate(fornitura.data_fornitura)}</span>
            </div>
            {fornitura.tracking_number && (
              <div className={styles.mobileCardRow}>
                <span className={styles.mobileCardLabel}>Tracking</span>
                <span className={styles.mobileCardValue} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {fornitura.corriere}: {fornitura.tracking_number}
                </span>
              </div>
            )}
            <div className={styles.mobileCardActions}>
              <button 
                onClick={() => navigate(`/forniture/${fornitura.id}`)} 
                className={styles.mobileDetailBtn}
              >
                Vedi Dettaglio
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table - Desktop Only */}
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
                        <div className={styles.trackingButtonContainer}>
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
                          {fornitura.corriere && fornitura.corriere !== 'Altro' && fornitura.tracking_number && (
                            <button
                              onClick={() => navigate(`/tracking/${encodeURIComponent(fornitura.corriere)}/${encodeURIComponent(fornitura.tracking_number)}`)}
                              title="Storico tracking"
                              className={styles.editTrackingBtn}
                            >📦</button>
                          )}
                          <button
                            onClick={() => {
                              setTrackingFornituraModal(fornitura)
                              setTrackingFornituraForm({ corriere: fornitura.corriere || '', tracking_number: fornitura.tracking_number || '' })
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
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0 20px' }} />
              <h3 className={styles.modalSubTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1" ry="1"/>
                </svg>
                Voci Fornitura
              </h3>
              {scanError && <div className={styles.modalError}>{scanError}</div>}
              {form.righe.map((riga, i) => (
                <div key={i} className={styles.rigaCard}>
                  {/* Top row: tipo voce + prodotto/descrizione + action buttons */}
                  <div className={styles.rigaTop}>
                    <select
                      value={riga.tipo_voce || 'prodotto'}
                      onChange={e => handleRigaChange(i, 'tipo_voce', e.target.value)}
                      className={styles.formSelect}
                      style={{ flex: '0 0 auto', minWidth: '180px' }}
                    >
                      <option value="prodotto">📦 Prodotto magazzino</option>
                      <option value="packaging">🏷️ Packaging / Logistica</option>
                      <option value="altro">📋 Altro costo</option>
                    </select>
                    {riga.tipo_voce === 'packaging' || riga.tipo_voce === 'altro' ? (
                      <input
                        value={riga.descrizione}
                        onChange={e => handleRigaChange(i, 'descrizione', e.target.value)}
                        placeholder={riga.tipo_voce === 'packaging' ? 'Es. Nastro adesivo, DHL Express...' : 'Descrizione costo...'}
                        className={styles.formInput}
                        style={{ flex: 1, minWidth: 0 }}
                        required
                      />
                    ) : (
                      <select
                        value={riga.prodotto_id}
                        onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)}
                        className={styles.formSelect}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <option value="">— Seleziona prodotto —</option>
                        {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    )}
                    {riga.tipo_voce !== 'packaging' && riga.tipo_voce !== 'altro' && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setScannerRigaIndex(i); setScanError('') }}
                          className={styles.scanBarcodeBtn}
                          title="Scansiona barcode o QR per trovare il prodotto"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 5v-2h6v2H3zm12-2v2h6v-2h-6zM3 19v2h6v-2H3zm12 2v-2h6v2h-6zM5 8H1v8h4V8zm14 0h-4v8h4V8zM9 3H7v2h2V3zm2 0h-2v2h2V3zm2 0h-2v2h2V3zm2 2h-2V3h-2v2h2zm-6 4H7v6h2V9zm6 0h-2v6h2V9z"/>
                          </svg>
                          Scansiona
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNuovoProdottoRigaIndex(i)
                            setNuovoProdottoForm({ ...emptyNuovoProdottoForm })
                            setSkuGenerato('')
                            setNuovoProdottoError('')
                          }}
                          className={styles.newProductBtn}
                          title="Crea nuovo prodotto"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Nuovo
                        </button>
                      </>
                    )}
                  </div>
                  {/* Product SKU/availability info */}
                  {riga.tipo_voce !== 'packaging' && riga.tipo_voce !== 'altro' && riga.prodotto_id && (() => {
                    const sel = prodotti.find(p => String(p.id) === String(riga.prodotto_id))
                    return sel ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: '10px', paddingLeft: '2px' }}>
                        SKU: {sel.sku} · Disponibile: {sel.quantita}
                      </div>
                    ) : null
                  })()}
                  {/* Packaging/altro warning */}
                  {(riga.tipo_voce === 'packaging' || riga.tipo_voce === 'altro') && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '10px', paddingLeft: '2px' }}>
                      ⚠️ Questa voce verrà registrata come costo e non influenzerà le giacenze
                    </div>
                  )}
                  {/* Bottom row: qty + price + subtotal + delete */}
                  <div className={styles.rigaBottom}>
                    <div className={styles.rigaFieldGroup}>
                      <label className={styles.rigaFieldLabel}>Quantità</label>
                      <input
                        type="number" min="1"
                        value={riga.quantita}
                        onChange={e => handleRigaChange(i, 'quantita', e.target.value)}
                        className={styles.formInput}
                        style={{ width: '88px' }}
                      />
                    </div>
                    <div className={styles.rigaFieldGroup}>
                      <label className={styles.rigaFieldLabel}>Prezzo unitario (€)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={riga.prezzo_unitario}
                        onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)}
                        placeholder="0.00"
                        className={styles.formInput}
                        style={{ width: '120px' }}
                      />
                    </div>
                    <div className={styles.rigaFieldGroup}>
                      <label className={styles.rigaFieldLabel}>Subtotale</label>
                      <div className={styles.rigaSubtotale}>
                        {formatCurrency(Number(riga.quantita) * Number(riga.prezzo_unitario))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRiga(i)}
                      disabled={form.righe.length === 1}
                      className={styles.deleteRigaBtn}
                      title="Rimuovi riga"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addRiga} className={styles.addRigaBtn} style={{ width: '100%', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Aggiungi Riga
              </button>
              <div className={styles.totaleFornitura}>
                <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-muted)', marginRight: '8px' }}>Totale fornitura:</span>
                {formatCurrency(totaleFornitura)}
              </div>
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
      {scannerRigaIndex !== null && !showScanner && (
        <BarcodeInputPanel
          onConfirm={(value) => handleScan(value)}
          onCancel={() => { setScannerRigaIndex(null); setScanError('') }}
          onOpenCamera={() => setShowScanner(true)}
          scanError={scanError}
          clearScanError={() => setScanError('')}
        />
      )}
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
