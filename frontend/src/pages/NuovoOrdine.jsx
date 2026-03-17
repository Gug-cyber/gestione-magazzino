import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordiniAPI, prodottiAPI, clientiAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import { CORRIERI } from '../constants/corrieri'

const emptyRiga = { prodotto_id: '', quantita: 1, prezzo_unitario: '' }

export default function NuovoOrdine() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [clienti, setClienti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [loading, setLoading] = useState(true)

  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [note, setNote] = useState('')
  const [corriere, setCorriere] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [righe, setRighe] = useState([{ ...emptyRiga }])

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      clientiAPI.getAll(),
      prodottiAPI.getAll({ limit: 500 }),
    ])
      .then(([c, p]) => {
        setClienti(c.data)
        setProdotti(p.data)
      })
      .catch(() => setError('Errore nel caricamento dei dati'))
      .finally(() => setLoading(false))
  }, [])

  const totale = righe.reduce((sum, r) => {
    const qty = parseFloat(r.quantita) || 0
    const price = parseFloat(r.prezzo_unitario) || 0
    return sum + qty * price
  }, 0)

  const handleRigaChange = (index, field, value) => {
    const updated = righe.map((r, i) => {
      if (i !== index) return r
      const next = { ...r, [field]: value }
      if (field === 'prodotto_id') {
        const prodotto = prodotti.find(p => String(p.id) === String(value))
        if (prodotto) {
          next.prezzo_unitario = prodotto.prezzo_vendita ?? ''
        }
      }
      return next
    })
    setRighe(updated)
  }

  const addRiga = () => setRighe([...righe, { ...emptyRiga }])

  const removeRiga = (index) => {
    if (righe.length === 1) return
    setRighe(righe.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const righeValide = righe.filter(r => r.prodotto_id)
    if (righeValide.length === 0) {
      setError('Aggiungi almeno un prodotto all\'ordine.')
      return
    }

    const payload = {
      cliente_id: clienteId ? parseInt(clienteId, 10) : null,
      cliente_nome: clienteNome || null,
      note: note || null,
      corriere: corriere || null,
      tracking_number: trackingNumber || null,
      righe: righeValide.map(r => ({
        prodotto_id: parseInt(r.prodotto_id, 10),
        quantita: parseInt(r.quantita, 10),
        prezzo_unitario: parseFloat(r.prezzo_unitario) || 0,
      })),
    }

    setSubmitting(true)
    try {
      await ordiniAPI.create(payload)
      navigate('/ordini')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nella creazione dell\'ordine.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e', marginBottom: '8px' }}>🛒 Nuovo Ordine</h1>
        <button
          onClick={() => navigate('/ordini')}
          style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontSize: '0.9rem', padding: 0, textDecoration: 'underline' }}
        >
          ← Torna agli Ordini
        </button>
      </div>

      {loading && <p style={{ color: '#666' }}>Caricamento dati...</p>}

      {error && (
        <div style={{ color: '#c62828', backgroundColor: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit}>
          {/* Cliente */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>👤 Cliente</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Seleziona cliente</span>
                <select
                  value={clienteId}
                  onChange={e => {
                    setClienteId(e.target.value)
                    if (e.target.value) {
                      const c = clienti.find(cl => String(cl.id) === e.target.value)
                      if (c) setClienteNome(c.nome || '')
                    } else {
                      setClienteNome('')
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="">-- Nessun cliente selezionato --</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Nome cliente (testo libero)</span>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={e => setClienteNome(e.target.value)}
                  placeholder="Es. Mario Rossi"
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {/* Prodotti */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>📦 Prodotti</h2>

            {righe.map((riga, i) => {
              const prodottoSel = prodotti.find(p => String(p.id) === String(riga.prodotto_id))
              const subtotale = (parseFloat(riga.quantita) || 0) * (parseFloat(riga.prezzo_unitario) || 0)

              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr auto auto',
                    gap: '12px',
                    alignItems: 'end',
                    padding: '12px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Prodotto *</span>
                    <select
                      required
                      value={riga.prodotto_id}
                      onChange={e => handleRigaChange(i, 'prodotto_id', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">-- Seleziona prodotto --</option>
                      {prodotti.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — SKU: {p.sku} (disp: {p.quantita ?? 0})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Quantità *</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={riga.quantita}
                      onChange={e => handleRigaChange(i, 'quantita', e.target.value)}
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Prezzo unit. (€) *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={riga.prezzo_unitario}
                      onChange={e => handleRigaChange(i, 'prezzo_unitario', e.target.value)}
                      placeholder={prodottoSel ? String(prodottoSel.prezzo_vendita ?? '') : '0.00'}
                      style={inputStyle}
                    />
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#555' }}>Subtotale</span>
                    <span style={{ fontWeight: 'bold', color: '#1a237e', padding: '8px 0' }}>
                      €{subtotale.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                    <button
                      type="button"
                      onClick={() => removeRiga(i)}
                      disabled={righe.length === 1}
                      style={{
                        backgroundColor: righe.length === 1 ? '#ccc' : '#c62828',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 10px',
                        cursor: righe.length === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                      }}
                      title="Rimuovi riga"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={addRiga}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '6px', height: '36px', padding: '0 16px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', marginTop: '4px' }}
            >
              + Aggiungi prodotto
            </button>

            {/* Totale */}
            <div style={{ textAlign: 'right', marginTop: '16px', padding: '12px', backgroundColor: '#e8eaf6', borderRadius: '6px' }}>
              <span style={{ fontSize: '1rem', color: '#555' }}>Totale ordine: </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1a237e' }}>€{totale.toFixed(2)}</span>
            </div>
          </div>

          {/* Spedizione */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>🚚 Spedizione (opzionale)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Corriere</span>
                <select
                  value={corriere}
                  onChange={e => setCorriere(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Nessun corriere —</option>
                  {CORRIERI.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Tracking spedizione</span>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="Numero tracking..."
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {/* Note */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>📝 Note</h2>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Note (opzionale)</span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Note aggiuntive sull'ordine..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              type="button"
              onClick={() => navigate('/ordini')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '6px', height: '36px', padding: '0 24px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: submitting ? '#a5d6a7' : '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', height: '36px', padding: '0 24px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}
            >
              {submitting ? 'Creazione in corso...' : '✅ Crea Ordine'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

const cardStyle = {
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  marginBottom: '20px',
}

const sectionTitleStyle = {
  color: '#1a237e',
  marginTop: 0,
  marginBottom: '16px',
  fontSize: '1.05rem',
}

const inputStyle = {
  height: '36px',
  padding: '0 12px',
  border: '1.5px solid #e0e4ef',
  borderRadius: '6px',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const labelTextStyle = {
  fontSize: '0.85rem',
  color: '#555',
}
