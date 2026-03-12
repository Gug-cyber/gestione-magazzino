import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'

const statoColors = {
  'Mint':         { bg: '#e8f5e9', text: '#2e7d32' },
  'Near Mint':    { bg: '#f1f8e9', text: '#558b2f' },
  'Excellent':    { bg: '#e3f2fd', text: '#1565c0' },
  'Good':         { bg: '#fff8e1', text: '#f57f17' },
  'Light Played': { bg: '#fff3e0', text: '#e65100' },
  'Played':       { bg: '#fce4ec', text: '#c62828' },
  'Poor':         { bg: '#ffebee', text: '#b71c1c' },
}

function StatoBadge({ value }) {
  if (!value) return <span>—</span>
  const colors = statoColors[value] || { bg: '#f5f5f5', text: '#555' }
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

function Prodotti() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [prodotti, setProdotti] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const fetchAll = async () => {
    try {
      const p = await prodottiAPI.getAll({ limit: 1000 })
      setProdotti(p.data)
    } catch (err) {
      setError('Errore nel caricamento dei dati')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const prodottiFiltrati = prodotti.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (p.nome || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.descrizione || '').toLowerCase().includes(q) ||
      (p.stato_conservazione || '').toLowerCase().includes(q) ||
      (p.lingua || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: '#1a237e', margin: 0 }}>📦 Prodotti</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cerca per nome, SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                height: '36px',
                boxSizing: 'border-box',
                border: '1.5px solid #c5cae9',
                borderRadius: '6px',
                fontSize: '0.95rem',
                width: 'clamp(160px, 30vw, 280px)',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#888', padding: '0 2px' }} title="Cancella ricerca">✕</button>
            )}
            {search && (
              <span style={{ fontSize: '0.82rem', color: '#666', whiteSpace: 'nowrap' }}>
                {prodottiFiltrati.length} / {prodotti.length}
              </span>
            )}
            <button
              onClick={() => setShowScanner(true)}
              style={{ padding: '7px 12px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.1rem' }}
              title="Cerca con codice a barre"
            >📷</button>
          </div>
          <button onClick={() => navigate('/prodotti/nuovo')}
            style={btnStyle('#1a237e')}>+ Aggiungi Prodotto</button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {isMobile ? (
        <div>
          {prodottiFiltrati.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
              {search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
            </div>
          ) : prodottiFiltrati.map((p) => (
            <div key={p.id} style={{ ...cardStyle, backgroundColor: p.quantita < p.quantita_minima ? '#fff8e1' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {p.foto_url
                    ? <img src={p.foto_url} alt={p.nome} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                    : <span style={{ fontSize: '2rem' }}>📷</span>
                  }
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a237e' }}>{p.nome}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => navigate(`/prodotti/${p.id}`)} style={btnSmall('#1a237e')} title="Scheda dettaglio">🔍</button>
                </div>
              </div>
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Quantità</span>
                <span style={{ ...cardValueStyle, color: p.quantita < p.quantita_minima ? '#c62828' : '#2e7d32' }}>{p.quantita} {p.quantita < p.quantita_minima ? '⚠️' : ''}</span>
              </div>
              {p.prezzo_vendita && <div style={cardRowStyle}><span style={cardLabelStyle}>Prezzo</span><span style={cardValueStyle}>€{p.prezzo_vendita}</span></div>}
              {p.stato_conservazione && <div style={cardRowStyle}><span style={cardLabelStyle}>Stato</span><StatoBadge value={p.stato_conservazione} /></div>}
              {p.lingua && <div style={cardRowStyle}><span style={cardLabelStyle}>Lingua</span><span style={cardValueStyle}>{p.lingua}</span></div>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                {['ID', 'Foto', 'Nome', 'Quantità', 'Q.Min', 'P.Acquisto', 'P.Vendita', 'Conservazione', 'Lingua', 'Azioni'].map(h => (
                  <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodottiFiltrati.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                    {search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
                  </td>
                </tr>
              ) : prodottiFiltrati.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee', backgroundColor: p.quantita < p.quantita_minima ? '#fff8e1' : 'white' }}>
                  <td style={tdStyle}>{p.id}</td>
                  <td style={tdStyle}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nome}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                        />
                      : <span style={{ fontSize: '1.4rem' }}>📷</span>
                    }
                  </td>
                  <td style={tdStyle}>{p.nome}</td>
                  <td style={{ ...tdStyle, color: p.quantita < p.quantita_minima ? '#c62828' : '#2e7d32', fontWeight: 'bold' }}>{p.quantita}</td>
                  <td style={tdStyle}>{p.quantita_minima}</td>
                  <td style={tdStyle}>{p.prezzo_acquisto ? `€${p.prezzo_acquisto}` : '-'}</td>
                  <td style={tdStyle}>{p.prezzo_vendita ? `€${p.prezzo_vendita}` : '-'}</td>
                  <td style={tdStyle}><StatoBadge value={p.stato_conservazione} /></td>
                  <td style={tdStyle}>{p.lingua || '—'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => navigate(`/prodotti/${p.id}`)} style={btnSmall('#1a237e')} title="Scheda dettaglio">🔍</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {showScanner && (
        <BarcodeScanner
          onScan={(value) => { setSearch(value); setShowScanner(false) }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: '600' }
const tdStyle = { padding: '10px 16px', color: '#333' }
const btnStyle = (bg) => ({ backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' })
const btnSmall = (bg) => ({ ...btnStyle(bg), padding: '4px 10px', marginRight: '4px', fontSize: '0.85rem' })
const cardStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid #e8eaf6' }
const cardRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.9rem' }
const cardLabelStyle = { color: '#888', fontWeight: 500, marginRight: '8px' }
const cardValueStyle = { color: '#333', fontWeight: 600, textAlign: 'right' }

export default Prodotti