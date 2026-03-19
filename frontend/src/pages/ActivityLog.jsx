import { useState, useEffect, useCallback } from 'react'
import { activityLogAPI, amministrazioneAPI } from '../api/client'
import { PRIMARY_COLOR } from '../constants/colors'

const PAGE_SIZE = 50

function getAzioneBadge(azione) {
  if (!azione) return { bg: '#f5f5f5', color: '#616161' }
  if (azione.startsWith('crea_')) return { bg: '#e8f5e9', color: '#2e7d32' }
  if (azione.startsWith('modifica_')) return { bg: '#fff3e0', color: '#e65100' }
  if (azione.startsWith('elimina_')) return { bg: '#ffebee', color: '#c62828' }
  if (azione === 'login' || azione === 'logout') return { bg: '#e3f2fd', color: '#1565c0' }
  return { bg: '#f5f5f5', color: '#616161' }
}

function formatDate(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [utenti, setUtenti] = useState([])
  const [filtroUtente, setFiltroUtente] = useState('')
  const [filtroAzione, setFiltroAzione] = useState('')
  const [appliedUtente, setAppliedUtente] = useState('')
  const [appliedAzione, setAppliedAzione] = useState('')

  useEffect(() => {
    amministrazioneAPI.getUtenti()
      .then(res => setUtenti(res.data || []))
      .catch(() => {})
  }, [])

  const fetchLogs = useCallback(async (currentPage, utenteId, azione) => {
    setLoading(true)
    setError(null)
    try {
      const params = { skip: currentPage * PAGE_SIZE, limit: PAGE_SIZE }
      if (utenteId) params.utente_id = utenteId
      if (azione) params.azione = azione
      const res = await activityLogAPI.getAll(params)
      setLogs(res.data || [])
      const tot = parseInt(res.headers?.['x-total-count'] ?? res.headers?.['X-Total-Count'] ?? '0', 10)
      setTotal(isNaN(tot) ? 0 : tot)
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel caricamento dei log')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(page, appliedUtente, appliedAzione)
  }, [page, appliedUtente, appliedAzione, fetchLogs])

  const handleApply = () => {
    setPage(0)
    setAppliedUtente(filtroUtente)
    setAppliedAzione(filtroAzione)
  }

  const handleReset = () => {
    setFiltroUtente('')
    setFiltroAzione('')
    setPage(0)
    setAppliedUtente('')
    setAppliedAzione('')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px', color: '#1a1a2e' }}>
        📋 Log Attività
      </h1>

      {/* Filter bar */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end',
      }}>
        <div>
          <label style={labelStyle}>Utente</label>
          <select
            value={filtroUtente}
            onChange={e => setFiltroUtente(e.target.value)}
            style={selectStyle}
          >
            <option value="">Tutti</option>
            {utenti.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Azione</label>
          <input
            type="text"
            value={filtroAzione}
            onChange={e => setFiltroAzione(e.target.value)}
            placeholder="es. login, crea_prodotto..."
            style={{ ...inputStyle, width: '200px' }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
        </div>
        <button onClick={handleApply} style={btnStyle}>🔍 Applica</button>
        <button onClick={handleReset} style={{ ...btnStyle, background: '#546e7a' }}>↩️ Reset</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            ⏳ Caricamento...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            Nessun log trovato.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e4ef' }}>
                  {['Data/Ora', 'Utente', 'Azione', 'Entità', 'ID', 'Dettagli'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const badge = getAzioneBadge(log.azione)
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={tdStyle}>{formatDate(log.eseguito_il)}</td>
                      <td style={tdStyle}>{log.username || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          background: badge.bg,
                          color: badge.color,
                          fontWeight: 600,
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                        }}>
                          {log.azione}
                        </span>
                      </td>
                      <td style={tdStyle}>{log.entita || '—'}</td>
                      <td style={tdStyle}>{log.entita_id ?? '—'}</td>
                      <td style={{ ...tdStyle, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.dettagli || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ ...btnStyle, opacity: page === 0 ? 0.4 : 1 }}
          >
            ‹ Prev
          </button>
          <span style={{ fontSize: '14px', color: '#555' }}>
            Pagina {page + 1} di {totalPages} ({total} totali)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ ...btnStyle, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#555',
  marginBottom: '4px',
}

const inputStyle = {
  height: '36px',
  padding: '0 10px',
  borderRadius: '6px',
  border: '1.5px solid #e0e4ef',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: '#1a1a2e',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle = {
  ...inputStyle,
  width: '160px',
  cursor: 'pointer',
}

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '36px',
  padding: '0 16px',
  backgroundColor: PRIMARY_COLOR,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 700,
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 14px',
  color: '#333',
  fontSize: '13px',
  whiteSpace: 'nowrap',
}

export default ActivityLog
