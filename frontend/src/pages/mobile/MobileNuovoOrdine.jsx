import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, clientiAPI } from '../../api/client'
import BarcodeScanner from '../../components/BarcodeScanner'
import CreazioneRapidaProdotto from '../../components/CreazioneRapidaProdotto'

const PRIMARY = '#1a237e'
const BG = '#f0f2f5'
const WHITE = '#ffffff'
const DANGER = '#c62828'
const WARNING_BG = '#fff3e0'
const WARNING_BORDER = '#ef6c00'

function MobileNuovoOrdine() {
  const navigate = useNavigate()

  // Clienti
  const [clienti, setClienti] = useState([])
  const [clientiLoading, setClientiLoading] = useState(true)
  const [clientiError, setClientiError] = useState(false)
  const [clienteSelezionato, setClienteSelezionato] = useState(null)
  const [clienteSearch, setClienteSearch] = useState('')

  // Righe ordine: [{ prodotto, quantita, stockAlert }]
  const [righe, setRighe] = useState([])

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false)
  const [creazioneOpen, setCreazioneOpen] = useState(false)
  const [barcodeCorrente, setBarcodeCorrente] = useState('')

  // Feedback
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Codice manuale
  const [codiceManuale, setCodiceManuale] = useState('')

  // Caricamento clienti
  useEffect(() => {
    clientiAPI.getAll({ limit: 200 })
      .then(r => setClienti(r.data?.items ?? r.data ?? []))
      .catch(() => setClientiError(true))
      .finally(() => setClientiLoading(false))
  }, [])

  // --- Helpers ---

  function aggiungiProdotto(prodotto) {
    setRighe(prev => {
      const idx = prev.findIndex(r => r.prodotto.id === prodotto.id)
      if (idx !== -1) {
        const updated = [...prev]
        const nuovaQty = updated[idx].quantita + 1
        updated[idx] = {
          ...updated[idx],
          quantita: nuovaQty,
          stockAlert: nuovaQty > (prodotto.quantita ?? 0),
        }
        return updated
      }
      return [...prev, {
        prodotto,
        quantita: 1,
        stockAlert: 1 > (prodotto.quantita ?? 0),
      }]
    })
  }

  async function onScan(barcode) {
    setScannerOpen(false)
    setLookupError('')
    setSuccessMsg('')
    setLookupLoading(true)
    try {
      const res = await prodottiAPI.lookupByBarcode(barcode)
      aggiungiProdotto(res.data)
      setSuccessMsg(`✅ "${res.data.nome}" aggiunto`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      if (err.response?.status === 404) {
        setBarcodeCorrente(barcode)
        setCreazioneOpen(true)
      } else {
        setLookupError('Errore durante la ricerca del prodotto.')
      }
    } finally {
      setLookupLoading(false)
    }
  }

  async function cercaCodiceManuale() {
    const codice = codiceManuale.trim()
    if (!codice) return
    setLookupError('')
    setSuccessMsg('')
    setLookupLoading(true)
    try {
      const res = await prodottiAPI.lookupByBarcode(codice)
      aggiungiProdotto(res.data)
      setSuccessMsg(`✅ "${res.data.nome}" aggiunto`)
      setCodiceManuale('')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      if (err.response?.status === 404) {
        setBarcodeCorrente(codice)
        setCreazioneOpen(true)
      } else {
        setLookupError('Errore durante la ricerca del prodotto.')
      }
    } finally {
      setLookupLoading(false)
    }
  }

  function onSuccessCreazione(prodotto) {
    setCreazioneOpen(false)
    aggiungiProdotto(prodotto)
    setSuccessMsg(`✅ "${prodotto.nome}" creato e aggiunto`)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  function setQuantita(prodottoId, newQty) {
    const qty = Math.max(1, parseInt(newQty) || 1)
    setRighe(prev => prev.map(r => {
      if (r.prodotto.id !== prodottoId) return r
      return {
        ...r,
        quantita: qty,
        stockAlert: qty > (r.prodotto.quantita ?? 0),
      }
    }))
  }

  function rimuoviRiga(prodottoId) {
    setRighe(prev => prev.filter(r => r.prodotto.id !== prodottoId))
  }

  // --- Computed ---

  const clientiFiltrati = clienteSearch.trim()
    ? clienti.filter(c => {
        const full = `${c.nome} ${c.cognome || ''}`.toLowerCase()
        return full.includes(clienteSearch.toLowerCase())
      }).slice(0, 5)
    : clienti.slice(0, 5)

  const anyStockAlert = righe.some(r => r.stockAlert)
  const totalePezzi = righe.reduce((acc, r) => acc + r.quantita, 0)
  const totaleImporto = righe.reduce((acc, r) => acc + r.quantita * (r.prodotto.prezzo_vendita || 0), 0)
  const completaDisabled = righe.length === 0 || anyStockAlert

  // --- Card style helper ---
  const card = {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 20,
  }

  return (
    <div style={{ backgroundColor: BG, minHeight: '100vh', padding: '24px 16px' }}>

      {/* 1. Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛒</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: PRIMARY, margin: '0 0 6px' }}>
          Nuovo Ordine
        </h1>
      </div>

      {/* 2. Selezione Cliente */}
      <div style={card}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: PRIMARY, margin: '0 0 14px' }}>
          👤 Cliente
        </h2>

        {clientiLoading ? (
          <p style={{ color: '#78909c', fontSize: '0.9rem', margin: 0 }}>Caricamento clienti...</p>
        ) : clientiError ? (
          <p style={{ color: DANGER, fontSize: '0.9rem', margin: 0 }}>Errore nel caricamento dei clienti.</p>
        ) : clienteSelezionato ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: 20,
            padding: '8px 14px',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}>
            <span>{clienteSelezionato.nome}{clienteSelezionato.cognome ? ` ${clienteSelezionato.cognome}` : ''}</span>
            <button
              onClick={() => setClienteSelezionato(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2e7d32',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0 2px',
                lineHeight: 1,
                minHeight: 'unset',
              }}
              aria-label="Deseleziona cliente"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Cerca cliente..."
              value={clienteSearch}
              onChange={e => setClienteSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                border: '1.5px solid #cfd8dc',
                borderRadius: 8,
                fontSize: '0.95rem',
                marginBottom: 10,
                minHeight: 44,
              }}
            />
            {clientiFiltrati.length === 0 ? (
              <p style={{ color: '#90a4ae', fontSize: '0.85rem', margin: 0 }}>Nessun cliente trovato.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clientiFiltrati.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setClienteSelezionato(c); setClienteSearch('') }}
                    style={{
                      textAlign: 'left',
                      background: 'none',
                      border: '1.5px solid #e0e4ef',
                      borderRadius: 8,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: '#263238',
                      minHeight: 44,
                    }}
                  >
                    {c.nome}{c.cognome ? ` ${c.cognome}` : ''}
                    {c.email && <span style={{ color: '#90a4ae', marginLeft: 8, fontSize: '0.8rem' }}>{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Aggiungi Prodotto */}
      <div style={card}>
        <h2 style={{ fontSize: '1rem', fontWeight: '700', color: PRIMARY, margin: '0 0 14px' }}>
          📦 Aggiungi Prodotto
        </h2>

        <button
          onClick={() => { setLookupError(''); setScannerOpen(true) }}
          disabled={lookupLoading}
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            backgroundColor: lookupLoading ? '#90a4ae' : PRIMARY,
            color: WHITE,
            border: 'none',
            borderRadius: 12,
            fontSize: '1rem',
            fontWeight: '700',
            cursor: lookupLoading ? 'not-allowed' : 'pointer',
            marginBottom: 16,
            minHeight: 52,
          }}
        >
          📷 Scansiona Barcode/QR
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
          color: '#90a4ae',
          fontSize: '0.85rem',
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: '#e0e4ef' }} />
          <span>oppure inserisci codice manuale</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#e0e4ef' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Codice barcode o SKU"
            value={codiceManuale}
            onChange={e => setCodiceManuale(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cercaCodiceManuale()}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1.5px solid #cfd8dc',
              borderRadius: 8,
              fontSize: '0.95rem',
              minHeight: 44,
            }}
          />
          <button
            onClick={cercaCodiceManuale}
            disabled={lookupLoading || !codiceManuale.trim()}
            style={{
              padding: '10px 18px',
              backgroundColor: lookupLoading || !codiceManuale.trim() ? '#90a4ae' : PRIMARY,
              color: WHITE,
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: lookupLoading || !codiceManuale.trim() ? 'not-allowed' : 'pointer',
              minHeight: 44,
              whiteSpace: 'nowrap',
            }}
          >
            Cerca
          </button>
        </div>

        {/* Feedback */}
        {lookupLoading && (
          <p style={{ color: '#546e7a', fontSize: '0.9rem', margin: '10px 0 0' }}>🔍 Ricerca in corso...</p>
        )}
        {lookupError && (
          <p style={{ color: DANGER, fontSize: '0.9rem', margin: '10px 0 0' }}>{lookupError}</p>
        )}
        {successMsg && (
          <p style={{ color: '#2e7d32', fontWeight: 600, fontSize: '0.9rem', margin: '10px 0 0' }}>{successMsg}</p>
        )}
      </div>

      {/* 4. Lista righe ordine */}
      {righe.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {righe.map(riga => (
            <div key={riga.prodotto.id} style={{
              ...card,
              marginBottom: 12,
            }}>
              {/* Row header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#263238', fontSize: '0.95rem', flex: 1, marginRight: 8 }}>
                  {riga.prodotto.nome}
                </span>
                <button
                  onClick={() => rimuoviRiga(riga.prodotto.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#ef5350',
                    padding: '0 4px',
                    minHeight: 44,
                    lineHeight: 1,
                  }}
                  aria-label="Rimuovi riga"
                >
                  🗑️
                </button>
              </div>

              {/* SKU / barcode */}
              <div style={{ fontSize: '0.8rem', color: '#90a4ae', marginBottom: 4 }}>
                {riga.prodotto.sku && <span>SKU: {riga.prodotto.sku}</span>}
                {riga.prodotto.sku && riga.prodotto.barcode && <span> | </span>}
                {riga.prodotto.barcode && <span>Barcode: {riga.prodotto.barcode}</span>}
              </div>

              {/* Stock disponibile */}
              <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginBottom: 10 }}>
                Disponibili: {riga.prodotto.quantita ?? 0} pz
              </div>

              {/* Qty controls + prezzo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <button
                    onClick={() => setQuantita(riga.prodotto.id, riga.quantita - 1)}
                    style={{
                      width: 40,
                      height: 44,
                      border: `1.5px solid ${riga.stockAlert ? WARNING_BORDER : '#cfd8dc'}`,
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      background: WHITE,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      color: '#546e7a',
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={riga.quantita}
                    onChange={e => setQuantita(riga.prodotto.id, e.target.value)}
                    style={{
                      width: 56,
                      height: 44,
                      border: `1.5px solid ${riga.stockAlert ? WARNING_BORDER : '#cfd8dc'}`,
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderRadius: 0,
                      fontSize: '1rem',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => setQuantita(riga.prodotto.id, riga.quantita + 1)}
                    style={{
                      width: 40,
                      height: 44,
                      border: `1.5px solid ${riga.stockAlert ? WARNING_BORDER : '#cfd8dc'}`,
                      borderLeft: 'none',
                      borderRadius: '0 8px 8px 0',
                      background: WHITE,
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      color: '#546e7a',
                    }}
                  >
                    +
                  </button>
                </div>
                <span style={{ fontSize: '0.9rem', color: '#546e7a', whiteSpace: 'nowrap' }}>
                  Prezzo: €{(riga.prodotto.prezzo_vendita ?? 0).toFixed(2)}
                </span>
              </div>

              {/* Stock alert banner */}
              {riga.stockAlert && (
                <div style={{
                  marginTop: 10,
                  backgroundColor: WARNING_BG,
                  border: `1px solid ${WARNING_BORDER}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  color: WARNING_BORDER,
                  fontWeight: 600,
                }}>
                  ⚠️ Disponibili solo {riga.prodotto.quantita ?? 0} pz
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 5. Riepilogo ordine */}
      {righe.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: '1rem', fontWeight: '700', color: PRIMARY, margin: '0 0 14px' }}>
            📋 Riepilogo Ordine
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#78909c', fontSize: '0.9rem' }}>Totale pezzi</span>
            <span style={{ fontWeight: 700, color: '#263238' }}>{totalePezzi}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#78909c', fontSize: '0.9rem' }}>Totale importo</span>
            <span style={{ fontWeight: 700, color: '#263238' }}>€{totaleImporto.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ color: '#78909c', fontSize: '0.9rem' }}>Cliente</span>
            <span style={{ color: '#263238', fontSize: '0.9rem' }}>
              {clienteSelezionato
                ? `${clienteSelezionato.nome}${clienteSelezionato.cognome ? ` ${clienteSelezionato.cognome}` : ''}`
                : 'Nessun cliente'}
            </span>
          </div>

          <button
            disabled={completaDisabled}
            onClick={() => alert('Salvataggio ordine: funzionalità in arrivo')}
            style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              backgroundColor: completaDisabled ? '#b0bec5' : '#2e7d32',
              color: WHITE,
              border: 'none',
              borderRadius: 12,
              fontSize: '1rem',
              fontWeight: '700',
              cursor: completaDisabled ? 'not-allowed' : 'pointer',
              minHeight: 52,
            }}
          >
            ✅ Completa Ordine
          </button>

          {anyStockAlert && (
            <p style={{ color: WARNING_BORDER, fontSize: '0.85rem', textAlign: 'center', margin: '10px 0 0', fontWeight: 600 }}>
              ⚠️ Risolvi gli alert di disponibilità per completare l'ordine
            </p>
          )}
        </div>
      )}

      {/* 6. Torna alla Home */}
      <button
        onClick={() => navigate('/mobile')}
        style={{
          display: 'block',
          width: '100%',
          padding: '14px',
          backgroundColor: 'transparent',
          color: PRIMARY,
          border: `2px solid ${PRIMARY}`,
          borderRadius: 12,
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          minHeight: 52,
        }}
      >
        ← Torna alla Home
      </button>

      {/* Scanner modal */}
      {scannerOpen && (
        <BarcodeScanner
          onScan={onScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Creazione rapida modal */}
      {creazioneOpen && (
        <CreazioneRapidaProdotto
          barcode={barcodeCorrente}
          onSuccess={onSuccessCreazione}
          onClose={() => setCreazioneOpen(false)}
        />
      )}
    </div>
  )
}

export default MobileNuovoOrdine
