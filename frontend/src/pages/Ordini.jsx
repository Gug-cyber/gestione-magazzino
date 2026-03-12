import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordiniAPI, clientiAPI, prodottiAPI } from '../api/client'

const primaryColor = '#1a237e'

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  flex: 1,
  minWidth: '140px',
}

const STATI = ['bozza', 'confermato', 'spedito', 'completato', 'annullato']

const CORRIERI = [
  { value: 'BRT',                label: 'BRT',                url: (n) => `https://vas.brt.it/vas/sped_det_show.hsm?referer=sped_numspe_input.hsm&Nspedizione=${n}` },
  { value: 'DHL',                label: 'DHL',                url: (n) => `https://www.dhl.com/it-it/home/tracking.html?tracking-id=${n}` },
  { value: 'SDA',                label: 'SDA',                url: (n) => `https://www.sda.it/wps/portal/Servizi-per-te/Cerca-spedizione?spedizione=${n}` },
  { value: 'GLS',                label: 'GLS',                url: (n) => `https://gls-group.com/track/${n}` },
  { value: 'Poste Italiane',     label: 'Poste Italiane',     url: (n) => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${n}` },
  { value: 'UPS',                label: 'UPS',                url: (n) => `https://www.ups.com/track?tracknum=${n}` },
  { value: 'FedEx',              label: 'FedEx',              url: (n) => `https://www.fedex.com/fedextrack/?tracknumbers=${n}` },
  { value: 'Amazon Logistics',   label: 'Amazon Logistics',   url: (n) => `https://track.amazon.it/tracking/${n}` },
  { value: 'TNT',                label: 'TNT',                url: (n) => `https://www.tnt.com/express/it_it/site/tracking.html?searchType=CON&cons=${n}` },
  { value: 'InPost',             label: 'InPost',             url: (n) => `https://inpost.it/tracking?number=${n}` },
  { value: 'Altro',              label: 'Altro',              url: () => null },
]

const STATO_COLORS = {
  bozza: { bg: '#f5f5f5', color: '#757575' },
  confermato: { bg: '#e3f2fd', color: '#1565c0' },
  spedito: { bg: '#fff3e0', color: '#e65100' },
  completato: { bg: '#e8f5e9', color: '#2e7d32' },
  annullato: { bg: '#ffebee', color: '#c62828' },
}


function StatoBadge({ stato }) {
  const colors = STATO_COLORS[stato] || { bg: '#eee', color: '#333' }
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.color,
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {stato}
    </span>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('it-IT')
  } catch {
    return dateStr
  }
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }

