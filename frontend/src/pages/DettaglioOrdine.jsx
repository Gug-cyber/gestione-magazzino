import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordiniAPI, fattureAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_ORDINE_COLORS } from '../constants/colors'
import { CORRIERI } from '../constants/corrieri'
import { formatDate, formatCurrency } from '../utils/formatters'
import '../styles/shared.css'

const STATO_NEXT = {
  bozza: 'confermato',
  confermato: 'spedito',
  spedito: 'completato',
}

// Icons
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

const PackageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

export default function DettaglioOrdine() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ordine, setOrdine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fatturaOrdine, setFatturaOrdine] = useState(null)
  const [trackingEdit, setTrackingEdit] = useState(false)
  const [trackingForm, setTrackingForm] = useState({ corriere: '', tracking_number: '' })
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await ordiniAPI.getById(id)
        setOrdine(res.data)
        if (res.data.stato === 'completato' || res.data.stato === 'annullato') {
          const fr = await fattureAPI.getByOrdine(res.data.id)
          const fatture = fr.data || []
          const fattura = fatture.find(f => f.tipo_documento === 'fattura' && f.auto_generata)
          setFatturaOrdine(fattura || null)
        }
      } catch {
        setError('Ordine non trovato')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleChangeStato = async (nuovoStato) => {
    try {
      await ordiniAPI.updateStato(ordine.id, nuovoStato)
      const res = await ordiniAPI.getById(ordine.id)
      setOrdine(res.data)
      if (res.data.stato === 'completato' || res.data.stato === 'annullato') {
        const fr = await fattureAPI.getByOrdine(ordine.id)
        const fatture = fr.data || []
        const fattura = fatture.find(f => f.tipo_documento === 'fattura' && f.auto_generata)
        setFatturaOrdine(fattura || null)
      } else {
        setFatturaOrdine(null)
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Errore nel cambio stato')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Eliminare questo ordine?')) return
    try {
      await ordiniAPI.delete(ordine.id)
      navigate('/ordini')
    } catch (err) {
      alert(err?.response?.data?.detail || "Errore nell'eliminazione")
    }
  }

  if (loading) return <div className="loading-state">Caricamento...</div>
  if (error || !ordine) return <div className="error-banner">{error || 'Ordine non trovato'}</div>

  const nextStato = STATO_NEXT[ordine.stato]

  return (
    <>
      <div className="page-container">
        {/* Back button */}
        <button onClick={() => navigate('/ordini')} className="btn-back" style={{ marginBottom: '16px' }}>
          <ArrowLeftIcon /> Torna agli ordini
        </button>

        {/* Header card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem' }}>{ordine.numero_ordine}</h2>
              <p style={{ margin: '8px 0 4px', color: 'var(--text-secondary)' }}>Cliente: <strong style={{ color: 'var(--text-primary)' }}>{ordine.cliente_nome || '-'}</strong></p>
              <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Data: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(ordine.data_ordine)}</strong></p>
              {ordine.data_completamento && (
                <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Completato il: <strong style={{ color: 'var(--text-primary)' }}>{formatDate(ordine.data_completamento)}</strong></p>
              )}
              {(ordine.corriere || ordine.tracking_number) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', color: 'var(--text-secondary)' }}>
                  Corriere: <strong style={{ color: 'var(--text-primary)' }}>{ordine.corriere || '-'}</strong>
                  {ordine.tracking_number && <span> - Tracking: <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{ordine.tracking_number}</strong></span>}
                  <button
                    onClick={() => { setTrackingForm({ corriere: ordine.corriere || '', tracking_number: ordine.tracking_number || '' }); setTrackingEdit(true) }}
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
              {ordine.note && <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>Note: {ordine.note}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <StatoBadge value={ordine.stato} colors={STATO_ORDINE_COLORS} capitalize />
              {nextStato && (
                <button onClick={() => handleChangeStato(nextStato)} className="btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }}>
                  Avanza → {nextStato}
                </button>
              )}
              {ordine.stato !== 'annullato' && ordine.stato !== 'completato' && (
                <button onClick={() => handleChangeStato('annullato')} className="btn-danger" style={{ fontSize: '13px', padding: '6px 14px' }}>
                  Annulla ordine
                </button>
              )}
              {ordine.stato === 'completato' && (
                <button onClick={() => handleChangeStato('annullato')} className="btn-danger" style={{ fontSize: '13px', padding: '6px 14px' }}>
                  Annulla (ripristina magazzino)
                </button>
              )}
              <button onClick={handleDelete} className="btn-secondary" style={{ fontSize: '13px', padding: '6px 14px', color: 'var(--danger)' }}>
                <TrashIcon /> Elimina
              </button>
            </div>
          </div>
        </div>

        {/* Fattura auto-generata */}
        {fatturaOrdine && (
          <div className="card" style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <FileTextIcon />
              <div>
                <strong style={{ color: 'var(--success)' }}>Fattura generata automaticamente</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  N. <strong>{fatturaOrdine.numero_fattura}</strong>
                  {' - '}{formatDate(fatturaOrdine.data_fattura)}
                  {fatturaOrdine.imponibile != null && (
                    <> - Imponibile: <strong>{formatCurrency(fatturaOrdine.imponibile)}</strong>
                    {' + IVA '}{fatturaOrdine.aliquota_iva}%: <strong>{formatCurrency(fatturaOrdine.importo_iva)}</strong>
                    {' = '}<strong style={{ color: 'var(--primary)' }}>{formatCurrency(fatturaOrdine.importo)}</strong></>
                  )}
                  {fatturaOrdine.annullata && (
                    <span style={{ marginLeft: '8px', color: 'var(--danger)', fontWeight: 600 }}> - ANNULLATA (nota di credito emessa)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabella righe */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageIcon />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Righe Ordine</h3>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Prodotto</th>
                  <th>SKU</th>
                  <th>Quantita</th>
                  <th>Prezzo Unit.</th>
                  <th>Subtotale</th>
                </tr>
              </thead>
              <tbody>
                {(ordine.righe || []).map((r, i) => (
                  <tr key={r.id || i}>
                    <td className="text-bold">{r.prodotto_nome || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.prodotto_sku || '-'}</td>
                    <td>{r.quantita}</td>
                    <td>{formatCurrency(r.prezzo_unitario)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(r.subtotale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-primary)', textAlign: 'right' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
              Totale: {formatCurrency(ordine.totale)}
            </span>
          </div>
        </div>
      </div>

      {/* Tracking Edit Modal */}
      {trackingEdit && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EditIcon /> Modifica Tracking - {ordine.numero_ordine}
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
                    await ordiniAPI.updateTracking(ordine.id, {
                      corriere: trackingForm.corriere || null,
                      tracking_number: trackingForm.tracking_number || null,
                    })
                    setOrdine(prev => ({ ...prev, corriere: trackingForm.corriere, tracking_number: trackingForm.tracking_number }))
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
