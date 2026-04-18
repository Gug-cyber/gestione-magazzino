import { useState, useEffect, useCallback } from 'react'
import { activityLogAPI, amministrazioneAPI } from '../api/client'
import { PRIMARY_COLOR } from '../constants/colors'
import { getAzioneBadge } from '../utils/formatters'

const PAGE_SIZE = 50

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Filters
  const [utenti, setUtenti] = useState([])
  const [filtroUtente, setFiltroUtente] = useState('')
  const [filtroAzione, setFiltroAzione] = useState('')
  const [appliedUtente, setAppliedUtente] = useState('')
  const [appliedAzione, setAppliedAzione] = useState('')

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

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
      <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 700, marginBottom: '20px', color: '#1a1a2e' }}>
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
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: isMobile ? 'stretch' : 'flex-end',
      }}>
        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <label style={labelStyle}>Utente</label>
          <select
            value={filtroUtente}
            onChange={e => setFiltroUtente(e.target.value)}
            style={{ ...selectStyle, width: isMobile ? '100%' : '160px', fontSize: 16, minHeight: 44, boxSizing: 'border-box' }}
          >
            <option value="">Tutti</option>
            {utenti.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <label style={labelStyle}>Azione</label>
          <input
            type="text"
            value={filtroAzione}
            onChange={e => setFiltroAzione(e.target.value)}
            placeholder="es. login, crea_prodotto..."
            style={{ ...inputStyle, width: isMobile ? '100%' : '200px', fontSize: 16, minHeight: 44, boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
          />
        </div>
        <button onClick={handleApply} style={{ ...btnStyle, minHeight: 44, width: isMobile ? '100%' : 'auto' }}>🔍 Applica</button>
        <button onClick={handleReset} style={{ ...btnStyle, background: '#546e7a', minHeight: 44, width: isMobile ? '100%' : 'auto' }}>↩️ Reset</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            ⏳ Caricamento...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            Nessun log trovato.
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
            {logs.map((log) => {
              const badge = getAzioneBadge(log.azione)
              return (
                <div key={log.id} style={{ background: 'white', borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>{formatDate(log.eseguito_il)}</span>
                    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, background: badge.bg, color: badge.color, fontWeight: 600, fontSize: 12 }}>{log.azione}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#333', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><strong>Utente:</strong> {log.username || '—'}</div>
                    <div><strong>Entità:</strong> {log.entita || '—'} {log.entita_id != null ? `#${log.entita_id}` : ''}</div>
                    {log.dettagli && <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{log.dettagli}</div>}
                  </div>
                </div>
              )
            })}
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ ...btnStyle, opacity: page === 0 ? 0.4 : 1, minHeight: 44 }}
          >
            ‹ Prev
          </button>
          <span style={{ fontSize: '14px', color: '#555' }}>
            Pagina {page + 1} di {totalPages} ({total} totali)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ ...btnStyle, opacity: page >= totalPages - 1 ? 0.4 : 1, minHeight: 44 }}
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
