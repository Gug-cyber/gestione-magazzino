import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { movimentiAPI, prodottiAPI, fornitoriAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'

function Movimenti() {
  const navigate = useNavigate()
  const [movimenti, setMovimenti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const fetchAll = async () => {
    try {
      const [m, p, f] = await Promise.all([
        movimentiAPI.getAll({ limit: 100 }),
        prodottiAPI.getAll({ limit: 1000 }),
        fornitoriAPI.getAll(),
      ])
      setMovimenti(m.data)
      setProdotti(p.data)
      setFornitori(f.data)
    } catch (err) {
      setError('Errore nel caricamento dei dati')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo movimento?')) return
    try {
      await movimentiAPI.delete(id)
      fetchAll()
    } catch (err) {
      setError('Errore nell\'eliminazione')
    }
  }

  const getProdottoNome = (id) => prodotti.find(p => p.id === id)?.nome || `#${id}`
  const getFornitoreNome = (id) => fornitori.find(f => f.id === id)?.nome || '-'

  const movimentiFiltrati = movimenti.filter(m => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      getProdottoNome(m.prodotto_id).toLowerCase().includes(q) ||
      (prodotti.find(p => p.id === m.prodotto_id)?.sku || '').toLowerCase().includes(q) ||
      (m.tipo || '').toLowerCase().includes(q) ||
      getFornitoreNome(m.fornitore_id).toLowerCase().includes(q) ||
      (m.note || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e' }}>🔄 Movimenti</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            placeholder="Cerca per prodotto, SKU, tipo, fornitore, note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              height: '36px',
              width: '280px',
              padding: '0 12px',
              border: '1.5px solid #c5cae9',
              borderRadius: '6px',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#888', padding: '0 4px' }}
              title="Cancella ricerca"
            >✕</button>
          )}
          {search && (
            <span style={{ fontSize: '0.88rem', color: '#666', whiteSpace: 'nowrap' }}>
              {movimentiFiltrati.length}/{movimenti.length}
            </span>
          )}
          <button
            onClick={() => setShowScanner(true)}
            style={{ height: '36px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer', fontSize: '1.1rem' }}
            title="Cerca con codice a barre"
          >📷</button>
          <button
            onClick={() => navigate('/movimenti/nuovo')}
            style={{ height: '36px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', padding: '0 16px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >+ Registra Movimento</button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
              {['ID', 'Prodotto', 'Tipo', 'Quantità', 'Fornitore', 'Note', 'Data', 'Azioni'].map(h => (
                <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movimentiFiltrati.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                  {search ? `Nessun movimento corrisponde a "${search}"` : 'Nessun movimento registrato'}
                </td>
              </tr>
            ) : movimentiFiltrati.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{m.id}</td>
                <td style={tdStyle}>{getProdottoNome(m.prodotto_id)}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px',
                    backgroundColor: m.tipo === 'carico' ? '#e8f5e9' : '#ffebee',
                    color: m.tipo === 'carico' ? '#2e7d32' : '#c62828',
                    fontWeight: 'bold', fontSize: '0.85rem',
                  }}>
                    {m.tipo === 'carico' ? '📥' : '📤'} {m.tipo}
                  </span>
                </td>
                <td style={tdStyle}>{m.quantita}</td>
                <td style={tdStyle}>{m.fornitore_id ? getFornitoreNome(m.fornitore_id) : '-'}</td>
                <td style={tdStyle}>{m.note || '-'}</td>
                <td style={tdStyle}>{m.data_movimento ? new Date(m.data_movimento).toLocaleString('it-IT') : '-'}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(m.id)} style={btnSmall('#c62828')}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
const btnSmall = (bg) => ({ ...btnStyle(bg), padding: '4px 10px', fontSize: '0.85rem' })

export default Movimenti
