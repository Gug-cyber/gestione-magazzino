import { useState, useEffect } from 'react'
import { prodottiAPI, ordiniAPI, fattureAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import DashboardAlerts from '../components/alerts/DashboardAlerts'

// Icons
const Icons = {
  Package: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  ShoppingCart: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  ),
  TrendingDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  ),
  Clipboard: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
}

function StatCard({ title, value, color, icon: Icon, isMobile, trend }) {
  const colorMap = {
    indigo: {
      bg: 'rgba(99, 102, 241, 0.1)',
      border: 'rgba(99, 102, 241, 0.2)',
      text: '#818cf8',
      glow: 'rgba(99, 102, 241, 0.15)',
    },
    red: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.2)',
      text: '#f87171',
      glow: 'rgba(239, 68, 68, 0.15)',
    },
    amber: {
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.2)',
      text: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.15)',
    },
  }

  const colors = colorMap[color] || colorMap.indigo

  return (
    <div 
      className="animate-fade-in"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        padding: isMobile ? '16px' : '24px',
        border: '1px solid var(--color-border)',
        minWidth: isMobile ? '0' : '200px',
        flex: 1,
        transition: 'all 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.border
        e.currentTarget.style.boxShadow = `0 0 24px ${colors.glow}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${colors.text}, transparent)`,
      }} />

      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        marginBottom: '16px' 
      }}>
        <div style={{ 
          padding: '10px',
          borderRadius: '10px',
          backgroundColor: colors.bg,
          color: colors.text,
          fill: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon />
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: trend >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: trend >= 0 ? '#4ade80' : '#f87171',
            border: `1px solid ${trend >= 0 ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {trend >= 0 ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
      <div style={{ 
        fontSize: isMobile ? '2rem' : '2.5rem', 
        fontWeight: '700', 
        color: 'var(--color-text)', 
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div style={{ 
        color: 'var(--color-text-secondary)', 
        marginTop: '8px', 
        fontSize: isMobile ? '13px' : '14px', 
        fontWeight: '500' 
      }}>
        {title}
      </div>
    </div>
  )
}

const ORDER_STATE_COLORS = {
  'in attesa': { bg: 'var(--color-warning-bg)', text: '#fbbf24', border: 'var(--color-warning-border)' },
  'confermato': { bg: 'var(--color-info-bg)', text: '#60a5fa', border: 'var(--color-info-border)' },
  'spedito':   { bg: 'rgba(34, 197, 94, 0.08)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
  'completato': { bg: 'var(--color-success-bg)', text: '#22c55e', border: 'var(--color-success-border)' },
  'annullato': { bg: 'var(--color-danger-bg)', text: '#f87171', border: 'var(--color-danger-border)' },
}

function OrderStateBadge({ stato }) {
  const c = ORDER_STATE_COLORS[stato] || { bg: 'var(--color-surface-hover)', text: 'var(--color-text-muted)', border: 'var(--color-border)' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '999px',
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      fontWeight: '600',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      textTransform: 'capitalize',
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
    prodotti: [],
    ordini: [],
    fatture: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodottiRes, sottoScortaRes, ordiniRes, tuttiOrdiniRes, ordiniConfermatiRes, ordiniSpeditiRes, fattureRes] = await Promise.all([
          prodottiAPI.getAll({ limit: 1000 }),
          prodottiAPI.getSottoScorta(),
          ordiniAPI.getAll({ limit: 5 }),
          ordiniAPI.getAll({ limit: 1000 }),
          ordiniAPI.getAll({ stato: 'confermato', limit: 1000 }),
          ordiniAPI.getAll({ stato: 'spedito', limit: 1000 }),
          fattureAPI.getAll({ limit: 1000 }),
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
          prodotti: prodottiRes.data,
          ordini: tuttiOrdiniRes.data,
          fatture: fattureRes.data,
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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '80px 24px', 
      color: 'var(--color-text-secondary)',
      gap: '16px',
    }}>
      <div className="spinner" style={{ width: '32px', height: '32px' }} />
      <span style={{ fontSize: '14px' }}>Caricamento dashboard...</span>
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: isMobile ? '1.5rem' : '1.75rem', 
          fontWeight: '700', 
          color: 'var(--color-text)', 
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}>
          Panoramica
        </h1>
        <p style={{ 
          margin: '8px 0 0', 
          fontSize: '14px', 
          color: 'var(--color-text-secondary)' 
        }}>
          Situazione aggiornata del magazzino - collectibles, TCG e articoli specializzati
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '16px', 
        marginBottom: '32px',
      }}>
        <StatCard
          title="Totale Prodotti"
          value={stats.totaleProdotti}
          color="indigo"
          icon={Icons.Package}
          isMobile={isMobile}
        />
        <StatCard
          title="Sotto Scorta Minima"
          value={stats.prodottiSottoScorta}
          color="red"
          icon={Icons.AlertTriangle}
          isMobile={isMobile}
        />
        <StatCard
          title="Ordini Totali"
          value={stats.totaleOrdini}
          color="amber"
          icon={Icons.ShoppingCart}
          isMobile={isMobile}
        />
      </div>

      {/* Alert Intelligenti */}
      <DashboardAlerts
        products={stats.prodotti}
        orders={stats.ordini}
        invoices={stats.fatture}
      />

      {/* Recent Orders Card */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--color-text)', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            Ordini Recenti
          </h2>
          <span style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            padding: '4px 10px',
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: '6px',
          }}>
            Ultimi 5
          </span>
        </div>
        
        {stats.ordiniRecenti.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '48px 24px', 
            color: 'var(--color-text-muted)' 
          }}>
            <div style={{ opacity: 0.3, marginBottom: '12px' }}>
              <Icons.Clipboard />
            </div>
            <div style={{ fontWeight: '500', color: 'var(--color-text-secondary)' }}>
              Nessun ordine registrato
            </div>
          </div>
        ) : isMobile ? (
          <div style={{ padding: '8px' }}>
            {stats.ordiniRecenti.map((o, idx) => (
              <div 
                key={o.id} 
                style={{ 
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)',
                  marginBottom: '4px',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <code style={{ 
                    fontWeight: '600', 
                    color: 'var(--color-primary-light)',
                    fontSize: '13px',
                  }}>
                    {o.numero_ordine || `#${o.id}`}
                  </code>
                  <OrderStateBadge stato={o.stato} />
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '14px', 
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '-')}</span>
                  <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                    {'\u20AC'}{Number(o.totale || 0).toFixed(2)}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--color-text-muted)', 
                  marginTop: '6px' 
                }}>
                  {o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '-'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Stato</th>
                  <th style={thStyle}>Totale</th>
                  <th style={thStyle}>Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.ordiniRecenti.map((o, idx) => (
                  <tr 
                    key={o.id} 
                    style={{ 
                      backgroundColor: idx % 2 === 0 ? 'var(--color-bg-elevated)' : 'var(--color-surface)',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--color-bg-elevated)' : 'var(--color-surface)'}
                  >
                    <td style={tdStyle}>
                      <code style={{ color: 'var(--color-primary-light)', fontWeight: '600' }}>
                        #{o.id}
                      </code>
                    </td>
                    <td style={tdStyle}>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '-')}</td>
                    <td style={tdStyle}><OrderStateBadge stato={o.stato} /></td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>
                      {o.totale != null ? `\u20AC${parseFloat(o.totale).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-muted)', fontSize: '13px' }}>
                      {o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  color: 'var(--color-text-muted)',
  fontWeight: '600',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  backgroundColor: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
}

const tdStyle = {
  padding: '14px 16px',
  color: 'var(--color-text)',
  fontSize: '14px',
  borderBottom: '1px solid var(--color-border-subtle)',
}

export default Dashboard
