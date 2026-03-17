import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { normalizeSkuForCode39 } from '../utils/formatters'
import { PRIMARY_COLOR } from '../constants/colors'

function ScannerBarcode() {
  const navigate = useNavigate()
  const [showScanner, setShowScanner] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const lookupBarcode = async (value) => {
    if (!value) return
    setSearching(true)
    setError('')

    // 1. Try exact barcode match
    try {
      const res = await prodottiAPI.lookupByBarcode(value)
      navigate(`/prodotti/${res.data.id}`)
      return
    } catch { /* continue */ }

    // 2. Try normalized barcode match
    const normalized = normalizeSkuForCode39(value)
    if (normalized !== value) {
      try {
        const res2 = await prodottiAPI.lookupByBarcode(normalized)
        navigate(`/prodotti/${res2.data.id}`)
        return
      } catch { /* continue */ }
    }

    // 3. Search by SKU in list with exact matching
    try {
      const MAX_SKU_SEARCH_RESULTS = 5
      const res3 = await prodottiAPI.getAll({ search: normalized, limit: MAX_SKU_SEARCH_RESULTS })
      if (res3.data && res3.data.length === 1) {
        navigate(`/prodotti/${res3.data[0].id}`)
        return
      } else if (res3.data && res3.data.length > 1) {
        const exact = res3.data.find(p =>
          p.sku === value ||
          p.sku === normalized ||
          p.barcode === value
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
        <h1 style={{ color: PRIMARY_COLOR, margin: 0 }}>📷 Scanner Barcode</h1>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 20 }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, fontSize: '1.1rem' }}>Scansiona con webcam</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: 16 }}>
          Usa la fotocamera del dispositivo per scansionare il codice a barre di un prodotto.
          Il sistema reindirizzerà automaticamente alla scheda del prodotto.
        </p>
        <button
          onClick={() => setShowScanner(true)}
          style={{ backgroundColor: PRIMARY_COLOR, color: 'white', border: 'none', borderRadius: 6, padding: '12px 24px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
        >
          📷 Apri Scanner
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, fontSize: '1.1rem' }}>Inserimento manuale</h2>
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
