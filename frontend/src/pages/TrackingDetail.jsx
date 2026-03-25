import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trackingAPI } from '../api/tracking'
import { getTrackingUrl } from '../constants/corrieri'
import styles from './TrackingDetail.module.css'

export default function TrackingDetail() {
  const { trackingNumber } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [trackingNumber])

  const loadHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await trackingAPI.getHistory(trackingNumber)
      setHistory(res.data.updates)
    } catch {
      setError('Errore caricamento storico tracking')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await trackingAPI.refresh(trackingNumber)
      setTimeout(loadHistory, 3000)
    } catch {
      setError('Errore aggiornamento tracking')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return <div className={styles.loading}>Caricamento...</div>
  if (error) return <div className={styles.error}>{error}</div>

  const latestUpdate = history[0]
  const posteUrl = getTrackingUrl('Poste Italiane', trackingNumber)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>← Indietro</button>
        <h1>📦 Tracking: {trackingNumber}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {posteUrl && (
            <a href={posteUrl} target="_blank" rel="noopener noreferrer" className={styles.backBtn}>
              🔗 Vedi su Poste Italiane
            </a>
          )}
          <button onClick={handleRefresh} disabled={refreshing} className={styles.refreshBtn}>
            {refreshing ? '🔄 Aggiornamento...' : '🔄 Aggiorna'}
          </button>
        </div>
      </div>

      {latestUpdate ? (
        <div className={styles.currentStatus}>
          <h2>Stato Attuale</h2>
          <div className={styles.statusCard}>
            <span className={`${styles.statusBadge} ${latestUpdate.delivered ? styles.delivered : ''}`}>
              {latestUpdate.delivered ? '✅ Consegnato' : '🚚 In transito'}
            </span>
            <p className={styles.status}>{latestUpdate.status || 'Nessuno stato disponibile'}</p>
            {latestUpdate.location && (
              <p className={styles.location}>📍 {latestUpdate.location}</p>
            )}
            <p className={styles.date}>
              Ultimo aggiornamento:{' '}
              {latestUpdate.updated_at
                ? new Date(latestUpdate.updated_at).toLocaleString('it-IT')
                : '—'}
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.currentStatus}>
          <p className={styles.noHistory}>
            Nessun aggiornamento disponibile. Clicca su &quot;Aggiorna&quot; per recuperare lo stato della spedizione.
          </p>
        </div>
      )}

      <div className={styles.timeline}>
        <h2>Storico Eventi</h2>
        {history.length === 0 ? (
          <p className={styles.noEvents}>Nessun evento disponibile</p>
        ) : (
          <div className={styles.events}>
            {history.flatMap((update) =>
              (update.events || []).map((event, i) => (
                <div key={`${update.id}-${i}`} className={styles.event}>
                  <div className={styles.eventDate}>
                    {event.date ? new Date(event.date).toLocaleString('it-IT') : '—'}
                  </div>
                  <div className={styles.eventContent}>
                    <p className={styles.eventStatus}>{event.status}</p>
                    {event.location && (
                      <p className={styles.eventLocation}>📍 {event.location}</p>
                    )}
                    {event.description && (
                      <p className={styles.eventDescription}>{event.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
