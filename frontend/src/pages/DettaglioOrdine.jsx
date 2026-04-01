import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordiniAPI, fattureAPI, clientiAPI, prodottiAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_ORDINE_COLORS, PRIMARY_COLOR } from '../constants/colors'
import { CORRIERI } from '../constants/corrieri'
import { formatDate, formatCurrency } from '../utils/formatters'

const STATO_NEXT = {
  bozza: 'confermato',
  confermato: 'spedito',
  spedito: 'completato',
}

const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }

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
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ cliente_id: '', cliente_nome: '', note: '', corriere: '', tracking_number: '', righe: [{ ...emptyRiga }] })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [clienti, setClienti] = useState([])
  const [prodotti, setProdotti] = useState([])

  useEffect(() => {
    clientiAPI.getAll().then(r => setClienti(r.data)).catch(err => console.error('Errore caricamento clienti:', err))
    prodottiAPI.getAll({ limit: 200 }).then(r => setProdotti(r.data)).catch(err => console.error('Errore caricamento prodotti:', err))
  }, [])

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

  const openEditModal = () => {
    setEditForm({
      cliente_id: ordine.cliente_id ? String(ordine.cliente_id) : '',
      cliente_nome: ordine.cliente_nome || '',
      note: ordine.note || '',
      corriere: ordine.corriere || '',
      tracking_number: ordine.tracking_number || '',
      righe: (ordine.righe || []).length > 0
        ? ordine.righe.map(r => ({ prodotto_id: String(r.prodotto_id), quantita: r.quantita, prezzo_unitario: r.prezzo_unitario }))
        : [{ ...emptyRiga }],
    })
    setEditError('')
    setEditModal(true)
  }

  const handleEditRigaChange = (index, field, value) => {
    setEditForm(prev => {
      const righe = [...prev.righe]
      righe[index] = { ...righe[index], [field]: value }
      if (field === 'prodotto_id') {
        const prod = prodotti.find(p => p.id === parseInt(value))
        if (prod) righe[index].prezzo_unitario = prod.prezzo_vendita || 0
      }
      return { ...prev, righe }
    })
  }

  const handleAddEditRiga = () => setEditForm(prev => ({ ...prev, righe: [...prev.righe, { ...emptyRiga }] }))

  const handleRemoveEditRiga = (index) => setEditForm(prev => ({ ...prev, righe: prev.righe.filter((_, i) => i !== index) }))

  const editTotale = editForm.righe.reduce((acc, r) => acc + (Number(r.quantita) * Number(r.prezzo_unitario)), 0)

  const handleEditSubmit = async () => {
    setEditError('')
    const righe = editForm.righe.filter(r => r.prodotto_id)
    if (!righe.length) { setEditError('Aggiungi almeno un prodotto'); return }
    setEditLoading(true)
    try {
      const payload = {
        cliente_id: editForm.cliente_id ? parseInt(editForm.cliente_id) : null,
        cliente_nome: editForm.cliente_nome || null,
        note: editForm.note || null,
        corriere: editForm.corriere || null,
        tracking_number: editForm.tracking_number || null,
        righe: righe.map(r => ({
          prodotto_id: parseInt(r.prodotto_id),
          quantita: parseInt(r.quantita),
          prezzo_unitario: parseFloat(r.prezzo_unitario),
        })),
      }
      await ordiniAPI.updateFull(ordine.id, payload)
      const res = await ordiniAPI.getById(ordine.id)
      setOrdine(res.data)
      setEditModal(false)
      alert('Ordine modificato con successo')
    } catch (err) {
      setEditError(err?.response?.data?.detail || "Errore nel salvataggio dell'ordine")
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Caricamento...</div>
  if (error || !ordine) return <div style={{ padding: '40px', color: '#c62828' }}>{error || 'Ordine non trovato'}</div>

  const nextStato = STATO_NEXT[ordine.stato]

  return (
    <>
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Breadcrumb/Back nav */}
      <button onClick={() => navigate('/ordini')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PRIMARY_COLOR, fontSize: '14px', marginBottom: '16px' }}>
        ← Torna agli ordini
      </button>

      {/* Header card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: PRIMARY_COLOR }}>{ordine.numero_ordine}</h2>
            <p style={{ margin: '4px 0', color: '#555' }}>Cliente: <strong>{ordine.cliente_nome || '—'}</strong></p>
            <p style={{ margin: '4px 0', color: '#555' }}>Data: <strong>{formatDate(ordine.data_ordine)}</strong></p>
            {ordine.data_completamento && (
              <p style={{ margin: '4px 0', color: '#555' }}>Completato il: <strong>{formatDate(ordine.data_completamento)}</strong></p>
            )}
            {(ordine.corriere || ordine.tracking_number) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0', color: '#555' }}>
                Corriere: <strong>{ordine.corriere || '—'}</strong>
                {ordine.tracking_number && <span> — Tracking: <strong style={{ fontFamily: 'monospace' }}>{ordine.tracking_number}</strong></span>}
                <button
                  onClick={() => { setTrackingForm({ corriere: ordine.corriere || '', tracking_number: ordine.tracking_number || '' }); setTrackingEdit(true) }}
                  title="Modifica tracking"
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '26px', border: 'none', borderRadius: '5px',
                    background: 'transparent', cursor: 'pointer', fontSize: '14px',
                    color: '#666', padding: 0, flexShrink: 0, lineHeight: 1,
                    transition: 'background 0.15s'
                  }}
                >✏️</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                <span style={{ color: '#aaa' }}>Nessun tracking</span>
                <button
                  onClick={() => { setTrackingForm({ corriere: '', tracking_number: '' }); setTrackingEdit(true) }}
                  title="Aggiungi tracking"
                  style={{ 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '26px', border: 'none', borderRadius: '5px',
                    background: 'transparent', cursor: 'pointer', fontSize: '14px',
                    color: '#666', padding: 0, flexShrink: 0, lineHeight: 1,
                    transition: 'background 0.15s'
                  }}
                >✏️</button>
              </div>
            )}
            {ordine.note && <p style={{ margin: '4px 0', color: '#555' }}>Note: {ordine.note}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <StatoBadge value={ordine.stato} colors={STATO_ORDINE_COLORS} capitalize />
            {nextStato && (
              <button onClick={() => handleChangeStato(nextStato)} style={{ backgroundColor: PRIMARY_COLOR, color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
                Avanza → {nextStato}
              </button>
            )}
            {ordine.stato !== 'annullato' && ordine.stato !== 'completato' && (
              <button onClick={() => handleChangeStato('annullato')} style={{ backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
                Annulla ordine
              </button>
            )}
            {ordine.stato === 'completato' && (
              <button onClick={() => handleChangeStato('annullato')} style={{ backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
                Annulla (ripristina magazzino)
              </button>
            )}
            <button onClick={handleDelete} style={{ backgroundColor: '#fff', color: '#c62828', border: '1px solid #c62828', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
              🗑️ Elimina
            </button>
            {ordine.stato === 'bozza' ? (
              <button onClick={openEditModal} style={{ backgroundColor: '#1565c0', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
                ✏️ Modifica Ordine
              </button>
            ) : (
              <button
                disabled
                title={`Solo ordini in bozza possono essere modificati (stato attuale: ${ordine.stato})`}
                style={{ backgroundColor: '#e0e0e0', color: '#999', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'not-allowed', fontSize: '13px' }}
              >
                ✏️ Modifica Ordine
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fattura auto-generata */}
      {fatturaOrdine && (
        <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>🧾</span>
            <div>
              <strong style={{ color: '#2e7d32' }}>Fattura generata automaticamente</strong>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                N° <strong>{fatturaOrdine.numero_fattura}</strong>
                {' — '}{formatDate(fatturaOrdine.data_fattura)}
                {fatturaOrdine.imponibile != null && (
                  <> — Imponibile: <strong>{formatCurrency(fatturaOrdine.imponibile)}</strong>
                  {' + IVA '}{fatturaOrdine.aliquota_iva}%: <strong>{formatCurrency(fatturaOrdine.importo_iva)}</strong>
                  {' = '}<strong>{formatCurrency(fatturaOrdine.importo)}</strong></>
                )}
                {fatturaOrdine.annullata && (
                  <span style={{ marginLeft: '8px', color: '#c62828', fontWeight: 600 }}>— ANNULLATA (nota di credito emessa)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabella righe */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ margin: 0, color: PRIMARY_COLOR }}>📦 Righe Ordine</h3>
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
              {(ordine.righe || []).map((r, i) => (
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
            Totale: {formatCurrency(ordine.totale)}
          </span>
        </div>
      </div>
    </div>

    {/* Tracking Edit Modal */}
    {trackingEdit && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '28px', width: '90%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <h3 style={{ marginTop: 0, color: PRIMARY_COLOR }}>✏️ Modifica Tracking — {ordine.numero_ordine}</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Corriere</label>
            <select
              value={trackingForm.corriere}
              onChange={e => setTrackingForm(prev => ({ ...prev, corriere: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="">— Nessun corriere —</option>
              {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Numero Tracking</label>
            <input
              value={trackingForm.tracking_number}
              onChange={e => setTrackingForm(prev => ({ ...prev, tracking_number: e.target.value }))}
              placeholder="Codice tracking..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setTrackingEdit(false)} disabled={trackingLoading} style={{ backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Annulla</button>
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
              style={{ backgroundColor: PRIMARY_COLOR, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: trackingLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {trackingLoading ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Edit Order Modal */}
    {editModal && (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '24px 0' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '28px', width: '90%', maxWidth: '700px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <h3 style={{ marginTop: 0, color: PRIMARY_COLOR }}>✏️ Modifica Ordine — {ordine.numero_ordine}</h3>

          {editError && <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{editError}</div>}

          {/* Cliente */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Cliente</label>
            <select
              value={editForm.cliente_id}
              onChange={e => setEditForm(prev => ({ ...prev, cliente_id: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            >
              <option value="">— Seleziona cliente —</option>
              {clienti.map(c => (
                <option key={c.id} value={c.id}>{c.nome}{c.cognome ? ` ${c.cognome}` : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Nome cliente (manuale)</label>
            <input
              value={editForm.cliente_nome}
              onChange={e => setEditForm(prev => ({ ...prev, cliente_nome: e.target.value }))}
              placeholder="Nome cliente..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Note</label>
            <textarea
              value={editForm.note}
              onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Note aggiuntive..."
              rows={2}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Corriere e Tracking */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Corriere</label>
              <select
                value={editForm.corriere}
                onChange={e => setEditForm(prev => ({ ...prev, corriere: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">— Nessun corriere —</option>
                {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Numero Tracking</label>
              <input
                value={editForm.tracking_number}
                onChange={e => setEditForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                placeholder="Codice tracking..."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Righe prodotti */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', color: '#555', fontWeight: 600 }}>Righe prodotti</label>
              <button type="button" onClick={handleAddEditRiga} style={{ backgroundColor: PRIMARY_COLOR, color: '#fff', border: 'none', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}>+ Aggiungi riga</button>
            </div>
            {editForm.righe.map((riga, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 3 }}>
                  {index === 0 && <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', color: '#777' }}>Prodotto</label>}
                  <select
                    value={riga.prodotto_id}
                    onChange={e => handleEditRigaChange(index, 'prodotto_id', e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="">— Seleziona prodotto —</option>
                    {prodotti.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  {index === 0 && <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', color: '#777' }}>Quantità</label>}
                  <input
                    type="number"
                    min="1"
                    value={riga.quantita}
                    onChange={e => handleEditRigaChange(index, 'quantita', e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  {index === 0 && <label style={{ display: 'block', marginBottom: '3px', fontSize: '12px', color: '#777' }}>Prezzo unit.</label>}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={riga.prezzo_unitario}
                    onChange={e => handleEditRigaChange(index, 'prezzo_unitario', e.target.value)}
                    style={{ width: '100%', padding: '7px 8px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1, textAlign: 'right', paddingBottom: '7px', fontSize: '13px', color: PRIMARY_COLOR, fontWeight: 600 }}>
                  {index === 0 && <div style={{ fontSize: '12px', color: '#777', marginBottom: '3px' }}>Subtotale</div>}
                  {formatCurrency(Number(riga.quantita) * Number(riga.prezzo_unitario))}
                </div>
                <div>
                  {index === 0 && <div style={{ height: '18px' }} />}
                  <button
                    type="button"
                    onClick={() => handleRemoveEditRiga(index)}
                    disabled={editForm.righe.length <= 1}
                    style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: '5px', cursor: editForm.righe.length <= 1 ? 'not-allowed' : 'pointer', backgroundColor: '#fff', color: '#c62828', fontSize: '13px' }}
                  >✕</button>
                </div>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontWeight: 700, color: PRIMARY_COLOR, marginTop: '8px', fontSize: '15px' }}>
              Totale: {formatCurrency(editTotale)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setEditModal(false)} disabled={editLoading} style={{ backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>Annulla</button>
            <button
              onClick={handleEditSubmit}
              disabled={editLoading}
              style={{ backgroundColor: '#1565c0', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: editLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {editLoading ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
