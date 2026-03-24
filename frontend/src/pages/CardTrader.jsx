import { useState, useEffect } from 'react'
import { cardtraderAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

const primaryColor = '#1a237e'

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '20px 24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  marginBottom: '24px',
}

const btnPrimary = {
  backgroundColor: primaryColor,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 18px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
}

const btnSecondary = {
  backgroundColor: '#fff',
  color: primaryColor,
  border: `1px solid ${primaryColor}`,
  borderRadius: '6px',
  padding: '8px 18px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px',
}

const CONDITIONS = ['NM', 'EX', 'GD', 'LP', 'PO']
const LANGUAGES = ['en', 'it', 'de', 'fr', 'es', 'pt', 'ja', 'zh-hans', 'ko', 'ru']

function formatPrice(value) {
  if (value === null || value === undefined) return 'N/D'
  return `€ ${Number(value).toFixed(2)}`
}

export default function CardTrader() {
  const isMobile = useIsMobile()
  const [tokenConfigured, setTokenConfigured] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)

  // Listings
  const [listings, setListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsError, setListingsError] = useState('')
  const [marketPrices, setMarketPrices] = useState({}) // key: "blueprintId|condizione|lingua"
  const [marketPricesLoading, setMarketPricesLoading] = useState(false)

  // Import
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')

  // Market prices search
  const [mpBlueprintId, setMpBlueprintId] = useState('')
  const [mpCondizione, setMpCondizione] = useState('')
  const [mpLingua, setMpLingua] = useState('')
  const [mpLoading, setMpLoading] = useState(false)
  const [mpResult, setMpResult] = useState(null)
  const [mpError, setMpError] = useState('')

  // Auto-populate blueprint IDs
  const [autoPopulateLoading, setAutoPopulateLoading] = useState(false)
  const [autoPopulateResult, setAutoPopulateResult] = useState(null)
  const [autoPopulateError, setAutoPopulateError] = useState('')
  const [minConfidence, setMinConfidence] = useState(60)

  useEffect(() => {
    cardtraderAPI.getStatus()
      .then(res => setTokenConfigured(res.data.configured))
      .catch(() => setTokenConfigured(false))
      .finally(() => setStatusLoading(false))
  }, [])

  async function handleLoadListings() {
    setListingsError('')
    setListingsLoading(true)
    setMarketPrices({})
    try {
      const res = await cardtraderAPI.getListings()
      const data = res.data || []
      setListings(data)
      fetchMarketPricesForListings(data)
    } catch (err) {
      setListingsError(err.response?.data?.detail || 'Errore nel caricamento dei listing')
    } finally {
      setListingsLoading(false)
    }
  }

  async function fetchMarketPricesForListings(data) {
    // Build unique keys: blueprintId|condizione|lingua
    const seen = new Set()
    const tasks = []
    for (const item of data) {
      const key = `${item.blueprint_id}|${item.condizione || ''}|${item.lingua || ''}`
      if (!seen.has(key) && item.blueprint_id) {
        seen.add(key)
        tasks.push({ key, blueprint_id: item.blueprint_id, condizione: item.condizione, lingua: item.lingua })
      }
    }

    if (tasks.length === 0) return
    setMarketPricesLoading(true)

    const results = await Promise.allSettled(
      tasks.map(t => {
        const params = {}
        if (t.condizione) params.condizione = t.condizione
        if (t.lingua) params.lingua = t.lingua
        return cardtraderAPI.getMarketPrices(t.blueprint_id, params)
          .then(res => ({ key: t.key, data: res.data }))
      })
    )

    const pricesMap = {}
    for (const r of results) {
      if (r.status === 'fulfilled') {
        pricesMap[r.value.key] = r.value.data
      }
    }
    setMarketPrices(pricesMap)
    setMarketPricesLoading(false)
  }

  async function handleImport() {
    setImportError('')
    setImportResult(null)
    setImportLoading(true)
    try {
      const res = await cardtraderAPI.importAll()
      setImportResult(res.data)
    } catch (err) {
      setImportError(err.response?.data?.detail || 'Errore durante l\'importazione')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleSearchMarketPrices() {
    setMpError('')
    setMpResult(null)
    setMpLoading(true)
    try {
      const params = {}
      if (mpCondizione) params.condizione = mpCondizione
      if (mpLingua) params.lingua = mpLingua
      const res = await cardtraderAPI.getMarketPrices(mpBlueprintId, params)
      setMpResult(res.data)
    } catch (err) {
      setMpError(err.response?.data?.detail || 'Errore nel recupero dei prezzi di mercato')
    } finally {
      setMpLoading(false)
    }
  }

  async function handleAutoPopulate() {
    setAutoPopulateError('')
    setAutoPopulateResult(null)
    setAutoPopulateLoading(true)
    try {
      const res = await cardtraderAPI.autoPopulateBlueprintIds(minConfidence)
      setAutoPopulateResult(res.data)
    } catch (err) {
      setAutoPopulateError(err.response?.data?.detail || 'Errore durante il popolamento automatico')
    } finally {
      setAutoPopulateLoading(false)
    }
  }

  if (statusLoading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Caricamento...</div>
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ color: primaryColor, marginBottom: '24px' }}>🃏 CardTrader</h1>

      {/* Status card */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: primaryColor }}>⚙️ Stato connessione</h2>
        {tokenConfigured ? (
          <p style={{ color: '#2e7d32', fontWeight: 600 }}>✅ Token CardTrader configurato</p>
        ) : (
          <p style={{ color: '#c62828', fontWeight: 600 }}>
            ❌ Token CardTrader non configurato. Impostare la variabile d'ambiente <code>CARDTRADER_TOKEN</code>.
          </p>
        )}
        {tokenConfigured && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '4px', fontWeight: 600 }}>
                  Confidenza minima (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  style={{ width: '80px', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
              <button
                style={autoPopulateLoading ? { ...btnPrimary, opacity: 0.6, cursor: 'not-allowed' } : btnPrimary}
                onClick={handleAutoPopulate}
                disabled={autoPopulateLoading}
              >
                {autoPopulateLoading ? '⏳ Popolamento in corso...' : '🔍 Popola Blueprint ID automaticamente'}
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0' }}>
              Il sistema cerca corrispondenze intelligenti usando nome, set e numero carta.
              Solo match con score ≥ {minConfidence}% verranno accettati.
            </p>
            {autoPopulateError && (
              <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '6px', marginTop: '8px' }}>
                {autoPopulateError}
              </div>
            )}
            {autoPopulateResult && (
              <div style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '12px 16px', borderRadius: '6px', marginTop: '12px' }}>
                <strong>Popolamento completato:</strong>{' '}
                {autoPopulateResult.aggiornati} prodotti aggiornati su {autoPopulateResult.totale_prodotti_senza_blueprint}
                {autoPopulateResult.low_confidence?.length > 0 && (
                  <div style={{ marginTop: '8px', color: '#f57c00' }}>
                    <strong>⚠️ Bassa confidenza ({autoPopulateResult.low_confidence.length}):</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.85rem' }}>
                      {autoPopulateResult.low_confidence.slice(0, 5).map((item, i) => (
                        <li key={i}>
                          {item.nome_originale} → {item.best_match || 'N/D'} (score: {item.score}%)
                        </li>
                      ))}
                      {autoPopulateResult.low_confidence.length > 5 && (
                        <li>... e altri {autoPopulateResult.low_confidence.length - 5}</li>
                      )}
                    </ul>
                  </div>
                )}
                {autoPopulateResult.non_trovati?.length > 0 && (
                  <div style={{ marginTop: '8px', color: '#f57c00' }}>
                    <strong>Non trovati ({autoPopulateResult.non_trovati.length}):</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.85rem' }}>
                      {autoPopulateResult.non_trovati.slice(0, 10).map((item, i) => (
                        <li key={i}>{typeof item === 'string' ? item : item.nome_originale}</li>
                      ))}
                      {autoPopulateResult.non_trovati.length > 10 && <li>... e altri {autoPopulateResult.non_trovati.length - 10}</li>}
                    </ul>
                  </div>
                )}
                {autoPopulateResult.errori?.length > 0 && (
                  <div style={{ marginTop: '8px', color: '#c62828' }}>
                    <strong>Errori ({autoPopulateResult.errori.length}):</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.85rem' }}>
                      {autoPopulateResult.errori.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listings card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: primaryColor }}>📋 Listing attivi</h2>
          <button
            style={tokenConfigured ? btnPrimary : { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' }}
            onClick={handleLoadListings}
            disabled={!tokenConfigured || listingsLoading}
          >
            {listingsLoading ? '⏳ Caricamento...' : '🔄 Carica listing'}
          </button>
        </div>

        {listingsError && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px' }}>
            {listingsError}
          </div>
        )}

        {listings.length > 0 && (
          <>
            {marketPricesLoading && (
              <p style={{ color: '#666', fontSize: '13px' }}>⏳ Recupero prezzi di mercato...</p>
            )}
            {isMobile ? (
              <div>
                {listings.map((item, idx) => {
                  const key = `${item.blueprint_id}|${item.condizione || ''}|${item.lingua || ''}`
                  const mp = marketPrices[key]
                  const mpMin = marketPricesLoading ? '...' : (mp ? formatPrice(mp.prezzo_minimo) : 'N/D')
                  const mpMed = marketPricesLoading ? '...' : (mp ? formatPrice(mp.prezzo_medio) : 'N/D')
                  return (
                    <div key={item.id ?? idx} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                      <div style={{ fontWeight: 700, color: primaryColor, marginBottom: '8px', fontSize: '0.95rem' }}>{item.nome || '—'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.85rem', color: '#555' }}>
                        <span>Blueprint ID: <strong>{item.blueprint_id ?? '—'}</strong></span>
                        <span>Qtà: <strong>{item.quantita ?? 0}</strong></span>
                        <span>Prezzo: <strong>{formatPrice(item.prezzo)}</strong></span>
                        <span>Condizione: <strong>{item.condizione || '—'}</strong></span>
                        <span>Lingua: <strong>{item.lingua || '—'}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.85rem' }}>
                        <span>Min mercato: <strong style={{ color: mpMin === 'N/D' ? '#aaa' : primaryColor }}>{mpMin}</strong></span>
                        <span>Medio mercato: <strong style={{ color: mpMed === 'N/D' ? '#aaa' : primaryColor }}>{mpMed}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={thStyle}>Nome</th>
                      <th style={thStyle}>Blueprint ID</th>
                      <th style={thStyle}>Qtà</th>
                      <th style={thStyle}>Prezzo</th>
                      <th style={thStyle}>Condizione</th>
                      <th style={thStyle}>Lingua</th>
                      <th style={thStyle}>Prezzo min. mercato</th>
                      <th style={thStyle}>Prezzo medio mercato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((item, idx) => {
                      const key = `${item.blueprint_id}|${item.condizione || ''}|${item.lingua || ''}`
                      const mp = marketPrices[key]
                      const mpMin = marketPricesLoading ? '...' : (mp ? formatPrice(mp.prezzo_minimo) : 'N/D')
                      const mpMed = marketPricesLoading ? '...' : (mp ? formatPrice(mp.prezzo_medio) : 'N/D')
                      return (
                        <tr key={item.id ?? idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle}>{item.nome || '—'}</td>
                          <td style={tdStyle}>{item.blueprint_id ?? '—'}</td>
                          <td style={tdStyle}>{item.quantita ?? 0}</td>
                          <td style={tdStyle}>{formatPrice(item.prezzo)}</td>
                          <td style={tdStyle}>{item.condizione || '—'}</td>
                          <td style={tdStyle}>{item.lingua || '—'}</td>
                          <td style={{ ...tdStyle, color: mpMin === 'N/D' ? '#aaa' : '#1a237e', fontWeight: mpMin !== 'N/D' && mpMin !== '...' ? 600 : 400 }}>{mpMin}</td>
                          <td style={{ ...tdStyle, color: mpMed === 'N/D' ? '#aaa' : '#1a237e', fontWeight: mpMed !== 'N/D' && mpMed !== '...' ? 600 : 400 }}>{mpMed}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!listingsLoading && listings.length === 0 && (
          <p style={{ color: '#777', textAlign: 'center', padding: '20px 0' }}>
            Nessun listing caricato. Clicca "Carica listing" per iniziare.
          </p>
        )}
      </div>

      {/* Import card */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: primaryColor }}>📥 Importa in magazzino</h2>
        <p style={{ color: '#555', marginBottom: '16px' }}>
          Importa tutti i listing attivi di CardTrader come prodotti nel magazzino. I prodotti esistenti (stesso SKU) verranno aggiornati.
        </p>

        <button
          style={tokenConfigured ? { ...btnPrimary, width: isMobile ? '100%' : 'auto' } : { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed', width: isMobile ? '100%' : 'auto' }}
          onClick={handleImport}
          disabled={!tokenConfigured || importLoading}
        >
          {importLoading ? '⏳ Importazione in corso...' : '📥 Importa tutto'}
        </button>

        {importError && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '6px', marginTop: '12px' }}>
            {importError}
          </div>
        )}

        {importResult && (
          <div style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '12px 16px', borderRadius: '6px', marginTop: '12px' }}>
            <strong>Importazione completata:</strong>{' '}
            {importResult.importati} nuovi, {importResult.aggiornati} aggiornati
            {importResult.errori?.length > 0 && (
              <div style={{ marginTop: '8px', color: '#c62828' }}>
                <strong>Errori ({importResult.errori.length}):</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {importResult.errori.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Market prices card */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, color: primaryColor }}>📊 Prezzi di mercato</h2>
        <p style={{ color: '#555', marginBottom: '16px' }}>
          Cerca il prezzo più basso e il prezzo medio di una carta su CardTrader, filtrati per condizione e lingua.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <label style={labelStyle}>Blueprint ID</label>
            <input
              type="number"
              value={mpBlueprintId}
              onChange={e => setMpBlueprintId(e.target.value)}
              placeholder="es. 12345"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Condizione</label>
            <select value={mpCondizione} onChange={e => setMpCondizione(e.target.value)} style={inputStyle}>
              <option value="">Tutte</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Lingua</label>
            <select value={mpLingua} onChange={e => setMpLingua(e.target.value)} style={inputStyle}>
              <option value="">Tutte</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <button
            style={(!tokenConfigured || !mpBlueprintId || mpLoading)
              ? { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed', width: isMobile ? '100%' : 'auto' }
              : { ...btnPrimary, width: isMobile ? '100%' : 'auto' }}
            onClick={handleSearchMarketPrices}
            disabled={!tokenConfigured || !mpBlueprintId || mpLoading}
          >
            {mpLoading ? '⏳ Ricerca...' : '🔍 Cerca prezzi'}
          </button>
        </div>

        {mpError && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px' }}>
            {mpError}
          </div>
        )}

        {mpResult && (
          <div style={{
            backgroundColor: '#f3f4ff',
            border: `1px solid ${primaryColor}`,
            borderRadius: '8px',
            padding: '16px 20px',
            maxWidth: '400px',
          }}>
            <div style={{ marginBottom: '8px', fontSize: '13px', color: '#555' }}>
              Blueprint ID: <strong>{mpResult.blueprint_id}</strong>
              {mpResult.condizione && <span> · Condizione: <strong>{mpResult.condizione}</strong></span>}
              {mpResult.lingua && <span> · Lingua: <strong>{mpResult.lingua}</strong></span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                💰 Prezzo minimo:{' '}
                <strong style={{ color: primaryColor }}>
                  {mpResult.prezzo_minimo !== null && mpResult.prezzo_minimo !== undefined
                    ? formatPrice(mpResult.prezzo_minimo)
                    : 'N/D'}
                </strong>
              </div>
              <div>
                📊 Prezzo medio:{' '}
                <strong style={{ color: primaryColor }}>
                  {mpResult.prezzo_medio !== null && mpResult.prezzo_medio !== undefined
                    ? formatPrice(mpResult.prezzo_medio)
                    : 'N/D'}
                </strong>
              </div>
              <div>
                📋 Numero di offerte: <strong>{mpResult.numero_offerte}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 12px',
  fontWeight: 600,
  fontSize: '13px',
  color: '#555',
  borderBottom: '2px solid #e0e0e0',
}

const tdStyle = {
  padding: '8px 12px',
  fontSize: '13px',
  color: '#333',
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  color: '#555',
  marginBottom: '4px',
  fontWeight: 600,
}

const inputStyle = {
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '14px',
  minWidth: '140px',
  width: '100%',
}
