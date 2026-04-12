import { useState, useEffect, useCallback } from 'react'
import { analyticsAPI, analisiAPI } from '../api/client'
import '../styles/shared.css'

// ---------------------------------------------------------------------------
// Channel color map
// ---------------------------------------------------------------------------
const CHANNEL_COLORS = {
  instagram: '#e1306c',
  facebook: '#1877f2',
  tiktok: '#010101',
  google: '#4285f4',
  bing: '#00809d',
  yahoo: '#720e9e',
  direct: '#6366f1',
  ebay: '#e53238',
  other: '#8b5cf6',
}

const CHANNEL_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  bing: 'Bing',
  yahoo: 'Yahoo',
  direct: 'Diretto',
  ebay: 'eBay',
  other: 'Altro',
}

// ---------------------------------------------------------------------------
// Period Selector
// ---------------------------------------------------------------------------
function PeriodSelector({ value, onChange }) {
  const options = [
    { key: 'today', label: 'Oggi' },
    { key: '7d', label: 'Ultimi 7 giorni' },
    { key: '30d', label: 'Ultimi 30 giorni' },
  ]
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            padding: '8px 16px',
            border: `1px solid ${value === o.key ? 'var(--primary)' : 'var(--border-primary)'}`,
            borderRadius: '8px',
            background: value === o.key ? 'var(--color-primary-glow, rgba(99,102,241,0.15))' : 'var(--bg-secondary)',
            color: value === o.key ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: value === o.key ? '600' : '400',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${color || 'var(--primary)'}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        backgroundColor: `${color || 'var(--primary)'}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '20px',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Simple horizontal bar
// ---------------------------------------------------------------------------
function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: '8px', backgroundColor: 'var(--border-primary)', borderRadius: '4px', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Daily trend mini chart (bar chart with labels)
// ---------------------------------------------------------------------------
function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nessun dato disponibile.</p>
  }
  const maxVisits = Math.max(...data.map((d) => d.visits), 1)
  const chartHeight = 160

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {/* Y-axis labels + bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: `${chartHeight}px`, position: 'relative', paddingLeft: '40px', paddingBottom: '24px', boxSizing: 'border-box' }}>
        {/* Y axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '4px', width: '38px' }}>
          {[4, 3, 2, 1, 0].map((step) => (
            <span key={step} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              {Math.round((maxVisits * step) / 4)}
            </span>
          ))}
        </div>
        {/* Bars */}
        {data.map((d, i) => {
          const heightPct = maxVisits > 0 ? Math.max((d.visits / maxVisits) * 100, 2) : 2
          const barAreaH = chartHeight - 24
          return (
            <div
              key={i}
              title={`${d.date}: ${d.visits} visite, ${d.orders} ordini`}
              style={{
                flex: 1,
                minWidth: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: `${barAreaH}px`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '80%',
                  height: `${heightPct}%`,
                  backgroundColor: d.visits > 0 ? 'var(--primary, #6366f1)' : 'var(--border-primary)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease',
                  cursor: 'default',
                }}
              />
            </div>
          )
        })}
      </div>
      {/* X axis labels */}
      <div style={{ display: 'flex', paddingLeft: '40px', gap: '2px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: '8px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {(i === 0 || i === data.length - 1 || (data.length <= 14) || i % Math.ceil(data.length / 10) === 0) ? d.date : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Donut-like pie chart (pure CSS)
// ---------------------------------------------------------------------------
function PieChart({ items }) {
  if (!items || items.length === 0) return null
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nessun dato.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item) => {
        const pct = Math.round((item.value / total) * 100)
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', flex: '0 0 90px' }}>{item.label}</span>
            <HBar value={item.value} max={total} color={item.color} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', flex: '0 0 40px', textAlign: 'right' }}>
              {pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panoramica Tab
// ---------------------------------------------------------------------------
function TabPanoramica({ summary, loadingS }) {
  if (loadingS) return <div style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Caricamento…</div>
  if (!summary) return null

  const kpis = [
    { icon: '👥', label: 'Visitatori unici', value: summary.unique_visitors.toLocaleString('it'), color: '#6366f1' },
    { icon: '📊', label: 'Sessioni totali', value: summary.total_sessions.toLocaleString('it'), color: '#0ea5e9' },
    { icon: '🛒', label: 'Ordini totali', value: summary.total_orders.toLocaleString('it'), color: '#10b981' },
    { icon: '💰', label: 'Fatturato totale', value: `€${summary.total_revenue.toLocaleString('it', { minimumFractionDigits: 2 })}`, color: '#f59e0b' },
    { icon: '📈', label: 'Tasso conversione', value: `${summary.conversion_rate.toFixed(1)}%`, color: '#ec4899', sub: `AOV €${summary.avg_order_value.toFixed(2)}` },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📅 Andamento visite nel periodo</h3>
        </div>
        <TrendChart data={summary.daily_trend} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Canali Tab
// ---------------------------------------------------------------------------
function TabCanali({ summary, loadingS }) {
  if (loadingS) return <div style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Caricamento…</div>
  if (!summary) return null

  const channels = summary.channels || []
  const pieItems = channels.map((c) => ({
    label: CHANNEL_LABELS[c.source] || c.source,
    value: c.visits,
    color: CHANNEL_COLORS[c.source] || '#888',
  }))

  const maxVisits = Math.max(...channels.map((c) => c.visits), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🌐 Distribuzione visite per canale</h3>
          </div>
          <PieChart items={pieItems} />
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Visite per canale</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {channels.map((c) => (
              <div key={c.source} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CHANNEL_COLORS[c.source] || '#888', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', flex: '0 0 80px' }}>
                  {CHANNEL_LABELS[c.source] || c.source}
                </span>
                <HBar value={c.visits} max={maxVisits} color={CHANNEL_COLORS[c.source] || '#888'} />
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', flex: '0 0 40px', textAlign: 'right' }}>
                  {c.visits}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dettaglio canali</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Canale</th>
                <th style={{ textAlign: 'right' }}>Visite</th>
                <th style={{ textAlign: 'right' }}>Ordini</th>
                <th style={{ textAlign: 'right' }}>Fatturato</th>
                <th style={{ textAlign: 'right' }}>Conv.%</th>
                <th style={{ textAlign: 'right' }}>AOV</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.source}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CHANNEL_COLORS[c.source] || '#888' }} />
                      {CHANNEL_LABELS[c.source] || c.source}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.visits}</td>
                  <td style={{ textAlign: 'right' }}>{c.orders}</td>
                  <td style={{ textAlign: 'right' }}>€{c.revenue.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{c.conversion_rate.toFixed(1)}%</td>
                  <td style={{ textAlign: 'right' }}>€{c.avg_order_value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conversioni Tab
// ---------------------------------------------------------------------------
function TabConversioni({ summary, loadingS }) {
  if (loadingS) return <div style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Caricamento…</div>
  if (!summary) return null

  const channels = summary.channels || []
  const maxRevenue = Math.max(...channels.map((c) => c.revenue), 1)
  const bestChannel = channels.reduce((best, c) => (!best || c.orders > best.orders ? c : best), null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {bestChannel && bestChannel.orders > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--success)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '2rem' }}>🏆</div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Canale con più conversioni</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {CHANNEL_LABELS[bestChannel.source] || bestChannel.source}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {bestChannel.orders} ordini · €{bestChannel.revenue.toFixed(2)} · {bestChannel.conversion_rate.toFixed(1)}% conv.
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">💰 Fatturato per canale</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {channels.map((c) => (
            <div key={c.source}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CHANNEL_COLORS[c.source] || '#888' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{CHANNEL_LABELS[c.source] || c.source}</span>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>€{c.revenue.toFixed(2)}</span>
              </div>
              <HBar value={c.revenue} max={maxRevenue} color={CHANNEL_COLORS[c.source] || '#888'} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Attribuzione ordini per canale</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Canale</th>
                <th style={{ textAlign: 'right' }}>Ordini</th>
                <th style={{ textAlign: 'right' }}>Fatturato</th>
                <th style={{ textAlign: 'right' }}>AOV</th>
                <th style={{ textAlign: 'right' }}>Tasso Conv.</th>
              </tr>
            </thead>
            <tbody>
              {channels
                .filter((c) => c.orders > 0)
                .sort((a, b) => b.orders - a.orders)
                .map((c) => (
                  <tr key={c.source}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CHANNEL_COLORS[c.source] || '#888' }} />
                        {CHANNEL_LABELS[c.source] || c.source}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{c.orders}</td>
                    <td style={{ textAlign: 'right' }}>€{c.revenue.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>€{c.avg_order_value.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{c.conversion_rate.toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Prodotti Tab
// ---------------------------------------------------------------------------
function TabProdotti({ topProducts, loadingP }) {
  if (loadingP) return <div style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Caricamento…</div>
  if (!topProducts) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard icon="🛒" label="Aggiunte al carrello" value={topProducts.add_to_cart_count} color="#6366f1" />
        <KpiCard icon="✅" label="Acquisti completati" value={topProducts.purchase_count} color="#10b981" />
        <KpiCard
          icon="🚪"
          label="Tasso abbandono carrello"
          value={`${topProducts.cart_abandonment_rate}%`}
          color="#f59e0b"
          sub="aggiunto al carrello senza acquisto"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏆 Top prodotti più venduti</h3>
        </div>
        {topProducts.top_sold && topProducts.top_sold.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prodotto</th>
                  <th style={{ textAlign: 'right' }}>Quantità venduta</th>
                  <th style={{ textAlign: 'right' }}>Fatturato</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.top_sold.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{i + 1}</td>
                    <td>{p.name}</td>
                    <td style={{ textAlign: 'right' }}>{p.quantity}</td>
                    <td style={{ textAlign: 'right' }}>€{p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nessun prodotto venduto nel periodo selezionato.</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utenti (devices) Tab
// ---------------------------------------------------------------------------
function TabUtenti({ devices, loadingD }) {
  if (loadingD) return <div style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Caricamento…</div>
  if (!devices) return null

  const pieItems = [
    { label: 'Mobile', value: devices.mobile, color: '#6366f1' },
    { label: 'Desktop', value: devices.desktop, color: '#0ea5e9' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard icon="📱" label="Visite da Mobile" value={`${devices.mobile} (${devices.mobile_pct}%)`} color="#6366f1" />
        <KpiCard icon="🖥️" label="Visite da Desktop" value={`${devices.desktop} (${devices.desktop_pct}%)`} color="#0ea5e9" />
        <KpiCard icon="👁️" label="Visite totali" value={devices.total} color="#10b981" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📱 Dispositivi: Mobile vs Desktop</h3>
        </div>
        <PieChart items={pieItems} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Storico Tab (monthly + annual history from analisiAPI)
// ---------------------------------------------------------------------------
function TabStorico() {
  const [mensile, setMensile] = useState(null)
  const [annuale, setAnnuale] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [anno, setAnno] = useState(new Date().getFullYear())

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      analisiAPI.getMensile(anno),
      analisiAPI.getAnnuale(),
    ])
      .then(([m, a]) => {
        setMensile(m.data)
        setAnnuale(a.data)
      })
      .catch((err) => {
        console.error('Errore caricamento storico:', err)
        setError('Errore nel caricamento dei dati storici.')
      })
      .finally(() => setLoading(false))
  }, [anno])

  const fmtEur = (v) => v != null ? `€${Number(v).toFixed(2)}` : '—'
  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>Caricamento…</div>
  if (error) return <div style={{ color: 'var(--danger, #ef4444)', padding: '16px', textAlign: 'center' }}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Monthly history */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <h3 className="card-title">📅 Storico Mensile</h3>
          <select
            value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
          >
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {mensile && mensile.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mese</th>
                  <th style={{ textAlign: 'right' }}>Ricavi</th>
                  <th style={{ textAlign: 'right' }}>Costi</th>
                  <th style={{ textAlign: 'right' }}>Spese</th>
                  <th style={{ textAlign: 'right' }}>Margine</th>
                </tr>
              </thead>
              <tbody>
                {mensile.map((m) => {
                  const margine = (m.ricavi || 0) - (m.costi || 0) - (m.totale_spese || 0)
                  return (
                    <tr key={m.mese}>
                      <td style={{ fontWeight: 500 }}>{mesi[m.mese - 1] || m.mese}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success, #10b981)', fontWeight: 600 }}>{fmtEur(m.ricavi)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtEur(m.costi)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtEur(m.totale_spese)}</td>
                      <td style={{ textAlign: 'right', color: margine >= 0 ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)', fontWeight: 700 }}>
                        {margine >= 0 ? '+' : ''}{fmtEur(margine)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nessun dato disponibile per l&apos;anno selezionato.</p>
        )}
      </div>

      {/* Annual history */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📆 Storico Annuale</h3>
        </div>
        {annuale && annuale.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Anno</th>
                  <th style={{ textAlign: 'right' }}>Ricavi</th>
                  <th style={{ textAlign: 'right' }}>Costi</th>
                  <th style={{ textAlign: 'right' }}>Spese</th>
                  <th style={{ textAlign: 'right' }}>Margine</th>
                </tr>
              </thead>
              <tbody>
                {annuale.map((a) => {
                  const margine = (a.ricavi || 0) - (a.costi || 0) - ((a.spese || 0) + (a.packaging || 0))
                  return (
                    <tr key={a.anno}>
                      <td style={{ fontWeight: 700 }}>{a.anno}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success, #10b981)', fontWeight: 600 }}>{fmtEur(a.ricavi)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtEur(a.costi)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtEur((a.spese || 0) + (a.packaging || 0))}</td>
                      <td style={{ textAlign: 'right', color: margine >= 0 ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)', fontWeight: 700 }}>
                        {margine >= 0 ? '+' : ''}{fmtEur(margine)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nessun dato storico disponibile.</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Statistiche() {
  const [tab, setTab] = useState('panoramica')
  const [period, setPeriod] = useState('30d')

  const [summary, setSummary] = useState(null)
  const [loadingS, setLoadingS] = useState(false)
  const [topProducts, setTopProducts] = useState(null)
  const [loadingP, setLoadingP] = useState(false)
  const [devices, setDevices] = useState(null)
  const [loadingD, setLoadingD] = useState(false)

  const fetchData = useCallback(async (p) => {
    setLoadingS(true)
    setLoadingP(true)
    setLoadingD(true)

    analyticsAPI.getSummary(p)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingS(false))

    analyticsAPI.getTopProducts(p)
      .then((res) => setTopProducts(res.data))
      .catch(() => setTopProducts(null))
      .finally(() => setLoadingP(false))

    analyticsAPI.getDevices(p)
      .then((res) => setDevices(res.data))
      .catch(() => setDevices(null))
      .finally(() => setLoadingD(false))
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  const tabs = [
    {
      key: 'panoramica',
      label: 'Panoramica',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      key: 'canali',
      label: 'Canali di traffico',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      key: 'conversioni',
      label: 'Conversioni',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      key: 'prodotti',
      label: 'Prodotti',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      key: 'utenti',
      label: 'Utenti & Dispositivi',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      key: 'storico',
      label: 'Storico',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18 17l-5-5-4 4-5-5" />
        </svg>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="page-title-section">
          <div className="page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Report &amp; Statistiche</h1>
            <p className="page-subtitle">Tracciamento traffico, vendite e conversioni per canale</p>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ marginBottom: '24px' }}>
        <PeriodSelector value={period} onChange={(p) => setPeriod(p)} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: tab === t.key ? '600' : '500',
              color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'panoramica' && <TabPanoramica summary={summary} loadingS={loadingS} />}
      {tab === 'canali' && <TabCanali summary={summary} loadingS={loadingS} />}
      {tab === 'conversioni' && <TabConversioni summary={summary} loadingS={loadingS} />}
      {tab === 'prodotti' && <TabProdotti topProducts={topProducts} loadingP={loadingP} />}
      {tab === 'utenti' && <TabUtenti devices={devices} loadingD={loadingD} />}
      {tab === 'storico' && <TabStorico />}
    </div>
  )
}
