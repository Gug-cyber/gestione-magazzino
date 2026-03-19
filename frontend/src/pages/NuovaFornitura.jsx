import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornitoriAPI, prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'

const COLORS = {
  primary: '#1a237e',
  primaryLight: '#3949ab',
  success: '#2e7d32',
  successLight: '#e8f5e9',
  error: '#c62828',
  errorLight: '#ffebee',
  warning: '#e65100',
  warningLight: '#fff3e0',
  border: '#e0e0e0',
  bg: '#f5f5f5',
  white: '#ffffff',
  text: '#212121',
  textSecondary: '#757575',
}

export default function NuovaFornitura() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  // Fornitore
  const [fornitori, setFornitori] = useState([])
  const [fornitoreId, setFornitoreId] = useState('')
  const [numeroFornitura, setNumeroFornitura] = useState('')

  // Righe fornitura (stato locale)
  const [righe, setRighe] = useState([])

  // Scanner
  const [showScanner, setShowScanner] = useState(false)
  const [scanFeedback, setScanFeedback] = useState(null) // { type: 'success'|'error'|'notfound', message }
  const [scanLoading, setScanLoading] = useState(false)
  const feedbackTimer = useRef(null)

  // Ricerca manuale prodotto
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchTimer = useRef(null)
  const searchRef = useRef(null)

  // Inserimento manuale riga
  const [nomeManuale, setNomeManuale] = useState('')
  const [skuManuale, setSkuManuale] = useState('')
  const [qtaManuale, setQtaManuale] = useState(1)
  const [prezzoManuale, setPrezzoManuale] = useState(0)

  // Carica fornitori al mount
  useEffect(() => {
    fornitoriAPI.getAll()
      .then(res => setFornitori(res.data || []))
      .catch(() => setFornitori([]))
  }, [])

  // Chiudi risultati ricerca al click fuori
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Ricerca prodotti con debounce
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

  // Mostra feedback scansione per 3s
  const showScanFeedback = (type, message) => {
    clearTimeout(feedbackTimer.current)
    setScanFeedback({ type, message })
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 3000)
  }

  // Aggiunge prodotto alle righe (con logica incremento quantità)
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

  // Gestione scansione barcode
  const handleScan = async (value) => {
    setShowScanner(false)
    setScanLoading(true)
    try {
      const res = await prodottiAPI.lookupByBarcode(value)
      const prodotto = res.data
      addProdotto(prodotto)
      showScanFeedback('success', `✅ ${prodotto.nome} aggiunto`)
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

  // Aggiunge prodotto dalla ricerca manuale
  const handleAddFromSearch = (prodotto) => {
    addProdotto(prodotto)
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
    showScanFeedback('success', `✅ ${prodotto.nome} aggiunto`)
  }

  // Aggiunge riga tramite inserimento manuale
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
    showScanFeedback('success', `✅ ${nomeManuale.trim()} aggiunto`)
    setNomeManuale('')
    setSkuManuale('')
    setQtaManuale(1)
    setPrezzoManuale(0)
  }

  // Modifica quantità riga
  const handleQtyChange = (idx, val) => {
    const qty = Math.max(1, parseInt(val) || 1)
    setRighe(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], quantita: qty, subtotale: qty * updated[idx].prezzo_unitario }
      return updated
    })
  }

  // Modifica prezzo unitario riga
  const handlePrezzoChange = (idx, val) => {
    const prezzo = Math.max(0, parseFloat(val) || 0)
    setRighe(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], prezzo_unitario: prezzo, subtotale: updated[idx].quantita * prezzo }
      return updated
    })
  }

  // Rimuovi riga
  const handleRemoveRiga = (idx) => {
    setRighe(prev => prev.filter((_, i) => i !== idx))
  }

  // Conferma fornitura (placeholder)
  const handleConferma = () => {
    alert('Funzionalità di salvataggio in arrivo')
  }

  // Totali
  const totaleRighe = righe.length
  const totalePezzi = righe.reduce((sum, r) => sum + r.quantita, 0)
  const totaleImporto = righe.reduce((sum, r) => sum + r.subtotale, 0)

  const canConferma = fornitoreId && righe.length > 0

  const feedbackBg = scanFeedback?.type === 'success'
    ? COLORS.successLight
    : scanFeedback?.type === 'notfound'
      ? COLORS.warningLight
      : COLORS.errorLight

  const feedbackColor = scanFeedback?.type === 'success'
    ? COLORS.success
    : scanFeedback?.type === 'notfound'
      ? COLORS.warning
      : COLORS.error

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '12px 8px' : '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/forniture')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: COLORS.primary, fontSize: '1.2rem', padding: '4px 8px',
            borderRadius: 6, display: 'flex', alignItems: 'center',
          }}
          aria-label="Torna alle forniture"
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.6rem', color: COLORS.primary, fontWeight: 700 }}>
          🚚 Nuova Fornitura
        </h1>
      </div>

      {/* Feedback scansione */}
      {scanFeedback && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          backgroundColor: feedbackBg, color: feedbackColor,
          fontWeight: 600, fontSize: '0.95rem', border: `1px solid ${feedbackColor}33`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {scanFeedback.message}
          {scanFeedback.type === 'notfound' && (
            <button
              onClick={() => alert('Funzionalità creazione rapida prodotto in arrivo')}
              style={{
                marginLeft: 'auto', padding: '6px 14px', borderRadius: 6,
                backgroundColor: COLORS.warning, color: COLORS.white,
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
              }}
            >
              ➕ Crea prodotto rapido
            </button>
          )}
        </div>
      )}

      {/* Loading scansione */}
      {scanLoading && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          backgroundColor: '#e3f2fd', color: '#1565c0',
          fontWeight: 600, fontSize: '0.95rem',
        }}>
          🔍 Ricerca prodotto in corso...
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
        {/* Colonna sinistra: intestazione + scanner */}
        <div style={{ flex: isMobile ? 'none' : '0 0 320px', width: isMobile ? '100%' : 320 }}>
          {/* Card intestazione */}
          <div style={{
            backgroundColor: COLORS.white, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px', marginBottom: 16,
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: COLORS.primary, fontWeight: 700 }}>
              📋 Intestazione Fornitura
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                Fornitore *
              </label>
              <select
                value={fornitoreId}
                onChange={e => setFornitoreId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 7,
                  border: `1px solid ${fornitoreId ? COLORS.border : '#f44336'}`,
                  fontSize: '0.95rem', backgroundColor: COLORS.white, boxSizing: 'border-box',
                  outline: 'none', color: fornitoreId ? COLORS.text : COLORS.textSecondary,
                }}
              >
                <option value="">— Seleziona fornitore —</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.nome || f.ragione_sociale}</option>
                ))}
              </select>
              {!fornitoreId && (
                <span style={{ fontSize: '0.75rem', color: '#f44336', marginTop: 4, display: 'block' }}>
                  Seleziona un fornitore per procedere
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                N° Fornitura (opzionale)
              </label>
              <input
                type="text"
                value={numeroFornitura}
                onChange={e => setNumeroFornitura(e.target.value)}
                placeholder="es. FRN-2024-001"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 7,
                  border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Card scanner */}
          <div style={{
            backgroundColor: COLORS.white, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px', marginBottom: 16,
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: COLORS.primary, fontWeight: 700 }}>
              📷 Scansione Barcode
            </h2>
            <button
              onClick={() => setShowScanner(true)}
              disabled={scanLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                backgroundColor: COLORS.primaryLight, color: COLORS.white,
                border: 'none', cursor: scanLoading ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: '1rem', letterSpacing: '0.03em',
                opacity: scanLoading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              📷 Scansiona Barcode
            </button>
            <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: COLORS.textSecondary, textAlign: 'center' }}>
              Scansiona il barcode di un prodotto per aggiungerlo alla fornitura
            </p>
          </div>

          {/* Card ricerca manuale */}
          <div style={{
            backgroundColor: COLORS.white, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px',
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: COLORS.primary, fontWeight: 700 }}>
              🔍 Cerca Prodotto
            </h2>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Nome o SKU prodotto..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 7,
                  border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              {searchLoading && (
                <div style={{
                  position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
                  fontSize: '0.8rem', color: COLORS.textSecondary,
                }}>
                  ...
                </div>
              )}
              {showSearchResults && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  maxHeight: 280, overflowY: 'auto', marginTop: 4,
                }}>
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddFromSearch(p)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', border: 'none', borderBottom: `1px solid ${COLORS.border}`,
                        backgroundColor: 'transparent', cursor: 'pointer',
                        fontSize: '0.9rem', color: COLORS.text,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: 600 }}>{p.nome}</div>
                      {p.sku && (
                        <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary }}>SKU: {p.sku}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showSearchResults && searchResults.length === 0 && !searchLoading && searchQuery.trim() && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  padding: '12px 14px', marginTop: 4, fontSize: '0.88rem', color: COLORS.textSecondary,
                }}>
                  Nessun prodotto trovato
                </div>
              )}
            </div>
          </div>

          {/* Card inserimento manuale */}
          <div style={{
            backgroundColor: COLORS.white, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px', marginTop: 16,
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: COLORS.primary, fontWeight: 700 }}>
              ✏️ Inserimento Manuale
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                Nome prodotto *
              </label>
              <input
                type="text"
                value={nomeManuale}
                onChange={e => setNomeManuale(e.target.value)}
                placeholder="es. Carta A4 80g"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 7,
                  border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                SKU (opzionale)
              </label>
              <input
                type="text"
                value={skuManuale}
                onChange={e => setSkuManuale(e.target.value)}
                placeholder="es. SKU-001"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 7,
                  border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                  Quantità
                </label>
                <input
                  type="number"
                  min="1"
                  value={qtaManuale}
                  onChange={e => setQtaManuale(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 7,
                    border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.85rem', color: COLORS.text }}>
                  Prezzo unitario (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prezzoManuale}
                  onChange={e => setPrezzoManuale(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 7,
                    border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleAddManuale}
              disabled={!nomeManuale.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                backgroundColor: nomeManuale.trim() ? COLORS.success : COLORS.border,
                color: nomeManuale.trim() ? COLORS.white : COLORS.textSecondary,
                border: 'none', cursor: nomeManuale.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: '1rem',
              }}
            >
              ➕ Aggiungi Riga
            </button>
          </div>
        </div>

        {/* Colonna destra: righe fornitura */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            backgroundColor: COLORS.white, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px', marginBottom: 16,
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: COLORS.primary, fontWeight: 700 }}>
              📦 Righe Fornitura
              {righe.length > 0 && (
                <span style={{
                  marginLeft: 8, backgroundColor: COLORS.primary, color: COLORS.white,
                  borderRadius: '50%', width: 22, height: 22,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, verticalAlign: 'middle',
                }}>
                  {righe.length}
                </span>
              )}
            </h2>

            {righe.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                color: COLORS.textSecondary, fontSize: '0.95rem',
                backgroundColor: COLORS.bg, borderRadius: 8,
                border: `2px dashed ${COLORS.border}`,
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                <div>Nessun prodotto aggiunto</div>
                <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                  Usa lo scanner o la ricerca per aggiungere prodotti
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {isMobile ? (
                  // Mobile: card per ogni riga
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {righe.map((riga, idx) => (
                      <div key={riga.prodotto_id} style={{
                        border: `1px solid ${COLORS.border}`, borderRadius: 8,
                        padding: '12px 14px', backgroundColor: COLORS.bg,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: COLORS.text }}>{riga.nome}</div>
                            {riga.sku && (
                              <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary }}>SKU: {riga.sku}</div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveRiga(idx)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: COLORS.error, fontSize: '1.2rem', padding: '2px 6px',
                              borderRadius: 4, lineHeight: 1,
                            }}
                            title="Rimuovi riga"
                            aria-label="Rimuovi riga"
                          >
                            🗑️
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textSecondary, marginBottom: 3 }}>
                              Quantità
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={riga.quantita}
                              onChange={e => handleQtyChange(idx, e.target.value)}
                              style={{
                                width: '100%', padding: '8px 10px', borderRadius: 6,
                                border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textSecondary, marginBottom: 3 }}>
                              Prezzo (€)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={riga.prezzo_unitario}
                              onChange={e => handlePrezzoChange(idx, e.target.value)}
                              style={{
                                width: '100%', padding: '8px 10px', borderRadius: 6,
                                border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: COLORS.textSecondary, marginBottom: 3 }}>
                              Subtotale
                            </label>
                            <div style={{
                              padding: '8px 10px', borderRadius: 6, backgroundColor: '#f0f4ff',
                              fontWeight: 700, fontSize: '0.95rem', color: COLORS.primary,
                            }}>
                              €{riga.subtotale.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Desktop: tabella
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.82rem', color: COLORS.textSecondary, fontWeight: 600 }}>Prodotto</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.82rem', color: COLORS.textSecondary, fontWeight: 600 }}>SKU</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.82rem', color: COLORS.textSecondary, fontWeight: 600, width: 100 }}>Quantità</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: '0.82rem', color: COLORS.textSecondary, fontWeight: 600, width: 120 }}>Prezzo (€)</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '0.82rem', color: COLORS.textSecondary, fontWeight: 600, width: 100 }}>Subtotale</th>
                        <th style={{ width: 48 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {righe.map((riga, idx) => (
                        <tr key={riga.prodotto_id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: '10px 10px', fontWeight: 600, fontSize: '0.92rem', color: COLORS.text }}>
                            {riga.nome}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: '0.82rem', color: COLORS.textSecondary }}>
                            {riga.sku || '—'}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              value={riga.quantita}
                              onChange={e => handleQtyChange(idx, e.target.value)}
                              style={{
                                width: 80, padding: '6px 8px', borderRadius: 6, textAlign: 'center',
                                border: `1px solid ${COLORS.border}`, fontSize: '0.92rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={riga.prezzo_unitario}
                              onChange={e => handlePrezzoChange(idx, e.target.value)}
                              style={{
                                width: 90, padding: '6px 8px', borderRadius: 6, textAlign: 'center',
                                border: `1px solid ${COLORS.border}`, fontSize: '0.92rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: COLORS.primary }}>
                            €{riga.subtotale.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleRemoveRiga(idx)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: COLORS.error, fontSize: '1.1rem', padding: '4px',
                                borderRadius: 4,
                              }}
                              title="Rimuovi riga"
                              aria-label="Rimuovi riga"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Riepilogo */}
          <div style={{
            backgroundColor: COLORS.white, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '20px',
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1rem', color: COLORS.primary, fontWeight: 700 }}>
              📊 Riepilogo
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{
                flex: '1 1 120px', padding: '14px 16px', borderRadius: 8,
                backgroundColor: '#f0f4ff', border: `1px solid #c5cae9`,
              }}>
                <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, marginBottom: 4 }}>SKU distinti</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.primary }}>{totaleRighe}</div>
              </div>
              <div style={{
                flex: '1 1 120px', padding: '14px 16px', borderRadius: 8,
                backgroundColor: '#f0f4ff', border: `1px solid #c5cae9`,
              }}>
                <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, marginBottom: 4 }}>Totale pezzi</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.primary }}>{totalePezzi}</div>
              </div>
              <div style={{
                flex: '1 1 140px', padding: '14px 16px', borderRadius: 8,
                backgroundColor: '#e8f5e9', border: `1px solid #a5d6a7`,
              }}>
                <div style={{ fontSize: '0.78rem', color: COLORS.textSecondary, marginBottom: 4 }}>Totale importo</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: COLORS.success }}>
                  €{totaleImporto.toFixed(2)}
                </div>
              </div>
            </div>

            <button
              onClick={handleConferma}
              disabled={!canConferma}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                backgroundColor: canConferma ? COLORS.success : '#bdbdbd',
                color: COLORS.white, border: 'none',
                cursor: canConferma ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: '1rem', letterSpacing: '0.03em',
                transition: 'background 0.2s',
              }}
              title={!canConferma ? 'Seleziona un fornitore e aggiungi almeno un prodotto' : ''}
            >
              ✅ Conferma Fornitura
            </button>
            {!canConferma && (
              <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: COLORS.textSecondary, textAlign: 'center' }}>
                {!fornitoreId && !righe.length
                  ? 'Seleziona un fornitore e aggiungi almeno un prodotto'
                  : !fornitoreId
                    ? 'Seleziona un fornitore'
                    : 'Aggiungi almeno un prodotto'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* BarcodeScanner modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
