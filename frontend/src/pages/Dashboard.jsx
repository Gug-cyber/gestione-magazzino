import { useState, useEffect } from 'react'
import { prodottiAPI, ordiniAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

function StatCard({ title, value, color, emoji, isMobile, trend }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: isMobile ? '16px' : '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
      borderLeft: `5px solid ${color}`,
      minWidth: isMobile ? '0' : '180px',
      flex: 1,
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: isMobile ? '1.4rem' : '1.75rem' }}>{emoji}</div>
        {trend !== undefined && (
          <span style={{
            fontSize: '0.72rem',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: trend >= 0 ? '#dcfce7' : '#fee2e2',
            color: trend >= 0 ? '#16a34a' : '#dc2626',
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: '700', color, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#6b7280', marginTop: '6px', fontSize: isMobile ? '0.8rem' : '0.875rem', fontWeight: '500' }}>{title}</div>
    </div>
  )
}

const ORDER_STATE_COLORS = {
  'in attesa': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'confermato': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  'spedito':   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'completato': { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  'annullato': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
}

function OrderStateBadge({ stato }) {
  const c = ORDER_STATE_COLORS[stato] || { bg: '#f5f5f5', text: '#555', border: '#e5e7eb' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontWeight: '600',
      fontSize: '0.8rem',
      whiteSpace: 'nowrap',
    }}>{stato}</span>
  )
}

const STATO_CONSERVAZIONE_COLORS = {
  'M':  { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  'NM': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  'EX': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  'GD': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'LP': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  'PL': { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  'PR': { bg: '#fef2f2', text: '#991b1b', border: '#f87171' },
}

function StatoBadge({ stato }) {
  if (!stato) return <span style={{ color: '#9ca3af' }}>—</span>
  const c = STATO_CONSERVAZIONE_COLORS[stato] || { bg: '#f5f5f5', text: '#555', border: '#e5e7eb' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontWeight: '600',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
    }}>{stato}</span>
  )
}

function Dashboard() {
  const isMobile = useIsMobile()
  const [stats, setStats] = useState({
    totaleProdotti: 0,
    prodottiSottoScorta: 0,
    totaleOrdini: 0,
    ordiniRecenti: [],
    prodottiSottoScortaList: [],
    ordiniInCorso: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodottiRes, sottoScortaRes, ordiniRes, tuttiOrdiniRes, ordiniConfermatiRes, ordiniSpeditiRes] = await Promise.all([
          prodottiAPI.getAll({ limit: 1000 }),
          prodottiAPI.getSottoScorta(),
          ordiniAPI.getAll({ limit: 5 }),
          ordiniAPI.getAll({ limit: 1000 }),
          ordiniAPI.getAll({ stato: 'confermato', limit: 1000 }),
          ordiniAPI.getAll({ stato: 'spedito', limit: 1000 }),
        ])
        const ordiniInCorso = [...(ordiniConfermatiRes.data || []), ...(ordiniSpeditiRes.data || [])]
          .sort((a, b) => new Date(b.data_ordine || 0) - new Date(a.data_ordine || 0))
        setStats({
          totaleProdotti: prodottiRes.data.length,
          prodottiSottoScorta: sottoScortaRes.data.length,
          totaleOrdini: tuttiOrdiniRes.data.length,
          ordiniRecenti: ordiniRes.data,
          prodottiSottoScortaList: sottoScortaRes.data,
          ordiniInCorso,
        })
      } catch (err) {
        console.error('Errore nel caricamento dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px', color: '#6b7280' }}>
      <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>⏳</span> Caricamento...
    </div>
  )

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1e1b4b', lineHeight: 1.2 }}>
          📊 Panoramica
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
          Situazione aggiornata del magazzino — collectibles, TCG e articoli specializzati
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <StatCard
          title="Totale Prodotti"
          value={stats.totaleProdotti}
          color="#4f46e5"
          emoji="📦"
          isMobile={isMobile}
        />
        <StatCard
          title="Sotto Scorta Minima"
          value={stats.prodottiSottoScorta}
          color="#dc2626"
          emoji="⚠️"
          isMobile={isMobile}
        />
        <StatCard
          title="Ordini Totali"
          value={stats.totaleOrdini}
          color="#d97706"
          emoji="🛒"
          isMobile={isMobile}
        />
      </div>

      {/* Ordini in Corso */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: '#1e1b4b', fontSize: '1rem', fontWeight: '600' }}>🚚 Ordini in Corso</h2>
          <a href="/ordini" style={{ fontSize: '0.85rem', color: '#4f46e5', textDecoration: 'none', fontWeight: '500' }}>Vedi tutti →</a>
        </div>
        {stats.ordiniInCorso.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px', opacity: 0.5 }}>🚚</div>
            <div style={{ fontWeight: '600', color: '#6b7280' }}>Nessun ordine in corso</div>
          </div>
        ) : isMobile ? (
          <div>
            {stats.ordiniInCorso.map(o => (
              <div key={o.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#4f46e5' }}>{o.numero_ordine || `#${o.id}`}</span>
                  <OrderStateBadge stato={o.stato} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.85rem', color: '#555' }}>
                  <span>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '—')}</span>
                  <span style={{ fontWeight: '600' }}>€{Number(o.totale || 0).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                  {o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>N° Ordine</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Totale</th>
                </tr>
              </thead>
              <tbody>
                {stats.ordiniInCorso.map((o, idx) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={tdStyle}><code style={{ color: '#4f46e5', fontWeight: '600' }}>{o.numero_ordine || `#${o.id}`}</code></td>
                    <td style={tdStyle}>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '—')}</td>
                    <td style={tdStyle}><OrderStateBadge stato={o.stato} /></td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>{o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{o.totale != null ? `€${parseFloat(o.totale).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
      }}>
        <h2 style={{ margin: '0 0 16px', color: '#1e1b4b', fontSize: '1rem', fontWeight: '600' }}>🛒 Ordini Recenti</h2>
        {stats.ordiniRecenti.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px', opacity: 0.5 }}>📋</div>
            <div style={{ fontWeight: '600', color: '#6b7280' }}>Nessun ordine registrato</div>
          </div>
        ) : isMobile ? (
          <div>
            {stats.ordiniRecenti.map(o => (
              <div key={o.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#4f46e5' }}>{o.numero_ordine || `#${o.id}`}</span>
                  <OrderStateBadge stato={o.stato} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.85rem', color: '#555' }}>
                  <span>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '—')}</span>
                  <span style={{ fontWeight: '600' }}>€{Number(o.totale || 0).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                  {o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Stato</th>
                <th style={thStyle}>Totale</th>
                <th style={thStyle}>Data</th>
              </tr>
            </thead>
            <tbody>
              {stats.ordiniRecenti.map((o, idx) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={tdStyle}><code style={{ color: '#4f46e5', fontWeight: '600' }}>#{o.id}</code></td>
                  <td style={tdStyle}>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '—')}</td>
                  <td style={tdStyle}><OrderStateBadge stato={o.stato} /></td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{o.totale != null ? `€${parseFloat(o.totale).toFixed(2)}` : '-'}</td>
                  <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.85rem' }}>{o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Prodotti Sotto Scorta */}
      {stats.prodottiSottoScorta > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
          marginTop: '24px',
        }}>
          <h2 style={{ margin: '0 0 16px', color: '#1e1b4b', fontSize: '1rem', fontWeight: '600' }}>
            ⚠️ Prodotti Sotto Scorta Minima
          </h2>
          {isMobile ? (
            <div>
              {stats.prodottiSottoScortaList.map(p => (
                <div key={p.id} style={{
                  borderRadius: '8px',
                  marginBottom: '8px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                }}>
                  <div style={{ fontWeight: 600, color: '#1e1b4b', marginBottom: '4px' }}>
                    {p.nome}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#555' }}>
                    <span>Quantità: <strong style={{ color: '#dc2626' }}>{p.quantita}</strong> / Min: {p.quantita_minima}</span>
                    {p.stato_conservazione && <StatoBadge stato={p.stato_conservazione} />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Nome Prodotto</th>
                    <th style={thStyle}>SKU</th>
                    <th style={thStyle}>Quantità</th>
                    <th style={thStyle}>Min</th>
                    <th style={thStyle}>Stato</th>
                    <th style={thStyle}>Lingua</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.prodottiSottoScortaList.map((p, idx) => (
                    <tr key={p.id} style={{
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: idx % 2 === 0 ? '#fef2f2' : '#fee2e2',
                    }}>
                      <td style={tdStyle}>{p.nome}</td>
                      <td style={tdStyle}><code style={{ fontSize: '0.8rem' }}>{p.sku}</code></td>
                      <td style={{ ...tdStyle, fontWeight: '700', color: '#dc2626' }}>{p.quantita}</td>
                      <td style={tdStyle}>{p.quantita_minima}</td>
                      <td style={tdStyle}><StatoBadge stato={p.stato_conservazione} /></td>
                      <td style={tdStyle}>{p.lingua || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  color: '#374151',
  fontWeight: '600',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tdStyle = {
  padding: '10px 12px',
  color: '#374151',
  fontSize: '0.875rem',
}

export default Dashboard
