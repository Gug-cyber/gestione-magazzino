import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fornitureAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_FORNITURA_COLORS } from '../constants/colors'
import { CORRIERI } from '../constants/corrieri'
import { formatDate, formatCurrency } from '../utils/formatters'
import '../styles/shared.css'

const STATO_NEXT = {
  bozza: 'confermato',
  confermato: 'spedito',
  spedito: 'ricevuto',
}

const STATO_NEXT_LABEL = {
  confermato: 'Conferma',
  spedito: 'Segna come Spedito',
  ricevuto: 'Segna come Ricevuto',
}

// Icons
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

const PackageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const TruckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const TagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)

export default function DettaglioFornitura() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fornitura, setFornitura] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trackingEdit, setTrackingEdit] = useState(false)
  const [trackingForm, setTrackingForm] = useState({ corriere: '', tracking_number: '' })
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fornitureAPI.getById(id)
        setFornitura(res.data)
      } catch {
        setError('Fornitura non trovata')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleChangeStato = async (nuovoStato) => {
    try {
      await fornitureAPI.update(fornitura.id, { stato: nuovoStato })
      const res = await fornitureAPI.getById(fornitura.id)
      setFornitura(res.data)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Errore nel cambio stato')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Eliminare questa fornitura?')) return
    try {
      await fornitureAPI.delete(fornitura.id)
      navigate('/forniture')
    } catch (err) {
      alert(err?.response?.data?.detail || "Errore nell'eliminazione")
    }
  }

  if (loading) return <div className="loading-state">Caricamento...</div>
  if (error || !fornitura) return <div className="error-banner">{error || 'Fornitura non trovata'}</div>

  const nextStato = STATO_NEXT[fornitura.stato]
  const isTerminale = fornitura.stato === 'ricevuto' || fornitura.stato === 'annullato'

  return (
    <>
      <div className="page-container">
        {/* Back button */}
        <button onClick={() => navigate('/forniture')} className="btn-back" style={{ marginBottom: '16px' }}>
          <ArrowLeftIcon /> Torna alle forniture
        </button>

        {/* Header card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div className="page-icon" style={{ width: '40px', height: '40px' }}>
                  <TruckIcon />
                </div>
                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem' }}>{fornitura.numero_fornitura}</h2>
              </div>
              <p style={{ margin: '8px 0 4px', color: 'var(--text-secondary)' }}>Fornitore: <strong style={{ color: 'var(--text-primary)' }}>{fornitura.fornitore_nome || '-'}</strong></p>
              <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Data: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(fornitura.data_fornitura)}</strong></p>
              {fornitura.data_ricezione && (
                <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Ricevuto il: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(fornitura.data_ricezione)}</strong></p>
              )}
              <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Totale: <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{formatCurrency(fornitura.totale)}</strong></p>
              {(fornitura.corriere || fornitura.tracking_number) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', color: 'var(--text-secondary)' }}>
                  Corriere: <strong style={{ color: 'var(--text-primary)' }}>{fornitura.corriere || '-'}</strong>
                  {fornitura.tracking_number && <span> - Tracking: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{fornitura.tracking_number}</strong></span>}
                  <button
                    onClick={() => { setTrackingForm({ corriere: fornitura.corriere || '', tracking_number: fornitura.tracking_number || '' }); setTrackingEdit(true) }}
                    title="Modifica tracking"
                    className="btn-icon btn-icon-gray"
                    style={{ marginLeft: '4px' }}
                  >
                    <EditIcon />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Nessun tracking</span>
                  <button
                    onClick={() => { setTrackingForm({ corriere: '', tracking_number: '' }); setTrackingEdit(true) }}
                    title="Aggiungi tracking"
                    className="btn-icon btn-icon-gray"
                  >
                    <EditIcon />
                  </button>
                </div>
              )}
              {fornitura.note && <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Note: {fornitura.note}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <StatoBadge value={fornitura.stato} colors={STATO_FORNITURA_COLORS} capitalize />
              {nextStato && (
                <button onClick={() => handleChangeStato(nextStato)} className="btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }}>
                  <CheckIcon /> {STATO_NEXT_LABEL[nextStato] || `Avanza`}
                </button>
              )}
              {!isTerminale && (
                <button onClick={() => handleChangeStato('annullato')} className="btn-danger" style={{ fontSize: '13px', padding: '6px 14px' }}>
                  <XIcon /> Annulla Fornitura
                </button>
              )}
              {fornitura.stato === 'bozza' && (
                <button onClick={handleDelete} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 14px', color: 'var(--danger)' }}>
                  <TrashIcon /> Elimina
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Avviso ricevuto */}
        {fornitura.stato === 'ricevuto' && (
          <div className="card" style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckIcon />
              <span style={{ color: 'var(--success)' }}>
                Fornitura ricevuta: le quantita in magazzino sono state aggiornate automaticamente. I costi packaging sono stati registrati in Analisi Finanziaria.
              </span>
            </div>
          </div>
        )}

        {/* Tabella righe */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageIcon />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Righe Fornitura</h3>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Prodotto / Descrizione</th>
                  <th>SKU</th>
                  <th>Quantita</th>
                  <th>Prezzo Unit.</th>
                  <th>Subtotale</th>
                </tr>
              </thead>
              <tbody>
                {(fornitura.righe || []).map((r, i) => {
                  const isPackaging = r.tipo_voce === 'packaging'
                  return (
                    <tr key={r.id || i} style={{ background: isPackaging ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                      <td>
                        {isPackaging ? (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
                            <TagIcon /> Packaging
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                            <PackageIcon /> Prodotto
                          </span>
                        )}
                      </td>
                      <td className="text-bold">{isPackaging ? (r.descrizione || '-') : (r.prodotto_nome || r.descrizione || '-')}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.prodotto_sku || '-'}</td>
                      <td>{r.quantita}</td>
                      <td>{formatCurrency(r.prezzo_unitario)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(r.subtotale)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-primary)', textAlign: 'right' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
              Totale: {formatCurrency(fornitura.totale)}
            </span>
          </div>
        </div>
      </div>

      {/* Tracking Edit Modal */}
      {trackingEdit && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EditIcon /> Modifica Tracking - {fornitura.numero_fornitura}
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Corriere</label>
              <select
                value={trackingForm.corriere}
                onChange={e => setTrackingForm(prev => ({ ...prev, corriere: e.target.value }))}
                className="form-input"
              >
                <option value="">- Nessun corriere -</option>
                {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Numero Tracking</label>
              <input
                value={trackingForm.tracking_number}
                onChange={e => setTrackingForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                placeholder="Codice tracking..."
                className="form-input"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setTrackingEdit(false)} disabled={trackingLoading} className="btn-secondary">
                Annulla
              </button>
              <button
                onClick={async () => {
                  setTrackingLoading(true)
                  try {
                    await fornitureAPI.update(fornitura.id, {
                      corriere: trackingForm.corriere || null,
                      tracking_number: trackingForm.tracking_number || null,
                    })
                    setFornitura(prev => ({ ...prev, corriere: trackingForm.corriere, tracking_number: trackingForm.tracking_number }))
                    setTrackingEdit(false)
                  } catch (err) {
                    alert(err?.response?.data?.detail || 'Errore nel salvataggio')
                  } finally {
                    setTrackingLoading(false)
                  }
                }}
                disabled={trackingLoading}
                className="btn-primary"
              >
                {trackingLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
