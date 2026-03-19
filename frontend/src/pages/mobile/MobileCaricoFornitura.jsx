import { useState, useEffect, useRef } from 'react'
import { prodottiAPI } from '../../api/client'
import BarcodeScanner from '../../components/BarcodeScanner'
import CreazioneRapidaProdotto from '../../components/CreazioneRapidaProdotto'

function MobileCaricoFornitura() {
  const [righe, setRighe] = useState([])
  const [scannerOpen, setScannerOpen] = useState(false)
  const [creazioneOpen, setCreazioneOpen] = useState(false)
  const [barcodeCorrente, setBarcodeCorrente] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const successTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
  }

  const addOrIncrement = (prodotto) => {
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

  const handleScan = async (barcode) => {
    setScannerOpen(false)
    setLookupError('')
    setLookupLoading(true)
    try {
      const res = await prodottiAPI.lookupByBarcode(barcode)
      addOrIncrement(res.data)
    } catch (err) {
      if (err.response?.status === 404) {
        setBarcodeCorrente(barcode)
        setCreazioneOpen(true)
      } else {
        setLookupError('Errore di rete durante la ricerca del prodotto.')
      }
    } finally {
      setLookupLoading(false)
    }
  }

  const handleCreazioneSuccess = (prodotto) => {
    setCreazioneOpen(false)
    addOrIncrement(prodotto)
    showSuccess('✅ Prodotto creato e aggiunto!')
  }

  const updateQuantita = (idx, value) => {
    const qty = Math.max(1, parseInt(value, 10) || 1)
    setRighe(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], quantita: qty }
      return updated
    })
  }

  const removeRiga = (idx) => {
    setRighe(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📥</div>
        <h1 style={{
          fontSize: '1.4rem',
          fontWeight: '700',
          color: '#1a237e',
          margin: '0 0 4px',
        }}>
          Carico Fornitura
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
          Scansiona i prodotti in ingresso
        </p>
      </div>

      {/* Scan button */}
      <button
        onClick={() => { setLookupError(''); setScannerOpen(true) }}
        disabled={lookupLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          padding: '18px',
          backgroundColor: lookupLoading ? '#c5cae9' : '#1a237e',
          color: '#ffffff',
          border: 'none',
          borderRadius: '14px',
          fontSize: '1.1rem',
          fontWeight: '700',
          cursor: lookupLoading ? 'not-allowed' : 'pointer',
          boxShadow: lookupLoading ? 'none' : '0 4px 14px rgba(26,35,126,0.3)',
          marginBottom: '16px',
          transition: 'background-color 0.2s',
        }}
      >
        {lookupLoading ? '🔍 Ricerca in corso…' : '📷 Scansiona Prodotto'}
      </button>

      {/* Lookup error */}
      {lookupError && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '0.9rem',
          fontWeight: '600',
        }}>
          ❌ {lookupError}
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '0.95rem',
          fontWeight: '600',
        }}>
          {successMsg}
        </div>
      )}

      {/* Rows list */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '16px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: '700', color: '#1a237e', fontSize: '0.95rem' }}>
            Prodotti da caricare
          </span>
          <span style={{
            backgroundColor: '#e8eaf6',
            color: '#3949ab',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '0.8rem',
            fontWeight: '700',
          }}>
            {righe.length} {righe.length === 1 ? 'riga' : 'righe'}
          </span>
        </div>

        {righe.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.9rem',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
            Nessun prodotto aggiunto.<br />Scansiona un barcode per iniziare.
          </div>
        ) : (
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {righe.map((riga, idx) => (
              <div key={riga.prodotto.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderBottom: idx < righe.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '600',
                    color: '#1e293b',
                    fontSize: '0.9rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {riga.prodotto.nome}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                    {riga.prodotto.barcode || riga.prodotto.sku || '—'}
                  </div>
                </div>

                <input
                  type="number"
                  min="1"
                  value={riga.quantita}
                  onChange={e => updateQuantita(idx, e.target.value)}
                  aria-label={`Quantità per ${riga.prodotto.nome}`}
                  style={{
                    width: '64px',
                    padding: '8px',
                    border: '1.5px solid #e0e4ef',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    color: '#1a237e',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={() => removeRiga(idx)}
                  aria-label="Rimuovi riga"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#ef4444',
                    padding: '4px',
                    minWidth: '36px',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {righe.length > 0 && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
              Totale pezzi
            </span>
            <span style={{ color: '#1a237e', fontWeight: '800', fontSize: '1rem' }}>
              {righe.reduce((sum, r) => sum + r.quantita, 0)} pz
            </span>
          </div>
        )}
      </div>

      {/* Confirm button (disabled - coming soon) */}
      <button
        disabled
        title="Prossimamente"
        style={{
          display: 'block',
          width: '100%',
          padding: '16px',
          backgroundColor: '#e2e8f0',
          color: '#94a3b8',
          border: 'none',
          borderRadius: '14px',
          fontSize: '1rem',
          fontWeight: '700',
          cursor: 'not-allowed',
        }}
      >
        ✅ Conferma Fornitura — Prossimamente
      </button>

      {/* BarcodeScanner overlay */}
      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* CreazioneRapidaProdotto modal */}
      {creazioneOpen && (
        <CreazioneRapidaProdotto
          barcode={barcodeCorrente}
          onSuccess={handleCreazioneSuccess}
          onClose={() => setCreazioneOpen(false)}
        />
      )}
    </div>
  )
}

export default MobileCaricoFornitura
