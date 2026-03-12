import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { prodottiAPI } from '../api/client'

const primaryColor = '#1a237e'

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
  if (!value) return null
  const colors = statoColors[value] || { bg: '#f5f5f5', text: '#555' }
  return (
    <span style={{
      backgroundColor: colors.bg, color: colors.text,
      padding: '3px 10px', borderRadius: '12px',
      fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

function QuantitaChart({ storico }) {
  if (!storico || storico.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '32px 0' }}>Nessun movimento registrato</p>
  }

  const W = 600
  const H = 200
  const padLeft = 48
  const padRight = 16
  const padTop = 16
  const padBottom = 36

  const values = storico.map(s => s.quantita)
  const minVal = Math.min(0, ...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const n = storico.length
  const xStep = (W - padLeft - padRight) / Math.max(n - 1, 1)

  const toX = (i) => padLeft + i * xStep
  const toY = (v) => padTop + (H - padTop - padBottom) * (1 - (v - minVal) / range)

  // Y axis labels
  const yLabels = []
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const v = minVal + (range * i) / steps
    yLabels.push({ v: Math.round(v), y: toY(v) })
  }

  // Polyline points
  const points = storico.map((s, i) => `${toX(i)},${toY(s.quantita)}`).join(' ')

  // Format date DD/MM
  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // X axis labels (show max 8)
  const xLabelStep = Math.max(1, Math.floor(n / 8))
  const xLabels = storico
    .map((s, i) => ({ i, label: fmtDate(s.data) }))
    .filter((_, i) => i === 0 || i === n - 1 || i % xLabelStep === 0)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Y axis labels */}
      {yLabels.map(({ v, y }, i) => (
        <g key={i}>
          <line x1={padLeft - 4} y1={y} x2={W - padRight} y2={y}
            stroke="#e0e0e0" strokeWidth="1" />
          <text x={padLeft - 8} y={y + 4} textAnchor="end"
            fontSize="10" fill="#888">{v}</text>
        </g>
      ))}

      {/* X axis */}
      <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom}
        stroke="#ccc" strokeWidth="1" />

      {/* X axis labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - padBottom + 14}
          textAnchor="middle" fontSize="10" fill="#888">{label}</text>
      ))}

      {/* Line */}
      {n > 1 && (
        <polyline points={points} fill="none" stroke="#1565c0" strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {storico.map((s, i) => (
        <circle key={i} cx={toX(i)} cy={toY(s.quantita)} r="4"
          fill="#1565c0" stroke="white" strokeWidth="1.5">
          <title>{`${fmtDate(s.data)}: ${s.quantita} (${s.tipo} ${s.variazione > 0 ? '+' : ''}${s.variazione})`}</title>
        </circle>
      ))}
    </svg>
  )
}

const PAGE_SIZE = 20

