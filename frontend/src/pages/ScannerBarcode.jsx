import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import RicercaRapidaProdotto from '../components/RicercaRapidaProdotto'
import useExternalScanner from '../hooks/useExternalScanner'
import { normalizeSkuForCode39 } from '../utils/formatters'
import '../styles/shared.css'

function ScannerBarcode() {
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [lastExternalCode, setLastExternalCode] = useState('')
  const searchingRef = useRef(false)

  const setSearchingWithRef = (val) => {
    searchingRef.current = val
    setSearching(val)
  }

  const lookupBarcode = useCallback(async (value) => {
    if (!value || searchingRef.current) return
    setSearchingWithRef(true)
    setError('')

    const toItems = (data) => Array.isArray(data) ? data : (data?.items || [])

    if (/^prodotto:\d+$/i.test(value)) {
      const id = value.split(':')[1]
      setSearchingWithRef(false)
      navigate(`/prodotti/${id}`)
      return
    }

    try {
      const res = await prodottiAPI.lookupByBarcode(value)
      if (res.data?.id) {
        setSearchingWithRef(false)
        navigate(`/prodotti/${res.data.id}`)
        return
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(`Errore durante la ricerca: ${err.message}`)
        setSearchingWithRef(false)
        return
      }
    }

    const normalized = normalizeSkuForCode39(value)
    try {
      const res2 = await prodottiAPI.getAll({ search: normalized, limit: 5 })
      const items = toItems(res2.data)
      if (items.length === 1) {
        setSearchingWithRef(false)
        navigate(`/prodotti/${items[0].id}`)
        return
      } else if (items.length > 1) {
        const exact = items.find(p =>
          p.barcode === value ||
          p.sku === value ||
          p.sku === normalized
        )
        if (exact) {
          setSearchingWithRef(false)
          navigate(`/prodotti/${exact.id}`)
          return
        }
        // Più risultati ma nessuna corrispondenza esatta → mostra errore e sblocca
        setError(`Trovati ${items.length} prodotti per "${value}" ma nessuna corrispondenza esatta. Usa la ricerca manuale.`)
        setSearchingWithRef(false)
        return
      }
    } catch { /* continue */ }

    setError(`Nessun prodotto trovato per il codice: "${value}". Verifica che il barcode sia stato generato correttamente.`)
    setSearchingWithRef(false)
  }, [navigate])

  const handleExternalScan = useCallback((code) => {
    setLastExternalCode(code)
    lookupBarcode(code)
  }, [lookupBarcode])

  useExternalScanner({
    onScan: handleExternalScan,
    enabled: !showScanner && !searching,
  })

  const handleScan = (value) => {
    setShowScanner(false)
    lookupBarcode(value)
  }

  const handleManualSearch = () => {
    const val = manualInput.trim()
    if (val) lookupBarcode(val)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/prodotti')} className="btn-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Prodotti
        </button>
        <div className="page-title-section">
          <div className="page-icon" style={{ width: '40px', height: '40px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Scanner QR / Barcode</h1>
        </div>
      </div>

      {/* Webcam Scanner */}
      <div className="card mb-6">
        <h2 className="section-title-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Scansiona con webcam
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px', lineHeight: '1.5' }}>
          Scansiona il QR code sulle etichette prodotto. Il sistema reindirizzerà automaticamente alla scheda del prodotto.
        </p>
        <button onClick={() => setShowScanner(true)} className="btn-primary btn-full">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Apri Scanner QR
        </button>
      </div>

      {/* External Hardware Scanner */}
      <div className="card mb-6">
        <h2 className="section-title-sm">
          🔌 Scanner hardware (USB / Bluetooth)
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px', lineHeight: '1.5' }}>
          Collega lo scanner al dispositivo e puntalo sul codice a barre o QR. Non serve fare nulla di speciale: il sistema rileva automaticamente l'input dello scanner.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ color: (showScanner || searching) ? '#c62828' : '#2e7d32', fontSize: '1.1rem' }}>●</span>
          <span style={{ fontSize: '0.9rem', color: (showScanner || searching) ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
            {showScanner ? 'Scanner in pausa (modale aperta)' : searching ? 'Scanner in pausa (ricerca in corso...)' : 'Scanner attivo — in ascolto...'}
          </span>
        </div>
        {lastExternalCode && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Ultimo codice letto: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1a237e' }}>{lastExternalCode}</span>
          </div>
        )}
      </div>

      {/* Quick Search */}
      <div className="card mb-6">
        <h2 className="section-title-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          Ricerca rapida prodotto
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px', lineHeight: '1.5' }}>
          Cerca per nome, SKU o barcode mentre digiti.
        </p>
        <RicercaRapidaProdotto
          showScanner={true}
          onScannerOpen={() => setShowScanner(true)}
          placeholder="Cerca prodotto per nome, SKU o barcode..."
        />
      </div>

      {/* Manual Input */}
      <div className="card">
        <h2 className="section-title-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" />
          </svg>
          Inserimento manuale barcode
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px', lineHeight: '1.5' }}>
          Inserisci manualmente il valore del codice a barre o lo SKU del prodotto.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
            placeholder="Inserisci barcode o SKU..."
            className="form-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleManualSearch}
            disabled={!manualInput.trim() || searching}
            className="btn-primary"
            style={{ opacity: (!manualInput.trim() || searching) ? 0.5 : 1 }}
          >
            {searching ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            )}
            Cerca
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner" style={{ marginTop: '16px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default ScannerBarcode
