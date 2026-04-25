import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornitoriAPI, prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { normalizeSkuForCode39 } from '../utils/formatters'
import { useIsMobile } from '../hooks/useIsMobile'
import useExternalScanner from '../hooks/useExternalScanner'
import '../styles/shared.css'

export default function NuovaFornitura() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [fornitori, setFornitori] = useState([])
  const [fornitoreId, setFornitoreId] = useState('')
  const [numeroFornitura, setNumeroFornitura] = useState('')
  const [righe, setRighe] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanFeedback, setScanFeedback] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const feedbackTimer = useRef(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchTimer = useRef(null)
  const searchRef = useRef(null)

  const [nomeManuale, setNomeManuale] = useState('')
  const [skuManuale, setSkuManuale] = useState('')
  const [showScannerSku, setShowScannerSku] = useState(false)
  const [qtaManuale, setQtaManuale] = useState(1)
  const [prezzoManuale, setPrezzoManuale] = useState(0)

  // Scanner fisico → popola campo SKU
  useExternalScanner({
    onScan: (code) => {
      setSkuManuale(normalizeSkuForCode39(code))
    },
    enabled: !showScannerSku,
  })

  useEffect(() => {
    fornitoriAPI.getAll()
      .then(res => setFornitori(res.data || []))
      .catch(() => setFornitori([]))
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearchLoading(true)
      prodottiAPI.getAll({ search: searchQuery, limit: 8 })
        .then(res => {
          const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
          setSearchResults(items)
          setShowSearchResults(true)
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false))
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  const showScanFeedback = (type, message) => {
    clearTimeout(feedbackTimer.current)
    setScanFeedback({ type, message })
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 3000)
  }

  const addProdotto = (prodotto) => {
    setRighe(prev => {
      const idx = prev.findIndex(r => r.prodotto_id === prodotto.id)
      if (idx !== -1) {
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          quantita: updated[idx].quantita + 1,
          subtotale: (updated[idx].quantita + 1) * updated[idx].prezzo_unitario,
        }
        return updated
      }
      const prezzo = prodotto.prezzo_acquisto || 0
      return [...prev, {
        prodotto_id: prodotto.id,
        nome: prodotto.nome,
        sku: prodotto.sku || '',
        quantita: 1,
        prezzo_unitario: prezzo,
        subtotale: prezzo,
      }]
    })
  }

  const handleScan = async (value) => {
    setShowScanner(false)
    setScanLoading(true)
    try {
      const res = await prodottiAPI.lookupByBarcode(value)
      const prodotto = res.data
      addProdotto(prodotto)
      showScanFeedback('success', `${prodotto.nome} aggiunto`)
    } catch (err) {
      if (err.response?.status === 404) {
        showScanFeedback('notfound', `Prodotto non trovato per barcode: ${value}`)
      } else {
        showScanFeedback('error', 'Errore durante la ricerca del prodotto')
      }
    } finally {
      setScanLoading(false)
    }
  }

  const handleAddFromSearch = (prodotto) => {
    addProdotto(prodotto)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    showScanFeedback('success', `${prodotto.nome} aggiunto`)
  }

  const handleAddManuale = () => {
    if (!nomeManuale.trim()) return
    const qta = Math.max(1, parseInt(qtaManuale) || 1)
    const prezzo = Math.max(0, parseFloat(prezzoManuale) || 0)
    setRighe(prev => [...prev, {
      prodotto_id: 'manual_' + Date.now(),
      nome: nomeManuale.trim(),
      sku: skuManuale.trim(),
      quantita: qta,
      prezzo_unitario: prezzo,
      subtotale: qta * prezzo,
    }])
    showScanFeedback('success', `${nomeManuale.trim()} aggiunto`)
    setNomeManuale('')
    setSkuManuale('')
    setQtaManuale(1)
    setPrezzoManuale(0)
  }

  const handleQtyChange = (idx, val) => {
    const qty = Math.max(1, parseInt(val) || 1)
    setRighe(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], quantita: qty, subtotale: qty * updated[idx].prezzo_unitario }
      return updated
    })
  }

  const handlePrezzoChange = (idx, val) => {
    const prezzo = Math.max(0, parseFloat(val) || 0)
    setRighe(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], prezzo_unitario: prezzo, subtotale: updated[idx].quantita * prezzo }
      return updated
    })
  }

  const handleRemoveRiga = (idx) => {
    setRighe(prev => prev.filter((_, i) => i !== idx))
  }

  const handleConferma = () => {
    alert('Funzionalita di salvataggio in arrivo')
  }

  const totaleRighe = righe.length
  const totalePezzi = righe.reduce((sum, r) => sum + r.quantita, 0)
  const totaleImporto = righe.reduce((sum, r) => sum + r.subtotale, 0)
  const canConferma = fornitoreId && righe.length > 0

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/forniture')} className="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Forniture
        </button>
        <div className="page-title-section">
          <div className="page-icon" style={{ width: '40px', height: '40px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Nuova Fornitura</h1>
        </div>
      </div>

      {/* Feedback */}
      {scanFeedback && (
        <div className={`${scanFeedback.type === 'success' ? '' : 'error-banner'}`} style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          background: scanFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : scanFeedback.type === 'notfound' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${scanFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : scanFeedback.type === 'notfound' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: scanFeedback.type === 'success' ? 'var(--success)' : scanFeedback.type === 'notfound' ? 'var(--warning)' : 'var(--danger)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {scanFeedback.message}
        </div>
      )}

      {scanLoading && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontWeight: '600' }}>
          Ricerca prodotto in corso...
        </div>
      )}

      <div className="two-column-layout" style={{ gridTemplateColumns: isMobile ? '1fr' : '320px 1fr' }}>
        {/* Colonna sinistra */}
        <div className="sidebar-cards">
          {/* Card intestazione */}
          <div className="card">
            <h2 className="section-title-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Intestazione Fornitura
            </h2>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Fornitore *</label>
              <select
                value={fornitoreId}
                onChange={e => setFornitoreId(e.target.value)}
                className="form-input"
                style={{ borderColor: fornitoreId ? 'var(--border-primary)' : 'var(--danger)' }}
              >
                <option value="">— Seleziona fornitore —</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.nome || f.ragione_sociale}</option>
                ))}
              </select>
              {!fornitoreId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px', display: 'block' }}>
                  Seleziona un fornitore per procedere
                </span>
              )}
            </div>

            <div>
              <label className="form-label">N° Fornitura (opzionale)</label>
              <input
                type="text"
                value={numeroFornitura}
                onChange={e => setNumeroFornitura(e.target.value)}
                placeholder="es. FRN-2024-001"
                className="form-input"
              />
            </div>
          </div>

          {/* Card scanner */}
          <div className="card">
            <h2 className="section-title-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scansione Barcode
            </h2>
            <button
              onClick={() => setShowScanner(true)}
              disabled={scanLoading}
              className="btn-primary btn-full"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Scansiona Barcode
            </button>
            <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Scansiona il barcode di un prodotto per aggiungerlo alla fornitura
            </p>
          </div>

          {/* Card ricerca */}
          <div className="card">
            <h2 className="section-title-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Cerca Prodotto
            </h2>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nome o SKU prodotto..."
                className="form-input"
              />
              {showSearchResults && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                  maxHeight: '280px', overflowY: 'auto', marginTop: '4px',
                }}>
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddFromSearch(p)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border-primary)',
                        background: 'transparent', cursor: 'pointer',
                        fontSize: '0.9rem', color: 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>{p.nome}</div>
                      {p.sku && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card inserimento manuale */}
          <div className="card">
            <h2 className="section-title-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Inserimento Manuale
            </h2>

            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">Nome prodotto *</label>
              <input type="text" value={nomeManuale} onChange={e => setNomeManuale(e.target.value)} placeholder="es. Carta A4 80g" className="form-input" />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">SKU (opzionale)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={skuManuale} onChange={e => setSkuManuale(e.target.value)} placeholder="es. SKU-001 oppure scansiona →" className="form-input" style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => setShowScannerSku(true)}
                  title="Scansiona barcode o QR code"
                  style={{ padding: '8px 12px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 5v14M7 5v14M11 5v14M15 5v8M19 5v8"/>
                  </svg>
                </button>
              </div>
            </div>

            {showScannerSku && (
              <BarcodeScanner
                onScan={(value) => {
                  setSkuManuale(normalizeSkuForCode39(value))
                  setShowScannerSku(false)
                }}
                onClose={() => setShowScannerSku(false)}
              />
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Quantita</label>
                <input type="number" min="1" value={qtaManuale} onChange={e => setQtaManuale(e.target.value)} className="form-input" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Prezzo unit. (€)</label>
                <input type="number" min="0" step="0.01" value={prezzoManuale} onChange={e => setPrezzoManuale(e.target.value)} className="form-input" />
              </div>
            </div>

            <button onClick={handleAddManuale} disabled={!nomeManuale.trim()} className="btn-success btn-full" style={{ opacity: nomeManuale.trim() ? 1 : 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Aggiungi Prodotto
            </button>
          </div>
        </div>

        {/* Colonna destra: righe fornitura */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="section-title-sm" style={{ margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
                Righe Fornitura
              </h2>
              <span className="badge badge-blue">{totaleRighe} prodotti</span>
            </div>

            {righe.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: '12px' }}>
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
                <p>Nessun prodotto aggiunto</p>
                <p style={{ fontSize: '0.8125rem' }}>Scansiona un barcode o cerca un prodotto per iniziare</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Prodotto</th>
                      <th style={{ width: '80px' }}>Qta</th>
                      <th style={{ width: '100px' }}>Prezzo</th>
                      <th style={{ width: '100px' }}>Subtotale</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r, idx) => (
                      <tr key={r.prodotto_id}>
                        <td>
                          <div className="text-bold">{r.nome}</div>
                          {r.sku && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {r.sku}</div>}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={r.quantita}
                            onChange={e => handleQtyChange(idx, e.target.value)}
                            className="form-input"
                            style={{ width: '60px', padding: '4px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={r.prezzo_unitario}
                            onChange={e => handlePrezzoChange(idx, e.target.value)}
                            className="form-input"
                            style={{ width: '80px', padding: '4px 8px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          €{r.subtotale.toFixed(2)}
                        </td>
                        <td>
                          <button onClick={() => handleRemoveRiga(idx)} className="btn-icon btn-icon-red" title="Rimuovi">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totali */}
            {righe.length > 0 && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Prodotti: </span>
                    <span style={{ fontWeight: '600' }}>{totaleRighe}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Pezzi: </span>
                    <span style={{ fontWeight: '600' }}>{totalePezzi}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>Totale: </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>€{totaleImporto.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Azioni */}
          <div className="form-actions" style={{ marginTop: '16px' }}>
            <button onClick={() => navigate('/forniture')} className="btn-secondary">Annulla</button>
            <button onClick={handleConferma} disabled={!canConferma} className="btn-primary" style={{ opacity: canConferma ? 1 : 0.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              Conferma Fornitura
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
