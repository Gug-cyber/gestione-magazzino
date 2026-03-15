import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fornitureAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_FORNITURA_COLORS, PRIMARY_COLOR } from '../constants/colors'
import { formatDate, formatCurrency } from '../utils/formatters'

const STATO_NEXT = {
  bozza: 'confermato',
  confermato: 'spedito',
  spedito: 'ricevuto',
}

const STATO_NEXT_LABEL = {
  confermato: '✅ Conferma',
  spedito: '🚚 Segna come Spedito',
  ricevuto: '📦 Segna come Ricevuto',
}

export default function DettaglioFornitura() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fornitura, setFornitura] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Caricamento...</div>
  if (error || !fornitura) return <div style={{ padding: '40px', color: '#c62828' }}>{error || 'Fornitura non trovata'}</div>

  const nextStato = STATO_NEXT[fornitura.stato]
  const isTerminale = fornitura.stato === 'ricevuto' || fornitura.stato === 'annullato'

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Breadcrumb/Back nav */}
      <button onClick={() => navigate('/forniture')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PRIMARY_COLOR, fontSize: '14px', marginBottom: '16px' }}>
        ← Torna alle forniture
      </button>

      {/* Header card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: PRIMARY_COLOR }}>{fornitura.numero_fornitura}</h2>
            <p style={{ margin: '4px 0', color: '#555' }}>Fornitore: <strong>{fornitura.fornitore_nome || '—'}</strong></p>
            <p style={{ margin: '4px 0', color: '#555' }}>Data: <strong>{formatDate(fornitura.data_fornitura)}</strong></p>
            {fornitura.data_ricezione && (
              <p style={{ margin: '4px 0', color: '#555' }}>Ricevuto il: <strong>{formatDate(fornitura.data_ricezione)}</strong></p>
            )}
            <p style={{ margin: '4px 0', color: '#555' }}>Totale: <strong style={{ color: PRIMARY_COLOR }}>{formatCurrency(fornitura.totale)}</strong></p>
            {fornitura.corriere && (
              <p style={{ margin: '4px 0', color: '#555' }}>Corriere: <strong>{fornitura.corriere}</strong>
                {fornitura.tracking_number && <span> — Tracking: <strong style={{ fontFamily: 'monospace' }}>{fornitura.tracking_number}</strong></span>}
              </p>
            )}
            {fornitura.note && <p style={{ margin: '4px 0', color: '#555' }}>Note: {fornitura.note}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <StatoBadge value={fornitura.stato} colors={STATO_FORNITURA_COLORS} capitalize />
            {nextStato && (
              <button
                onClick={() => handleChangeStato(nextStato)}
                style={{ backgroundColor: PRIMARY_COLOR, color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
              >
                {STATO_NEXT_LABEL[nextStato] || `Avanza → ${nextStato}`}
              </button>
            )}
            {!isTerminale && (
              <button
                onClick={() => handleChangeStato('annullato')}
                style={{ backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
              >
                ❌ Annulla Fornitura
              </button>
            )}
            {fornitura.stato === 'bozza' && (
              <button
                onClick={handleDelete}
                style={{ backgroundColor: '#fff', color: '#c62828', border: '1px solid #c62828', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}
              >
                🗑️ Elimina
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avviso ricevuto */}
      {fornitura.stato === 'ricevuto' && (
        <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
          <span style={{ fontSize: '15px', color: '#2e7d32' }}>
            ✅ Fornitura ricevuta: le quantità in magazzino sono state aggiornate automaticamente.
          </span>
        </div>
      )}

      {/* Tabella righe */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: PRIMARY_COLOR }}>🛒 Righe Fornitura</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                {['Prodotto', 'SKU', 'Quantità', 'Prezzo Unit.', 'Subtotale'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(fornitura.righe || []).map((r, i) => (
                <tr key={r.id || i} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.prodotto_nome || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#666', fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.prodotto_sku || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{r.quantita}</td>
                  <td style={{ padding: '12px 16px' }}>{formatCurrency(r.prezzo_unitario)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: PRIMARY_COLOR }}>{formatCurrency(r.subtotale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px 20px', borderTop: '2px solid #eee', textAlign: 'right' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: PRIMARY_COLOR }}>
            Totale: {formatCurrency(fornitura.totale)}
          </span>
        </div>
      </div>
    </div>
  )
}