function DettaglioProdotto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scheda, setScheda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [movPage, setMovPage] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    prodottiAPI.getScheda(id)
      .then(res => setScheda(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Prodotto non trovato'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>Caricamento...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#c62828', fontSize: '1.1rem' }}>{error}</p>
        <button onClick={() => navigate('/prodotti')} style={btnStyle(primaryColor)}>← Torna ai Prodotti</button>
      </div>
    )
  }

  if (!scheda) return <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>Dati non disponibili</div>

  const { prodotto, movimenti, storico_quantita, prodotti_correlati, stats } = scheda

  const sottoScorta = prodotto.quantita < prodotto.quantita_minima

  // Pagination for movements
  const totalPages = Math.ceil(movimenti.length / PAGE_SIZE)
  const movimentiPagina = movimenti.slice(movPage * PAGE_SIZE, (movPage + 1) * PAGE_SIZE)

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fmtPrice = (v) => v != null ? `€${Number(v).toFixed(2)}` : '—'

  const margine = stats.margine_lordo
  const margineColor = margine == null ? '#888' : margine >= 0 ? '#2e7d32' : '#c62828'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/prodotti')} style={btnStyle('#546e7a')}>← Torna ai Prodotti</button>
        <h1 style={{ color: primaryColor, margin: 0, flex: 1, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}>{prodotto.nome}</h1>
        {prodotto.stato_conservazione && <StatoBadge value={prodotto.stato_conservazione} />}
      </div>

      {/* Main info grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        marginBottom: 24,
      }}>
        {/* Left: product details */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
            {prodotto.foto_url
              ? <img src={prodotto.foto_url} alt={prodotto.nome}
                  style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>📦</span>
            }
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: primaryColor, marginBottom: 4 }}>{prodotto.nome}</div>
              {prodotto.descrizione && <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: 8 }}>{prodotto.descrizione}</div>}
              <div style={{ fontSize: '0.85rem', color: '#888' }}>SKU: <code style={{ backgroundColor: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{prodotto.sku}</code></div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {prodotto.categoria_nome && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Categoria</span>
                <span style={valueStyle}>{prodotto.categoria_nome}</span>
              </div>
            )}
            {prodotto.ubicazione_nome && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Ubicazione</span>
                <span style={valueStyle}>{prodotto.ubicazione_nome}</span>
              </div>
            )}
            {prodotto.lingua && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Lingua</span>
                <span style={valueStyle}>{prodotto.lingua}</span>
              </div>
            )}
            {prodotto.stato_conservazione && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Conservazione</span>
                <StatoBadge value={prodotto.stato_conservazione} />
              </div>
            )}
          </div>
        </div>

        {/* Right: stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, alignContent: 'start' }}>
          {/* Quantità */}
          <div style={{ ...statCardStyle, borderLeft: `4px solid ${sottoScorta ? '#c62828' : '#2e7d32'}` }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>📦</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>Quantità</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: sottoScorta ? '#c62828' : '#2e7d32' }}>
              {prodotto.quantita}
              {sottoScorta && <span style={{ fontSize: '1rem', marginLeft: 4 }}>⚠️</span>}
            </div>
            {sottoScorta && <div style={{ fontSize: '0.75rem', color: '#c62828', marginTop: 2 }}>Sotto scorta (min: {prodotto.quantita_minima})</div>}
          </div>

          {/* Prezzo Vendita */}
          <div style={{ ...statCardStyle, borderLeft: '4px solid #1565c0' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>💰</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>Prezzo Vendita</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1565c0' }}>{fmtPrice(prodotto.prezzo_vendita)}</div>
          </div>

          {/* Prezzo Acquisto */}
          <div style={{ ...statCardStyle, borderLeft: '4px solid #7b1fa2' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>🛒</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>Prezzo Acquisto</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#7b1fa2' }}>{fmtPrice(prodotto.prezzo_acquisto)}</div>
          </div>

          {/* Margine */}
          <div style={{ ...statCardStyle, borderLeft: `4px solid ${margineColor}` }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>📈</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 4 }}>Margine Lordo</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: margineColor }}>
              {margine != null ? fmtPrice(margine) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Margine percentuale badge */}
      {stats.margine_percentuale != null && (
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#555', fontSize: '0.9rem' }}>Margine percentuale:</span>
          <span style={{
            backgroundColor: stats.margine_percentuale >= 0 ? '#e8f5e9' : '#ffebee',
            color: stats.margine_percentuale >= 0 ? '#2e7d32' : '#c62828',
            padding: '4px 14px', borderRadius: '20px',
            fontWeight: 700, fontSize: '0.95rem',
          }}>
            {stats.margine_percentuale >= 0 ? '+' : ''}{stats.margine_percentuale}%
          </span>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>
            (Carico tot: {stats.totale_carico} | Scarico tot: {stats.totale_scarico})
          </span>
        </div>
      )}

      {/* Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: primaryColor, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>📊 Quantità nel tempo</h2>
        <QuantitaChart storico={storico_quantita} />
      </div>

      {/* Movements table */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: primaryColor, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>
          📋 Storico Movimenti
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#888', marginLeft: 8 }}>({movimenti.length} totali)</span>
        </h2>
        {movimenti.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '24px 0' }}>Nessun movimento registrato</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: primaryColor, color: 'white' }}>
                    {['Data', 'Tipo', 'Quantità', 'Fornitore', 'Note'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimentiPagina.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '9px 14px', color: '#555', whiteSpace: 'nowrap' }}>{fmtDate(m.data_movimento)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{
                          backgroundColor: m.tipo === 'carico' ? '#e8f5e9' : '#ffebee',
                          color: m.tipo === 'carico' ? '#2e7d32' : '#c62828',
                          padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '0.82rem',
                        }}>{m.tipo}</span>
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{m.quantita}</td>
                      <td style={{ padding: '9px 14px', color: '#555' }}>{m.fornitore_nome || '—'}</td>
                      <td style={{ padding: '9px 14px', color: '#777', fontStyle: m.note ? 'normal' : 'italic' }}>{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button onClick={() => setMovPage(p => Math.max(0, p - 1))} disabled={movPage === 0}
                  style={btnSmall(movPage === 0 ? '#ccc' : primaryColor)}>‹ Prec</button>
                <span style={{ padding: '4px 10px', fontSize: '0.9rem', color: '#555' }}>
                  {movPage + 1} / {totalPages}
                </span>
                <button onClick={() => setMovPage(p => Math.min(totalPages - 1, p + 1))} disabled={movPage === totalPages - 1}
                  style={btnSmall(movPage === totalPages - 1 ? '#ccc' : primaryColor)}>Succ ›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Prodotti correlati */}
      {prodotti_correlati.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h2 style={{ color: primaryColor, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>🔗 Prodotti correlati</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {prodotti_correlati.map(pc => (
              <div key={pc.id}
                onClick={() => navigate(`/prodotti/${pc.id}`)}
                style={{
                  cursor: 'pointer', borderRadius: 8, border: '1px solid #e8eaf6',
                  padding: 12, transition: 'box-shadow 0.2s',
                  backgroundColor: 'white',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  {pc.foto_url
                    ? <img src={pc.foto_url} alt={pc.nome}
                        style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover' }} />
                    : <span style={{ fontSize: '2.5rem' }}>📦</span>
                  }
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: primaryColor, marginBottom: 4, textAlign: 'center' }}>{pc.nome}</div>
                <div style={{ fontSize: '0.78rem', color: '#888', textAlign: 'center', marginBottom: 4 }}>
                  <code>{pc.sku}</code>
                </div>
                <div style={{ fontSize: '0.82rem', textAlign: 'center', color: pc.quantita < pc.quantita_minima ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
                  Qty: {pc.quantita}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  backgroundColor: 'white', borderRadius: '8px',
  padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const statCardStyle = {
  backgroundColor: 'white', borderRadius: '8px',
  padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const infoRowStyle = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', gap: 8, padding: '4px 0',
  borderBottom: '1px solid #f0f0f0',
}

const labelStyle = { fontSize: '0.85rem', color: '#888', fontWeight: 500 }
const valueStyle = { fontSize: '0.9rem', color: '#333', fontWeight: 600, textAlign: 'right' }

const btnStyle = (bg) => ({
  backgroundColor: bg, color: 'white', border: 'none',
  borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold',
  fontSize: '0.9rem',
})

const btnSmall = (bg) => ({
  ...btnStyle(bg), padding: '4px 12px', fontSize: '0.85rem',
  cursor: bg === '#ccc' ? 'default' : 'pointer',
})

export default DettaglioProdotto
