import { useState, useEffect } from 'react'
import { prodottiAPI, ordiniAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

function StatCard({ title, value, color, emoji, isMobile }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: isMobile ? '16px' : '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderLeft: `6px solid ${color}`,
      minWidth: isMobile ? '0' : '180px',
      flex: 1,
    }}>
      <div style={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>{emoji}</div>
      <div style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#666', marginTop: '4px', fontSize: isMobile ? '0.85rem' : '1rem' }}>{title}</div>
    </div>
  )
}

function Dashboard() {
  const isMobile = useIsMobile()
  const [stats, setStats] = useState({
    totaleProdotti: 0,
    prodottiSottoScorta: 0,
    totaleOrdini: 0,
    ordiniRecenti: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodottiRes, sottoScortaRes, ordiniRes, tuttiOrdiniRes] = await Promise.all([
          prodottiAPI.getAll({ limit: 1000 }),
          prodottiAPI.getSottoScorta(),
          ordiniAPI.getAll({ limit: 5 }),
          ordiniAPI.getAll({ limit: 1000 }),
        ])
        setStats({
          totaleProdotti: prodottiRes.data.length,
          prodottiSottoScorta: sottoScortaRes.data.length,
          totaleOrdini: tuttiOrdiniRes.data.length,
          ordiniRecenti: ordiniRes.data,
        })
      } catch (err) {
        console.error('Errore nel caricamento dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Caricamento...</div>

  return (
    <div>
      <h1 style={{ marginBottom: '24px', color: '#1a237e' }}>📊 Dashboard</h1>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <StatCard
          title="Totale Prodotti"
          value={stats.totaleProdotti}
          color="#1a237e"
          emoji="📦"
          isMobile={isMobile}
        />
        <StatCard
          title="Sotto Scorta Minima"
          value={stats.prodottiSottoScorta}
          color="#d32f2f"
          emoji="⚠️"
          isMobile={isMobile}
        />
        <StatCard
          title="Ordini Totali"
          value={stats.totaleOrdini}
          color="#e65100"
          emoji="🛒"
          isMobile={isMobile}
        />
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ marginBottom: '16px', color: '#333' }}>🛒 Ordini Recenti</h2>
        {stats.ordiniRecenti.length === 0 ? (
          <p style={{ color: '#888' }}>Nessun ordine registrato.</p>
        ) : isMobile ? (
          <div>
            {stats.ordiniRecenti.map(o => (
              <div key={o.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#1a237e' }}>{o.numero_ordine || `#${o.id}`}</span>
                  <span style={{
                    fontSize: '0.8rem',
                    backgroundColor:
                      o.stato === 'in attesa' ? '#fff8e1' :
                      o.stato === 'confermato' ? '#e3f2fd' :
                      o.stato === 'spedito' ? '#e8f5e9' :
                      o.stato === 'annullato' ? '#ffebee' : '#f5f5f5',
                    color:
                      o.stato === 'in attesa' ? '#f9a825' :
                      o.stato === 'confermato' ? '#1565c0' :
                      o.stato === 'spedito' ? '#2e7d32' :
                      o.stato === 'annullato' ? '#c62828' : '#555',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}>{o.stato}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.85rem', color: '#555' }}>
                  <span>{o.cliente_nome || (o.cliente_id ? `Cliente #${o.cliente_id}` : '—')}</span>
                  <span>€{Number(o.totale || 0).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                  {o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Stato</th>
                <th style={thStyle}>Totale</th>
                <th style={thStyle}>Data</th>
              </tr>
            </thead>
            <tbody>
              {stats.ordiniRecenti.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{o.id}</td>
                  <td style={tdStyle}>Cliente #{o.cliente_id}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      backgroundColor:
                        o.stato === 'in attesa' ? '#fff8e1' :
                        o.stato === 'confermato' ? '#e3f2fd' :
                        o.stato === 'spedito' ? '#e8f5e9' :
                        o.stato === 'annullato' ? '#ffebee' : '#f5f5f5',
                      color:
                        o.stato === 'in attesa' ? '#f9a825' :
                        o.stato === 'confermato' ? '#1565c0' :
                        o.stato === 'spedito' ? '#2e7d32' :
                        o.stato === 'annullato' ? '#c62828' : '#555',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                    }}>
                      {o.stato}
                    </span>
                  </td>
                  <td style={tdStyle}>{o.totale != null ? `€${parseFloat(o.totale).toFixed(2)}` : '-'}</td>
                  <td style={tdStyle}>{o.data_ordine ? new Date(o.data_ordine).toLocaleString('it-IT') : '-'}</td>
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
  padding: '10px 12px',
  color: '#555',
  fontWeight: '600',
}

const tdStyle = {
  padding: '10px 12px',
  color: '#333',
}

export default Dashboard
