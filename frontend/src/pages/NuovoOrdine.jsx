import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordiniAPI, prodottiAPI, clientiAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import { CORRIERI } from '../constants/corrieri'
import BarcodeScanner from '../components/BarcodeScanner'
import { normalizeSkuForCode39 } from '../utils/formatters'
import useExternalScanner from '../hooks/useExternalScanner'
import '../styles/shared.css'

const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: '' }

export default function NuovoOrdine() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [clienti, setClienti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [loading, setLoading] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [note, setNote] = useState('')
  const [corriere, setCorriere] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [righe, setRighe] = useState([{ ...emptyRiga }])

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showScanner, setShowScanner] = useState(false)
  const [scannerRigaIndex, setScannerRigaIndex] = useState(null)
  const [scanError, setScanError] = useState('')
  const scanErrorTimerRef = useRef(null)

  useEffect(() => () => { if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current) }, [])

  useEffect(() => {
    Promise.all([
      clientiAPI.getAll(),
      prodottiAPI.getAll({ limit: 500 }),
    ])
      .then(([c, p]) => {
        setClienti(c.data)
        setProdotti(p.data)
      })
      .catch(() => setError('Errore nel caricamento dei dati'))
      .finally(() => setLoading(false))
  }, [])

  const totale = righe.reduce((sum, r) => {
    const qty = parseFloat(r.quantita) || 0
    const price = parseFloat(r.prezzo_unitario) || 0
    return sum + qty * price
  }, 0)

  const handleRigaChange = useCallback((index, field, value) => {
    setRighe(prev => prev.map((r, i) => {
      if (i !== index) return r
      const next = { ...r, [field]: value }
      if (field === 'prodotto_id') {
        const prodotto = prodotti.find(p => String(p.id) === String(value))
        if (prodotto) {
          next.prezzo_unitario = prodotto.prezzo_vendita ?? ''
        }
      }
      return next
    }))
  }, [prodotti])

  const addRiga = () => setRighe([...righe, { ...emptyRiga }])

  const removeRiga = (index) => {
    if (righe.length === 1) return
    setRighe(righe.filter((_, i) => i !== index))
  }

  const handleScanWithIndex = useCallback(async (value, rigaIndex) => {
    let prodotto = null
    if (/^prodotto:\d+$/i.test(value)) {
      const id = parseInt(value.split(':')[1])
      prodotto = prodotti.find(p => p.id === id)
      if (!prodotto) {
        prodottiAPI.getById(id)
          .then(res => {
            if (!res.data?.id) throw new Error('not found')
            handleRigaChange(rigaIndex, 'prodotto_id', String(res.data.id))
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
    if (!prodotto) {
      try {
        const res = await prodottiAPI.lookupByBarcode(value)
        if (res.data?.id) prodotto = res.data
      } catch (_) {}
    }
    if (prodotto) {
      handleRigaChange(rigaIndex, 'prodotto_id', String(prodotto.id))
    } else {
      setScanError(`Prodotto non trovato per il codice: "${value}"`)
      if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current)
      scanErrorTimerRef.current = setTimeout(() => setScanError(''), 4000)
    }
    setScannerRigaIndex(null)
  }, [prodotti, handleRigaChange])

  const handleScan = (value) => {
    setShowScanner(false)
    if (scannerRigaIndex === null) return
    handleScanWithIndex(value, scannerRigaIndex)
  }

  const handleExternalScan = useCallback((value) => {
    const emptyIndex = righe.findIndex(r => !r.prodotto_id)
    const targetIndex = emptyIndex !== -1 ? emptyIndex : righe.length
    if (emptyIndex === -1) {
      setRighe(prev => [...prev, { ...emptyRiga }])
    }
    setScannerRigaIndex(targetIndex)
    handleScanWithIndex(value, targetIndex)
  }, [righe, handleScanWithIndex])

  useExternalScanner({
    onScan: handleExternalScan,
    enabled: !showScanner,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const righeValide = righe.filter(r => r.prodotto_id)
    if (righeValide.length === 0) {
      setError('Aggiungi almeno un prodotto all\'ordine.')
      return
    }

    const payload = {
      cliente_id: clienteId ? parseInt(clienteId, 10) : null,
      cliente_nome: clienteNome || null,
      note: note || null,
      corriere: corriere || null,
      tracking_number: trackingNumber || null,
      righe: righeValide.map(r => ({
        prodotto_id: parseInt(r.prodotto_id, 10),
        quantita: parseInt(r.quantita, 10),
        prezzo_unitario: parseFloat(r.prezzo_unitario) || 0,
      })),
    }

    setSubmitting(true)
    try {
      await ordiniAPI.create(payload)
      navigate('/ordini')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nella creazione dell\'ordine.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-section">
          <button onClick={() => navigate('/ordini')} className="btn-back">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Ordini
          </button>
          <div className="page-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Nuovo Ordine</h1>
            <p className="page-subtitle">Crea un nuovo ordine cliente</p>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Caricamento dati...</div>}

      {error && <div className="error-banner">{error}</div>}

      {!loading && (
        <form onSubmit={handleSubmit}>
          {/* Cliente */}
          <div className="card section-card">
            <h2 className="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Cliente
            </h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Seleziona cliente</label>
                <select
                  value={clienteId}
                  onChange={e => {
                    setClienteId(e.target.value)
                    if (e.target.value) {
                      const c = clienti.find(cl => String(cl.id) === e.target.value)
                      if (c) setClienteNome(c.nome || '')
                    } else {
                      setClienteNome('')
                    }
                  }}
                  className="form-input"
                >
                  <option value="">-- Nessun cliente selezionato --</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nome cliente (testo libero)</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={e => setClienteNome(e.target.value)}
                  placeholder="Es. Mario Rossi"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Prodotti */}
          <div className="card section-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                Prodotti
              </h2>
              <span
                title={showScanner ? 'Scanner hardware in pausa (modale aperta)' : 'Scanner hardware attivo — punta lo scanner su un barcode per aggiungere il prodotto'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: '0.78rem', fontWeight: 600, padding: '4px 9px',
                  borderRadius: 6,
                  backgroundColor: showScanner ? '#fce4ec' : '#e8f5e9',
                  color: showScanner ? '#c62828' : '#2e7d32',
                }}
              >
                <span>●</span>
                {showScanner ? 'Scanner in pausa' : '🔌 Scanner attivo'}
              </span>
            </div>

            {scanError && <div className="error-banner">{scanError}</div>}

            {righe.map((riga, i) => {
              const prodottoSel = prodotti.find(p => String(p.id) === String(riga.prodotto_id))
              const subtotale = (parseFloat(riga.quantita) || 0) * (parseFloat(riga.prezzo_unitario) || 0)

              return (
                <div key={i} className="product-row">
                  <div className="form-group product-select-group">
                    <label className="form-label">Prodotto *</label>
                    <div className="input-with-button">
                      <select
                        required
                        value={riga.prodotto_id}
                        onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)}
                        className="form-input"
                      >
                        <option value="">-- Seleziona prodotto --</option>
                        {prodotti.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nome} — SKU: {p.sku} (disp: {p.quantita ?? 0})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => { setScannerRigaIndex(i); setShowScanner(true) }}
                        title="Scansiona QR / barcode"
                        className="btn-icon btn-icon-blue"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="form-group product-qty-group">
                    <label className="form-label">Quantita *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={riga.quantita}
                      onChange={e => handleRigaChange(i, 'quantita', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group product-price-group">
                    <label className="form-label">Prezzo unit. *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={riga.prezzo_unitario}
                      onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)}
                      placeholder={prodottoSel ? String(prodottoSel.prezzo_vendita ?? '') : '0.00'}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group product-subtotal-group">
                    <label className="form-label">Subtotale</label>
                    <span className="subtotal-value">{'\u20AC'}{subtotale.toFixed(2)}</span>
                  </div>

                  <div className="form-group product-remove-group">
                    <button
                      type="button"
                      onClick={() => removeRiga(i)}
                      disabled={righe.length === 1}
                      className={`btn-icon ${righe.length === 1 ? 'btn-icon-disabled' : 'btn-icon-red'}`}
                      title="Rimuovi riga"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}

            <button type="button" onClick={addRiga} className="btn-secondary add-product-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Aggiungi prodotto
            </button>

            {/* Totale */}
            <div className="order-total">
              <span className="order-total-label">Totale ordine:</span>
              <span className="order-total-value">{'\u20AC'}{totale.toFixed(2)}</span>
            </div>
          </div>

          {/* Spedizione */}
          <div className="card section-card">
            <h2 className="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              Spedizione (opzionale)
            </h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Corriere</label>
                <select
                  value={corriere}
                  onChange={e => setCorriere(e.target.value)}
                  className="form-input"
                >
                  <option value="">— Nessun corriere —</option>
                  {CORRIERI.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tracking spedizione</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="Numero tracking..."
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="card section-card">
            <h2 className="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Note
            </h2>
            <div className="form-group">
              <label className="form-label">Note (opzionale)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Note aggiuntive sull'ordine..."
                className="form-input form-textarea"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/ordini')} className="btn-secondary">
              Annulla
            </button>
            <button type="submit" disabled={submitting} className="btn-success">
              {submitting ? 'Creazione in corso...' : 'Crea Ordine'}
            </button>
          </div>
        </form>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => { setShowScanner(false); setScannerRigaIndex(null) }}
        />
      )}
    </div>
  )
}
