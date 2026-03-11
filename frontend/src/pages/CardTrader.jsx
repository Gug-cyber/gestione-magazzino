import { useState, useEffect } from 'react'
import { cardtraderAPI } from '../api/client'

const primaryColor = '#1a237e'

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const btnPrimary = {
  backgroundColor: primaryColor,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '0.95rem',
}

const btnSecondary = {
  backgroundColor: '#fff',
  color: primaryColor,
  border: `2px solid ${primaryColor}`,
  borderRadius: '6px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '0.95rem',
}

const codeStyle = {
  backgroundColor: '#f5f5f5',
  padding: '2px 6px',
  borderRadius: '4px',
}

function CardTrader() {
  const [tokenConfigured, setTokenConfigured] = useState(null)
  const [listings, setListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsError, setListingsError] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)

  useEffect(() => {
    cardtraderAPI.getStatus()
      .then(res => setTokenConfigured(res.data.configured))
      .catch(() => setTokenConfigured(false))
  }, [])

  const handleLoadListings = async () => {
    setListingsLoading(true)
    setListingsError(null)
    setListings([])
    try {
      const res = await cardtraderAPI.getListings()
      setListings(res.data)
    } catch (err) {
      setListingsError(
        err.response?.data?.detail || 'Errore nel caricamento dei listing'
      )
    } finally {
      setListingsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!window.confirm('Sei sicuro di voler importare tutti i listing nel magazzino?')) return
    setImportLoading(true)
    setImportResult(null)
    setImportError(null)
    try {
      const res = await cardtraderAPI.importAll()
      setImportResult(res.data)
    } catch (err) {
      setImportError(
        err.response?.data?.detail || 'Errore durante l\'importazione'
      )
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ color: primaryColor, marginBottom: '24px' }}>🃏 CardTrader</h1>

      {/* Token status */}
      <div style={cardStyle}>
        <h2 style={{ color: primaryColor, marginBottom: '16px' }}>Token CardTrader</h2>
        {tokenConfigured === null && (
          <p style={{ color: '#666' }}>Verifica configurazione in corso…</p>
        )}
        {tokenConfigured === true && (
          <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>
            ✅ Token configurato correttamente.
          </p>
        )}
        {tokenConfigured === false && (
          <div>
            <p style={{ color: '#c62828', fontWeight: 'bold' }}>
              ❌ Token CardTrader non configurato.
            </p>
            <p style={{ color: '#555', marginTop: '8px' }}>
              Per abilitare l'integrazione, imposta la variabile d'ambiente{' '}
              <code style={codeStyle}>
                CARDTRADER_TOKEN
              </code>{' '}
              nel file <code style={codeStyle}>backend/.env</code>:
            </p>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '8px',
              fontFamily: 'monospace',
            }}>
              CARDTRADER_TOKEN=il_tuo_token_qui
            </pre>
            <p style={{ color: '#555', marginTop: '8px' }}>
              Puoi trovare il token nella tua area personale su{' '}
              <a href="https://www.cardtrader.com" target="_blank" rel="noreferrer">
                cardtrader.com
              </a>{' '}
              → Impostazioni → API.
            </p>
          </div>
        )}
      </div>

      {/* Listings */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h2 style={{ color: primaryColor, margin: 0 }}>Listing attivi</h2>
          <button
            style={btnSecondary}
            onClick={handleLoadListings}
            disabled={listingsLoading || !tokenConfigured}
          >
            {listingsLoading ? '⏳ Caricamento…' : '🔄 Carica listing da CardTrader'}
          </button>
        </div>

        {listingsError && (
          <p style={{ color: '#c62828', backgroundColor: '#ffebee', padding: '10px', borderRadius: '6px' }}>
            ❌ {listingsError}
          </p>
        )}

        {listings.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: primaryColor, color: '#fff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Nome</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>SKU</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qtà</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Prezzo</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Condizione</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Lingua</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item, idx) => (
                  <tr
                    key={item.id ?? idx}
                    style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}
                  >
                    <td style={{ padding: '8px 12px' }}>{item.nome || '—'}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                      {item.blueprint_id ? `CT-${item.blueprint_id}` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.quantita ?? '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      {item.prezzo != null ? `€ ${Number(item.prezzo).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>{item.condizione || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{item.lingua || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!listingsLoading && listings.length === 0 && !listingsError && (
          <p style={{ color: '#888', textAlign: 'center', padding: '24px' }}>
            Clicca il bottone per caricare i listing da CardTrader.
          </p>
        )}
      </div>

      {/* Import */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h2 style={{ color: primaryColor, margin: 0 }}>Importa nel magazzino</h2>
          <button
            style={btnPrimary}
            onClick={handleImport}
            disabled={importLoading || !tokenConfigured}
          >
            {importLoading ? '⏳ Importazione in corso…' : '📥 Importa tutti nel magazzino'}
          </button>
        </div>

        <p style={{ color: '#555', marginBottom: '12px' }}>
          Importa tutti i listing attivi di CardTrader nel magazzino. I prodotti esistenti
          (identificati dall'SKU <code style={codeStyle}>CT-&#123;id&#125;</code>)
          verranno aggiornati; quelli nuovi saranno creati automaticamente.
        </p>

        {importError && (
          <p style={{ color: '#c62828', backgroundColor: '#ffebee', padding: '10px', borderRadius: '6px' }}>
            ❌ {importError}
          </p>
        )}

        {importResult && (
          <div style={{ backgroundColor: '#e8f5e9', padding: '16px', borderRadius: '6px' }}>
            <p style={{ color: '#2e7d32', fontWeight: 'bold', marginBottom: '8px' }}>
              ✅ Importazione completata
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#333' }}>
              <li>Nuovi prodotti importati: <strong>{importResult.importati}</strong></li>
              <li>Prodotti aggiornati: <strong>{importResult.aggiornati}</strong></li>
              <li>Errori: <strong>{importResult.errori?.length ?? 0}</strong></li>
            </ul>
            {importResult.errori && importResult.errori.length > 0 && (
              <details style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#c62828' }}>
                  Mostra errori ({importResult.errori.length})
                </summary>
                <ul style={{ marginTop: '8px', paddingLeft: '20px', color: '#c62828', fontSize: '0.85rem' }}>
                  {importResult.errori.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CardTrader