export default function Ordini() {
  const navigate = useNavigate()
  const [ordini, setOrdini] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [clienti, setClienti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [form, setForm] = useState({ cliente_id: '', cliente_nome: '', note: '', righe: [{ ...emptyRiga }] })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchOrdini = useCallback(async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const res = await ordiniAPI.getAll(params)
      setOrdini(res.data)
    } catch {
      setError('Errore nel caricamento degli ordini')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrdini()
    clientiAPI.getAll().then(r => setClienti(r.data)).catch(() => {})
    prodottiAPI.getAll().then(r => setProdotti(r.data)).catch(() => {})
  }, [fetchOrdini])

  const handleSearch = () => {
    const params = {}
    if (search) params.search = search
    if (filtroStato) params.stato = filtroStato
    fetchOrdini(params)
  }

  const handleReset = () => {
    setSearch('')
    setFiltroStato('')
    fetchOrdini()
  }

  const openNewModal = () => {
    setForm({ cliente_id: '', cliente_nome: '', note: '', righe: [{ ...emptyRiga }] })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormError('')
  }

  const handleRigaChange = (index, field, value) => {
    setForm(prev => {
      const righe = [...prev.righe]
      righe[index] = { ...righe[index], [field]: value }
      if (field === 'prodotto_id') {
        const prod = prodotti.find(p => p.id === parseInt(value))
        if (prod) righe[index].prezzo_unitario = prod.prezzo_vendita || 0
      }
      return { ...prev, righe }
    })
  }

  const addRiga = () => setForm(prev => ({ ...prev, righe: [...prev.righe, { prodotto_id: '', quantita: 1, prezzo_unitario: 0 }] }))

  const removeRiga = (index) => setForm(prev => ({
    ...prev,
    righe: prev.righe.filter((_, i) => i !== index),
  }))

  const totaleOrdine = form.righe.reduce((acc, r) => acc + (Number(r.quantita) * Number(r.prezzo_unitario)), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const righe = form.righe.filter(r => r.prodotto_id)
    if (!righe.length) { setFormError("Aggiungi almeno un prodotto"); return }
    setSubmitting(true)
    try {
      const payload = {
        cliente_id: form.cliente_id ? parseInt(form.cliente_id) : null,
        cliente_nome: form.cliente_nome || null,
        note: form.note || null,
        righe: righe.map(r => ({
          prodotto_id: parseInt(r.prodotto_id),
          quantita: parseInt(r.quantita),
          prezzo_unitario: parseFloat(r.prezzo_unitario),
        })),
      }
      await ordiniAPI.create(payload)
      closeModal()
      fetchOrdini()
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Errore nella creazione dell\'ordine')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats
  const totaleBozze = ordini.filter(o => o.stato === 'bozza').length
  const totaleCompletati = ordini.filter(o => o.stato === 'completato').length
  const fatturatoTotale = ordini.filter(o => o.stato === 'completato').reduce((acc, o) => acc + (o.totale || 0), 0)

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, color: primaryColor }}>🛒 Ordini</h1>
        <button
          onClick={openNewModal}
          style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Nuovo Ordine
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', color: '#777' }}>Totale Ordini</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: primaryColor }}>{ordini.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', color: '#777' }}>In Bozza</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#757575' }}>{totaleBozze}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', color: '#777' }}>Completati</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2e7d32' }}>{totaleCompletati}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '13px', color: '#777' }}>Fatturato (completati)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: primaryColor }}>{formatCurrency(fatturatoTotale)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Cerca per N° ordine o cliente..."
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
        />
        <select
          value={filtroStato}
          onChange={e => setFiltroStato(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button onClick={handleSearch} style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>
          Cerca
        </button>
        <button onClick={handleReset} style={{ backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      {error && <div style={{ color: '#c62828', marginBottom: '16px' }}>{error}</div>}

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#777' }}>Caricamento...</div>
        ) : ordini.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#777' }}>Nessun ordine trovato</div>
        ) : (
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                {['N° Ordine', 'Cliente', 'Stato', 'Tracking', 'Prodotti', 'Totale €', 'Data', 'Azioni'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '13px', color: '#555', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordini.map(ordine => (
                <tr key={ordine.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: primaryColor }}>{ordine.numero_ordine}</td>
                  <td style={{ padding: '12px 14px' }}>{ordine.cliente_nome || '—'}</td>
                  <td style={{ padding: '12px 14px' }}><StatoBadge stato={ordine.stato} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    {ordine.tracking_number ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>
                          {ordine.corriere || '—'}
                        </span>
                        {(() => {
                          const corriere = CORRIERI.find(c => c.value === ordine.corriere)
                          const url = corriere ? corriere.url(ordine.tracking_number) : null
                          return url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer"
                               style={{ fontSize: '0.8rem', color: '#1565c0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {ordine.tracking_number} 🔗
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#333', fontFamily: 'monospace' }}>
                              {ordine.tracking_number}
                            </span>
                          )
                        })()}
                      </div>
                    ) : (
                      <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#555' }}>{ordine.righe?.length || 0} prodotti</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{formatCurrency(ordine.totale)}</td>
                  <td style={{ padding: '12px 14px', color: '#777', fontSize: '13px' }}>{formatDate(ordine.data_ordine)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => navigate(`/ordini/${ordine.id}`)}
                      title="Vedi dettaglio"
                      style={{
                        background: 'none',
                        border: '1px solid #c5cae9',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      🔍
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '28px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ marginTop: 0, color: primaryColor }}>Nuovo Ordine</h2>
            {formError && <div style={{ color: '#c62828', marginBottom: '12px', padding: '8px 12px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Cliente (da anagrafica)</label>
                  <select
                    value={form.cliente_id}
                    onChange={e => setForm(prev => ({ ...prev, cliente_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="">— Nessun cliente —</option>
                    {clienti.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}{c.cognome ? ` ${c.cognome}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Nome cliente (testo libero)</label>
                  <input
                    value={form.cliente_nome}
                    onChange={e => setForm(prev => ({ ...prev, cliente_nome: e.target.value }))}
                    placeholder="Es. Mario Rossi"
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#555' }}>Note (opzionale)</label>
                <input
                  value={form.note}
                  onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Note sull'ordine..."
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <h3 style={{ color: primaryColor, marginBottom: '12px' }}>Prodotti</h3>
              {form.righe.map((riga, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr)) auto', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <select
                    value={riga.prodotto_id}
                    onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)}
                    style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="">— Seleziona prodotto —</option>
                    {prodotti.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (disp: {p.quantita})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={riga.quantita}
                    onChange={e => handleRigaChange(i, 'quantita', e.target.value)}
                    placeholder="Qtà"
                    style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={riga.prezzo_unitario}
                    onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)}
                    placeholder="Prezzo"
                    style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRiga(i)}
                    disabled={form.righe.length === 1}
                    style={{ background: 'none', border: 'none', cursor: form.righe.length === 1 ? 'not-allowed' : 'pointer', fontSize: '18px', opacity: form.righe.length === 1 ? 0.3 : 1 }}
                  >🗑️</button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRiga}
                style={{ backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', marginBottom: '16px' }}
              >
                + Aggiungi Prodotto
              </button>

              <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 700, color: primaryColor, marginBottom: '20px' }}>
                Totale: {formatCurrency(totaleOrdine)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {submitting ? 'Salvataggio...' : 'Salva come Bozza'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
