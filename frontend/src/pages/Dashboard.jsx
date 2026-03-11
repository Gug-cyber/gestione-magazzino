import { useState, useEffect } from 'react'
import { prodottiAPI, movimentiAPI } from '../api/client'

function StatCard({ title, value, color, emoji }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderLeft: `6px solid ${color}`,
      minWidth: '180px',
      flex: 1,
    }}>
      <div style={{ fontSize: '2rem' }}>{emoji}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#666', marginTop: '4px' }}>{title}</div>
    </div>
  )
}

function Dashboard() {
  const [stats, setStats] = useState({
    totaleProdotti: 0,
    prodottiSottoScorta: 0,
    movimentiRecenti: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodottiRes, sottoScortaRes, movimentiRes] = await Promise.all([
          prodottiAPI.getAll({ limit: 1000 }),
          prodottiAPI.getSottoScorta(),
          movimentiAPI.getAll({ limit: 5 }),
        ])
        setStats({
          totaleProdotti: prodottiRes.data.length,
          prodottiSottoScorta: sottoScortaRes.data.length,
          movimentiRecenti: movimentiRes.data,
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
        />
        <StatCard
          title="Sotto Scorta Minima"
          value={stats.prodottiSottoScorta}
          color="#d32f2f"
          emoji="⚠️"
        />
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ marginBottom: '16px', color: '#333' }}>🔄 Movimenti Recenti</h2>
        {stats.movimentiRecenti.length === 0 ? (
          <p style={{ color: '#888' }}>Nessun movimento registrato.</p>
        ) : (
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Prodotto ID</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Quantità</th>
                <th style={thStyle}>Data</th>
              </tr>
            </thead>
            <tbody>
              {stats.movimentiRecenti.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{m.id}</td>
                  <td style={tdStyle}>{m.prodotto_id}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      backgroundColor: m.tipo === 'carico' ? '#e8f5e9' : '#ffebee',
                      color: m.tipo === 'carico' ? '#2e7d32' : '#c62828',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                    }}>
                      {m.tipo}
                    </span>
                  </td>
                  <td style={tdStyle}>{m.quantita}</td>
                  <td style={tdStyle}>{m.data_movimento ? new Date(m.data_movimento).toLocaleString('it-IT') : '-'}</td>
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
