import { useState, useEffect } from 'react'
import { opportunitaAPI } from '../api/client'
import '../styles/shared.css'

const AZIONE_COLORS = {
  'Vendi subito': { bg: 'rgba(56,161,105,0.15)', color: '#38a169', border: '#38a169' },
  'Aumenta prezzo': { bg: 'rgba(255,152,0,0.15)', color: '#ff9800', border: '#ff9800' },
  'Riordina': { bg: 'rgba(220,53,69,0.15)', color: 'var(--color-danger)', border: 'var(--color-danger)' },
  'Prezzo ok': { bg: 'rgba(100,100,100,0.1)', color: 'var(--color-text-secondary)', border: 'var(--color-border)' },
}

const COLUMNS = [
  { key: 'nome', label: 'Nome' },
  { key: 'sku', label: 'SKU' },
  { key: 'prezzo_acquisto', label: 'Acquisto' },
  { key: 'prezzo_vendita', label: 'Vendita' },
  { key: 'ebay_prezzo_medio', label: 'eBay medio' },
  { key: 'cardmarket_prezzo_medio', label: 'CM medio' },
  { key: 'margine_attuale', label: 'Margine' },
  { key: 'margine_vs_mercato', label: 'vs Mercato' },
  { key: 'opportunita_score', label: 'Score' },
  { key: 'azione_consigliata', label: 'Azione' },
]

export default function DashboardOpportunita() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState(null)
  const [sortKey, setSortKey] = useState('opportunita_score')
  const [sortDir, setSortDir] = useState('desc')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    opportunitaAPI.getAll()
      .then(res => setItems(res.data || []))
      .catch(() => setErrore('Errore nel caricamento delle opportunità'))
      .finally(() => setLoading(false))
  }, [])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = items.filter(row =>
    !filter || row.nome?.toLowerCase().includes(filter.toLowerCase()) || row.sku?.toLowerCase().includes(filter.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? (typeof a[sortKey] === 'string' ? '' : -Infinity)
    const vb = b[sortKey] ?? (typeof b[sortKey] === 'string' ? '' : -Infinity)
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const fmt = (v) => v != null ? `€${Number(v).toFixed(2)}` : '—'

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--border-primary)',
    userSelect: 'none',
    background: 'var(--surface-secondary)',
  }
  const tdStyle = {
    padding: '10px 12px',
    fontSize: '0.85rem',
    borderBottom: '1px solid var(--border-primary)',
    verticalAlign: 'middle',
  }

  const summaryByAction = items.reduce((acc, row) => {
    acc[row.azione_consigliata] = (acc[row.azione_consigliata] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div className="page-title-section">
          <div className="page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Dashboard Opportunità</h1>
            <p className="page-subtitle">Analisi di mercato e suggerimenti di vendita per tutti i prodotti</p>
          </div>
        </div>
      </div>

      {/* Summary badges */}
      {!loading && !errore && items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {Object.entries(summaryByAction).map(([azione, count]) => {
            const az = AZIONE_COLORS[azione] || AZIONE_COLORS['Prezzo ok']
            return (
              <div key={azione} style={{ padding: '8px 16px', borderRadius: 8, background: az.bg, border: `1px solid ${az.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: az.color }}>{count}</span>
                <span style={{ fontSize: '0.85rem', color: az.color, fontWeight: 500 }}>{azione}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter */}
      {!loading && !errore && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Cerca per nome o SKU..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--surface-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              width: '100%',
              maxWidth: 360,
              outline: 'none',
            }}
          />
        </div>
      )}

      {loading && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>
      )}

      {errore && (
        <div style={{ padding: 32, color: 'var(--color-danger)', textAlign: 'center' }}>{errore}</div>
      )}

      {!loading && !errore && items.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Nessun dato disponibile</div>
          <div style={{ fontSize: '0.9rem' }}>
            Aggiorna i prezzi eBay o CardMarket per i tuoi prodotti per vedere le opportunità di mercato.
          </div>
        </div>
      )}

      {!loading && !errore && sorted.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-primary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {COLUMNS.map(({ key, label }) => (
                  <th key={key} style={thStyle} onClick={() => handleSort(key)}>
                    {label} <SortIcon k={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const az = AZIONE_COLORS[row.azione_consigliata] || AZIONE_COLORS['Prezzo ok']
                return (
                  <tr key={row.prodotto_id}>
                    <td style={tdStyle}><strong>{row.nome}</strong></td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.sku || '—'}</td>
                    <td style={tdStyle}>{fmt(row.prezzo_acquisto)}</td>
                    <td style={tdStyle}>{fmt(row.prezzo_vendita)}</td>
                    <td style={{ ...tdStyle, color: 'var(--color-warning)' }}>{fmt(row.ebay_prezzo_medio)}</td>
                    <td style={{ ...tdStyle, color: '#ff9800' }}>{fmt(row.cardmarket_prezzo_medio)}</td>
                    <td style={{ ...tdStyle, color: row.margine_attuale > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {row.margine_attuale != null ? `€${Number(row.margine_attuale).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: row.margine_vs_mercato > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {row.margine_vs_mercato != null ? `€${Number(row.margine_vs_mercato).toFixed(2)}` : '—'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 40, height: 6, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${row.opportunita_score}%`,
                            height: '100%',
                            background: row.opportunita_score > 60 ? '#38a169' : row.opportunita_score > 30 ? '#ff9800' : 'var(--color-text-muted)',
                            borderRadius: 3,
                          }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 24 }}>{row.opportunita_score}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: az.bg,
                        color: az.color,
                        border: `1px solid ${az.border}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {row.azione_consigliata}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !errore && sorted.length === 0 && filter && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Nessun prodotto trovato per "{filter}".
        </div>
      )}
    </div>
  )
}
