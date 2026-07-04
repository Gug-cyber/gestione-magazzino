import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordiniAPI, fattureAPI, clientiAPI, prodottiAPI } from '../api/client'
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

const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }

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

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
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

export default function DettaglioOrdine() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ordine, setOrdine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fatturaOrdine, setFatturaOrdine] = useState(null)
  const [downloadingFattura, setDownloadingFattura] = useState(false)
  const [trackingEdit, setTrackingEdit] = useState(false)
  const [trackingForm, setTrackingForm] = useState({ corriere: '', tracking_number: '' })
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    cliente_id: '', cliente_nome: '', note: '', corriere: '', tracking_number: '',
    indirizzo_spedizione: '', metodo_pagamento: '', spese_spedizione: '',
    righe: [{ ...emptyRiga }],
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [clienti, setClienti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    clientiAPI.getAll().then(r => setClienti(r.data)).catch(err => console.error('Errore caricamento clienti:', err))
    prodottiAPI.getAll({ limit: 200 }).then(r => setProdotti(r.data)).catch(err => console.error('Errore caricamento prodotti:', err))
  }, [])

  const loadFattura = async (ordineId) => {
    try {
      const fr = await fattureAPI.getByOrdine(ordineId)
      const fatture = fr.data || []
      const fattura = fatture.find(f => f.tipo_documento === 'fattura' && f.auto_generata)
      setFatturaOrdine(fattura || null)
    } catch {
      setFatturaOrdine(null)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await ordiniAPI.getById(id)
        setOrdine(res.data)
        // Carica fattura per tutti gli stati tranne bozza
        if (res.data.stato !== 'bozza') {
          await loadFattura(res.data.id)
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
      if (res.data.stato !== 'bozza') {
        await loadFattura(ordine.id)
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

  const handleDownloadFattura = async () => {
    if (!fatturaOrdine) return
    setDownloadingFattura(true)
    try {
      const url = fattureAPI.getDownloadUrl(fatturaOrdine.id)
      const token = localStorage.getItem('token')
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Download fallito')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `fattura_${ordine.numero_ordine}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      alert('Errore durante il download della fattura')
    } finally {
      setDownloadingFattura(false)
    }
  }

  const openEditModal = () => {
    setEditForm({
      cliente_id: ordine.cliente_id ? String(ordine.cliente_id) : '',
      cliente_nome: ordine.cliente_nome || '',
      note: ordine.note || '',
      corriere: ordine.corriere || '',
      tracking_number: ordine.tracking_number || '',
      indirizzo_spedizione: ordine.indirizzo_spedizione || '',
      metodo_pagamento: ordine.metodo_pagamento || '',
      spese_spedizione: ordine.spese_spedizione != null ? String(ordine.spese_spedizione) : '',
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

  const speseSpedizioneNum = parseFloat(editForm.spese_spedizione) || 0
  const editSubtotale = editForm.righe.reduce((acc, r) => acc + (Number(r.quantita) * Number(r.prezzo_unitario)), 0)
  const editTotale = editSubtotale + speseSpedizioneNum

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
        indirizzo_spedizione: editForm.indirizzo_spedizione || null,
        metodo_pagamento: editForm.metodo_pagamento || null,
        spese_spedizione: speseSpedizioneNum || null,
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

  if (loading) return <div className="loading-state">Caricamento...</div>
  if (error || !ordine) return <div className="error-banner">{error || 'Ordine non trovato'}</div>

  const nextStato = STATO_NEXT[ordine.stato]
  const speseSpedizione = Number(ordine.spese_spedizione ?? 0)
  const subtotaleProdotti = (ordine.righe || []).reduce((acc, r) => acc + Number(r.subtotale ?? 0), 0)

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

              {/* Metodo pagamento */}
              {ordine.metodo_pagamento && (
                <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>
                  Metodo pagamento: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{ordine.metodo_pagamento.replace(/_/g, ' ')}</strong>
                </p>
              )}

              {/* Indirizzo spedizione */}
              {ordine.indirizzo_spedizione && (
                <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>
                  Indirizzo spedizione: <strong style={{ color: 'var(--text-primary)' }}>{ordine.indirizzo_spedizione}</strong>
                </p>
              )}

              {/* Tracking */}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
              <StatoBadge value={ordine.stato} colors={STATO_ORDINE_COLORS} capitalize />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nextStato && (
                  <button onClick={() => handleChangeStato(nextStato)} className="btn-primary" style={{ fontSize: '13px', padding: '10px 14px', width: '100%' }}>
                    Avanza a {nextStato}
                  </button>
                )}
                {ordine.stato !== 'annullato' && ordine.stato !== 'completato' && ordine.stato !== 'reso' && (
                  <button onClick={() => handleChangeStato('annullato')} className="btn-danger" style={{ fontSize: '13px', padding: '10px 14px', width: '100%' }}>
                    Annulla ordine
                  </button>
                )}
                {ordine.stato === 'completato' && (
                  <button onClick={() => handleChangeStato('annullato')} className="btn-danger" style={{ fontSize: '13px', padding: '10px 14px', width: '100%' }}>
                    Annulla (ripristina magazzino)
                  </button>
                )}
                {(ordine.stato === 'completato' || ordine.stato === 'spedito') && (
                  <button
                    onClick={() => handleChangeStato('reso')}
                    className="btn-secondary"
                    style={{ fontSize: '13px', padding: '10px 14px', width: '100%', color: STATO_ORDINE_COLORS.reso.text, borderColor: STATO_ORDINE_COLORS.reso.text }}
                  >
                    📦 Segna come reso
                  </button>
                )}

                {/* CTA Scarica Fattura */}
                {fatturaOrdine && !fatturaOrdine.annullata && (
                  <button
                    onClick={handleDownloadFattura}
                    disabled={downloadingFattura}
                    className="btn-secondary"
                    style={{ fontSize: '13px', padding: '10px 14px', width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    <DownloadIcon />
                    {downloadingFattura ? 'Download...' : 'Scarica fattura PDF'}
                  </button>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleDelete} className="btn-secondary" style={{ fontSize: '13px', padding: '10px 14px', flex: 1, color: 'var(--danger)' }}>
                    <TrashIcon /> Elimina
                  </button>
                  {ordine.stato === 'bozza' ? (
                    <button onClick={openEditModal} className="btn-primary" style={{ fontSize: '13px', padding: '10px 14px', flex: 1 }}>
                      <EditIcon /> Modifica
                    </button>
                  ) : (
                    <button
                      disabled
                      title={`Solo ordini in bozza possono essere modificati (stato attuale: ${ordine.stato})`}
                      className="btn-secondary"
                      style={{ fontSize: '13px', padding: '10px 14px', flex: 1, opacity: 0.5, cursor: 'not-allowed' }}
                    >
                      <EditIcon /> Modifica
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fattura auto-generata */}
        {fatturaOrdine && (
          <div className="card" style={{
            background: fatturaOrdine.annullata ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.1)',
            border: fatturaOrdine.annullata ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <FileTextIcon />
              <div style={{ flex: 1 }}>
                <strong style={{ color: fatturaOrdine.annullata ? 'var(--danger)' : 'var(--success)' }}>
                  Fattura generata automaticamente
                </strong>
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
              {!fatturaOrdine.annullata && (
                <button
                  onClick={handleDownloadFattura}
                  disabled={downloadingFattura}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--success)', borderColor: 'var(--success)', whiteSpace: 'nowrap' }}
                >
                  <DownloadIcon />
                  {downloadingFattura ? 'Download...' : 'PDF'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Righe ordine */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackageIcon />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Prodotti dell&apos;ordine</h3>
          </div>

          {/* Mobile: cards */}
          {isMobile ? (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(ordine.righe || []).map((r, i) => (
                <div key={r.id || i} style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {r.prodotto_nome || '-'}
                  </div>
                  {r.prodotto_sku && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', background: 'var(--bg-tertiary)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px' }}>
                      {r.prodotto_sku}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantita</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.quantita}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prezzo unit.</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(r.prezzo_unitario)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtotale</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(r.subtotale)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: table */
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
          )}

          {/* Riepilogo costi */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '260px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Subtotale prodotti</span>
              <span>{formatCurrency(subtotaleProdotti)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '260px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Spedizione</span>
              <span>{speseSpedizione > 0 ? formatCurrency(speseSpedizione) : 'Gratuita'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '260px', borderTop: '1px solid var(--border-primary)', paddingTop: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Totale</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(ordine.totale)}</span>
            </div>
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

      {/* Edit Order Modal */}
      {editModal && (
        <div className="modal-backdrop" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '24px 0' }}>
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EditIcon /> Modifica Ordine - {ordine.numero_ordine}
            </h3>

            {editError && <div className="error-banner">{editError}</div>}

            {/* Cliente */}
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">Cliente</label>
              <select
                value={editForm.cliente_id}
                onChange={e => setEditForm(prev => ({ ...prev, cliente_id: e.target.value }))}
                className="form-input"
              >
                <option value="">- Seleziona cliente -</option>
                {clienti.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}{c.cognome ? ` ${c.cognome}` : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">Nome cliente (manuale)</label>
              <input
                value={editForm.cliente_nome}
                onChange={e => setEditForm(prev => ({ ...prev, cliente_nome: e.target.value }))}
                placeholder="Nome cliente..."
                className="form-input"
              />
            </div>

            {/* Note */}
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">Note <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opzionale)</span></label>
              <textarea
                value={editForm.note}
                onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Note aggiuntive..."
                rows={2}
                className="form-input form-textarea"
              />
            </div>

            {/* Metodo pagamento + Spese spedizione */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="form-label">Metodo pagamento <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opzionale)</span></label>
                <input
                  value={editForm.metodo_pagamento}
                  onChange={e => setEditForm(prev => ({ ...prev, metodo_pagamento: e.target.value }))}
                  placeholder="es. carta, contanti, paypal..."
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Spese spedizione € <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opzionale)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.spese_spedizione}
                  onChange={e => setEditForm(prev => ({ ...prev, spese_spedizione: e.target.value }))}
                  placeholder="0.00"
                  className="form-input"
                />
              </div>
            </div>

            {/* Indirizzo spedizione */}
            <div style={{ marginBottom: '12px' }}>
              <label className="form-label">Indirizzo spedizione <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opzionale)</span></label>
              <input
                value={editForm.indirizzo_spedizione}
                onChange={e => setEditForm(prev => ({ ...prev, indirizzo_spedizione: e.target.value }))}
                placeholder="Via, Città, CAP..."
                className="form-input"
              />
            </div>

            {/* Corriere e Tracking */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="form-label">Corriere</label>
                <select
                  value={editForm.corriere}
                  onChange={e => setEditForm(prev => ({ ...prev, corriere: e.target.value }))}
                  className="form-input"
                >
                  <option value="">- Nessun corriere -</option>
                  {CORRIERI.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Numero Tracking</label>
                <input
                  value={editForm.tracking_number}
                  onChange={e => setEditForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                  placeholder="Codice tracking..."
                  className="form-input"
                />
              </div>
            </div>

            {/* Righe prodotti */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Righe prodotti</label>
                <button type="button" onClick={handleAddEditRiga} className="btn-primary" style={{ padding: '4px 10px', fontSize: '13px' }}>
                  <PlusIcon /> Aggiungi riga
                </button>
              </div>
              {editForm.righe.map((riga, index) => (
                <div key={index} className="product-row">
                  <div style={{ gridColumn: 'span 2' }}>
                    {index === 0 && <label className="form-label">Prodotto</label>}
                    <select
                      value={riga.prodotto_id}
                      onChange={e => handleEditRigaChange(index, 'prodotto_id', e.target.value)}
                      className="form-input"
                    >
                      <option value="">- Seleziona prodotto -</option>
                      {prodotti.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} (SKU: {p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {index === 0 && <label className="form-label">Quantita</label>}
                    <input
                      type="number"
                      min="1"
                      value={riga.quantita}
                      onChange={e => handleEditRigaChange(index, 'quantita', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    {index === 0 && <label className="form-label">Prezzo unit.</label>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={riga.prezzo_unitario}
                      onChange={e => handleEditRigaChange(index, 'prezzo_unitario', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {index === 0 && <label className="form-label">Subtotale</label>}
                    <div className="subtotal-value">
                      {formatCurrency(Number(riga.quantita) * Number(riga.prezzo_unitario))}
                    </div>
                  </div>
                  <div>
                    {index === 0 && <div style={{ height: '24px' }} />}
                    <button
                      type="button"
                      onClick={() => handleRemoveEditRiga(index)}
                      disabled={editForm.righe.length <= 1}
                      className={editForm.righe.length <= 1 ? 'btn-icon btn-icon-disabled' : 'btn-icon btn-icon-red'}
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginTop: '8px' }}>
                {speseSpedizioneNum > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Spedizione</span>
                    <span>{formatCurrency(speseSpedizioneNum)}</span>
                  </div>
                )}
                <div className="order-total">
                  <span className="order-total-label">Totale:</span>
                  <span className="order-total-value">{formatCurrency(editTotale)}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setEditModal(false)} disabled={editLoading} className="btn-secondary">
                Annulla
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="btn-primary"
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
