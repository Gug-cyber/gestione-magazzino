import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import RicercaRapidaProdotto from '../components/RicercaRapidaProdotto'
import { normalizeSkuForCode39 } from '../utils/formatters'
import { PRIMARY_COLOR } from '../constants/colors'

function ScannerBarcode() {
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const lookupBarcode = async (value) => {
    if (!value || searching) return
    setSearching(true)
    setError('')

    // Normalize the API response data to a consistent array format
    const toItems = (data) => Array.isArray(data) ? data : (data?.items || [])

    // 0. QR code formato "prodotto:<id>" — naviga direttamente senza API call
    if (/^prodotto:\d+$/i.test(value)) {
      const id = value.split(':')[1]
      navigate(`/prodotti/${id}`)
      return
    }

    // 1. Try exact barcode match via dedicated endpoint
    try {
      const res = await prodottiAPI.lookupByBarcode(value)
      if (res.data?.id) {
        navigate(`/prodotti/${res.data.id}`)
        return
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(`Errore durante la ricerca: ${err.message}`)
        setSearching(false)
        return
      }
    }

    // 2. Try barcode as exact text filter in product list
    try {
      const res2 = await prodottiAPI.getAll({ barcode: value, limit: 1 })
      const items = toItems(res2.data)
      if (items.length > 0) {
        navigate(`/prodotti/${items[0].id}`)
        return
      }
    } catch { /* continue */ }

    // 3. Fallback: text search by normalized value with exact matching
    const normalized = normalizeSkuForCode39(value)
    try {
      const res3 = await prodottiAPI.getAll({ search: normalized, limit: 5 })
      const items = toItems(res3.data)
      if (items.length === 1) {
        navigate(`/prodotti/${items[0].id}`)
        return
      } else if (items.length > 1) {
        const exact = items.find(p =>
          p.barcode === value ||
          p.sku === value ||
          p.sku === normalized
        )
        if (exact) {
          navigate(`/prodotti/${exact.id}`)
          return
        }
      }
    } catch { /* continue */ }

    setError(`Nessun prodotto trovato per il codice: "${value}". Verifica che il barcode sia stato generato correttamente.`)
    setSearching(false)
  }

  const handleScan = (value) => {
    setShowScanner(false)
    lookupBarcode(value)
  }

  const handleManualSearch = () => {
    const val = manualInput.trim()
    if (val) lookupBarcode(val)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/prodotti')}
          style={{ backgroundColor: '#546e7a', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}
        >← Prodotti</button>
        <h1 style={{ color: PRIMARY_COLOR, margin: 0 }}>📷 Scanner QR / Barcode</h1>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 20 }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, fontSize: '1.1rem' }}>Scansiona con webcam</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 16 }}>
          Scansiona il QR code sulle etichette prodotto — più affidabile dei codici a barre lineari.
          Il sistema reindirizzerà automaticamente alla scheda del prodotto.
        </p>
        <button
          onClick={() => setShowScanner(true)}
          style={{ backgroundColor: PRIMARY_COLOR, color: 'white', border: 'none', borderRadius: 6, padding: '12px 24px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
        >
          📷 Apri Scanner QR
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 20 }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, fontSize: '1.1rem' }}>🔍 Ricerca rapida prodotto</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 16 }}>
          Cerca per nome, SKU o barcode mentre digiti — funziona da desktop e da mobile.
        </p>
        <RicercaRapidaProdotto
          showScanner={true}
          onScannerOpen={() => setShowScanner(true)}
          placeholder="Cerca prodotto per nome, SKU o barcode..."
        />
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, fontSize: '1.1rem' }}>Inserimento manuale barcode</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 16 }}>
          Inserisci manualmente il valore del codice a barre o lo SKU del prodotto.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
            placeholder="Inserisci barcode o SKU..."
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: '1rem' }}
          />
          <button
            onClick={handleManualSearch}
            disabled={!manualInput.trim() || searching}
            style={{
              backgroundColor: manualInput.trim() && !searching ? PRIMARY_COLOR : '#ccc',
              color: 'white', border: 'none', borderRadius: 6, padding: '10px 20px',
              cursor: manualInput.trim() && !searching ? 'pointer' : 'not-allowed', fontWeight: 'bold',
            }}
          >
            {searching ? '⏳' : '🔍 Cerca'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 6, color: '#c62828' }}>
          ⚠️ {error}
        </div>
      )}

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
