import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BarcodeScanner from '../../components/BarcodeScanner'
import CreazioneRapidaProdotto from '../../components/CreazioneRapidaProdotto'
import { prodottiAPI, fornitureAPI } from '../../api/client'

const PRIMARY = '#1a237e'
const BG = '#f0f2f5'
const WHITE = '#ffffff'

function MobileCaricoFornitura() {
  const navigate = useNavigate()

  // Scan flow
  const [righe, setRighe] = useState([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [creazioneOpen, setCreazioneOpen] = useState(false)
  const [barcodeCorrente, setBarcodeCorrente] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Save flow
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [esitoFornitura, setEsitoFornitura] = useState(null)

  // --- Scan helpers ---

  function aggiungiProdotto(prodotto) {
    setRighe(prev => {
      const idx = prev.findIndex(r => r.prodotto.id === prodotto.id)
      if (idx !== -1) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantita: updated[idx].quantita + 1 }
        return updated
      }
      return [...prev, { prodotto, quantita: 1 }]
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
    } catch (err) {
      if (err.response?.status === 404) {
        setBarcodeCorrente(barcode)
        setCreazioneOpen(true)
      } else {
        setLookupError('Errore durante la ricerca del prodotto. Riprova.')
      }
    } finally {
      setLookupLoading(false)
    }
  }

  function onProdottoCreato(prodotto) {
    setCreazioneOpen(false)
    aggiungiProdotto(prodotto)
    setSuccessMsg('✅ Prodotto creato e aggiunto!')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  function aggiornaQuantita(idx, val) {
    const q = parseInt(val, 10)
    if (isNaN(q) || q < 1) return
    setRighe(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], quantita: q }
      return updated
    })
  }

  function rimuoviRiga(idx) {
    setRighe(prev => prev.filter((_, i) => i !== idx))
  }

  // --- Save ---

  async function confermaFornitura() {
    setSaveError('')
    if (righe.some(r => r.quantita < 1)) {
      setSaveError('Ogni prodotto deve avere quantità ≥ 1.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        righe: righe.map(r => ({
          prodotto_id: r.prodotto.id,
          quantita: r.quantita,
          prezzo_unitario: r.prodotto.prezzo_acquisto || 0,
        })),
      }
      const res = await fornitureAPI.confermaMobile(payload)
      setEsitoFornitura(res.data)
    } catch (err) {
      setSaveError(
        err.response?.data?.detail || 'Errore durante il salvataggio della fornitura.'
      )
    } finally {
      setSaving(false)
    }
  }

  function nuovaFornitura() {
    setRighe([])
    setEsitoFornitura(null)
    setSaveError('')
    setLookupError('')
    setSuccessMsg('')
  }

  // --- Esito screen ---

  if (esitoFornitura) {
    const totalePezzi = esitoFornitura.righe.reduce((sum, r) => sum + r.quantita, 0)
    const dataRicezione = esitoFornitura.data_ricezione
      ? new Date(esitoFornitura.data_ricezione).toLocaleString('it-IT')
      : new Date().toLocaleString('it-IT')

    return (
      <div style={{ backgroundColor: BG, minHeight: '100vh', padding: '24px 16px' }}>
        {/* Success header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>✅</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: PRIMARY, margin: '0 0 4px' }}>
            Fornitura Confermata!
          </h1>
          <p style={{ color: '#546e7a', fontSize: '1rem', margin: 0 }}>
            Magazzino aggiornato con successo
          </p>
        </div>

        {/* Summary card */}
        <div style={{
          backgroundColor: WHITE,
          borderRadius: 14,
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#78909c', fontSize: '0.85rem', fontWeight: 600 }}>NUMERO FORNITURA</span>
            <span style={{ color: PRIMARY, fontWeight: 700, fontSize: '0.95rem' }}>
              {esitoFornitura.numero_fornitura}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#78909c', fontSize: '0.85rem', fontWeight: 600 }}>DATA REGISTRAZIONE</span>
            <span style={{ color: '#37474f', fontSize: '0.9rem' }}>{dataRicezione}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#78909c', fontSize: '0.85rem', fontWeight: 600 }}>TOTALE PEZZI</span>
            <span style={{ color: '#2e7d32', fontWeight: 700, fontSize: '1rem' }}>{totalePezzi}</span>
          </div>
        </div>

        {/* Lines */}
        <div style={{
          backgroundColor: WHITE,
          borderRadius: 14,
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: 28,
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Prodotti caricati
          </h3>
          {esitoFornitura.righe.map((r, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < esitoFornitura.righe.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}>
              <span style={{ fontSize: '0.95rem', color: '#263238' }}>
                {r.prodotto_nome || `Prodotto #${r.prodotto_id}`}
              </span>
              <span style={{
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.9rem',
              }}>
                +{r.quantita}
              </span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <button
          onClick={nuovaFornitura}
          style={{
            display: 'block',
            width: '100%',
            padding: '16px',
            backgroundColor: PRIMARY,
            color: WHITE,
            border: 'none',
            borderRadius: 12,
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer',
            marginBottom: 12,
            minHeight: 52,
            touchAction: 'manipulation',
          }}
        >
          📥 Nuova Fornitura
        </button>
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
            touchAction: 'manipulation',
          }}
        >
          ← Torna alla Home
        </button>
      </div>
    )
  }

  // --- Main scan/list screen ---

  return (
    <div style={{ backgroundColor: BG, minHeight: '100vh', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📥</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: PRIMARY, margin: '0 0 6px' }}>
          Carico Fornitura
        </h1>
      </div>

      {/* Feedback messages */}
      {lookupError && (
        <div style={{
          backgroundColor: '#fdecea',
          color: '#c62828',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: '0.9rem',
        }}>
          {lookupError}
        </div>
      )}
      {successMsg && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          {successMsg}
        </div>
      )}
      {saveError && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: '0.9rem',
          border: '1px solid #ef9a9a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <span>❌ {saveError}</span>
          <button onClick={() => setSaveError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: '1.1rem', padding: 0, lineHeight: 1, flexShrink: 0 }} aria-label="Chiudi messaggio di errore">×</button>
        </div>
      )}

      {/* Scan button */}
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
          marginBottom: 20,
          minHeight: 52,
          touchAction: 'manipulation',
        }}
      >
        {lookupLoading ? '⏳ Ricerca in corso...' : '📷 Scansiona Prodotto'}
      </button>

      {/* Product list or empty state */}
      {righe.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📷</div>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Nessun prodotto ancora scansionato.<br />
            Usa il pulsante "Scansiona" per iniziare.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: WHITE,
          borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '0.85rem',
            color: '#546e7a',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Prodotti da caricare ({righe.length})
          </div>
          {righe.map((riga, idx) => (
            <div key={idx} style={{
              padding: '14px 16px',
              borderBottom: idx < righe.length - 1 ? '1px solid #f5f5f5' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#263238', fontSize: '0.95rem', marginBottom: 2 }}>
                  {riga.prodotto.nome}
                </div>
                {(riga.prodotto.barcode || riga.prodotto.sku) && (
                  <div style={{ fontSize: '0.8rem', color: '#90a4ae' }}>
                    {riga.prodotto.barcode || riga.prodotto.sku}
                  </div>
                )}
              </div>
              <input
                type="number"
                min={1}
                value={riga.quantita}
                onChange={e => aggiornaQuantita(idx, e.target.value)}
                style={{
                  width: 64,
                  padding: '8px',
                  border: '1.5px solid #cfd8dc',
                  borderRadius: 8,
                  fontSize: '1rem',
                  textAlign: 'center',
                  minHeight: 44,
                }}
              />
              <button
                onClick={() => rimuoviRiga(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.3rem',
                  padding: '4px 8px',
                  color: '#ef5350',
                  minHeight: 44,
                  touchAction: 'manipulation',
                }}
                aria-label="Rimuovi"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={confermaFornitura}
        disabled={righe.length === 0 || saving}
        style={{
          display: 'block',
          width: '100%',
          padding: '16px',
          backgroundColor: (righe.length === 0 || saving) ? '#9e9e9e' : '#1565c0',
          color: WHITE,
          border: 'none',
          borderRadius: 12,
          fontSize: '1rem',
          fontWeight: '700',
          cursor: (righe.length === 0 || saving) ? 'not-allowed' : 'pointer',
          marginBottom: 12,
          minHeight: 52,
          touchAction: 'manipulation',
        }}
      >
        {saving ? '⏳ Salvataggio in corso...' : `📥 Completa Carico (${righe.length} prodott${righe.length === 1 ? 'o' : 'i'})`}
      </button>

      {/* Back button */}
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
          touchAction: 'manipulation',
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
          onSuccess={onProdottoCreato}
          onClose={() => setCreazioneOpen(false)}
        />
      )}
    </div>
  )
}

export default MobileCaricoFornitura

