import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, ubicazioniAPI, getFotoUrl, ebayAPI, cardtraderAPI } from '../api/client'
import StatoBadge from '../components/ui/StatoBadge'
import BarcodeDisplay from '../components/BarcodeDisplay'
import QRCodeDisplay from '../components/QRCodeDisplay'
import PrintBarcodeModal from '../components/PrintBarcodeModal'
import { STATO_CONSERVAZIONE_COLORS, PRIMARY_COLOR } from '../constants/colors'
import QRCode from 'qrcode'
import styles from './DettaglioProdotto.module.css'

const CONDIZIONE_MAP = {
  'Near Mint': 'NM', 'Mint': 'NM', 'Quasi Perfetto': 'NM',
  'Ottimo': 'EX', 'Excellent': 'EX',
  'Good': 'GD', 'Buono': 'GD',
  'Light Played': 'LP', 'Giocato': 'LP',
  'Poor': 'PO', 'Rovinato': 'PO',
}
const LINGUA_MAP = {
  'Inglese': 'en', 'Italiano': 'it', 'Tedesco': 'de',
  'Francese': 'fr', 'Spagnolo': 'es', 'Portoghese': 'pt',
  'Giapponese': 'ja', 'Cinese': 'zh-hans', 'Coreano': 'ko', 'Russo': 'ru',
}

function QuantitaChart({ storico }) {
  if (!storico || storico.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', padding: '32px 0' }}>Nessun movimento registrato</p>
  }

  const W = 600
  const H = 200
  const padLeft = 48
  const padRight = 16
  const padTop = 16
  const padBottom = 36

  const values = storico.map(s => s.quantita)
  const minVal = Math.min(0, ...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const n = storico.length
  const xStep = (W - padLeft - padRight) / Math.max(n - 1, 1)

  const toX = (i) => padLeft + i * xStep
  const toY = (v) => padTop + (H - padTop - padBottom) * (1 - (v - minVal) / range)

  // Y axis labels
  const yLabels = []
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const v = minVal + (range * i) / steps
    yLabels.push({ v: Math.round(v), y: toY(v) })
  }

  // Polyline points
  const points = storico.map((s, i) => `${toX(i)},${toY(s.quantita)}`).join(' ')

  // Format date DD/MM
  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // X axis labels (show max 8)
  const xLabelStep = Math.max(1, Math.floor(n / 8))
  const xLabels = storico
    .map((s, i) => ({ i, label: fmtDate(s.data) }))
    .filter((_, i) => i === 0 || i === n - 1 || i % xLabelStep === 0)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Y axis labels */}
      {yLabels.map(({ v, y }, i) => (
        <g key={i}>
          <line x1={padLeft - 4} y1={y} x2={W - padRight} y2={y}
            stroke="#e0e0e0" strokeWidth="1" />
          <text x={padLeft - 8} y={y + 4} textAnchor="end"
            fontSize="10" fill="#888">{v}</text>
        </g>
      ))}

      {/* X axis */}
      <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom}
        stroke="#ccc" strokeWidth="1" />

      {/* X axis labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - padBottom + 14}
          textAnchor="middle" fontSize="10" fill="#888">{label}</text>
      ))}

      {/* Line */}
      {n > 1 && (
        <polyline points={points} fill="none" stroke="#1565c0" strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {storico.map((s, i) => (
        <circle key={i} cx={toX(i)} cy={toY(s.quantita)} r="4"
          fill="#1565c0" stroke="white" strokeWidth="1.5">
          <title>{`${fmtDate(s.data)}: ${s.quantita} (${s.tipo} ${s.variazione > 0 ? '+' : ''}${s.variazione})`}</title>
        </circle>
      ))}
    </svg>
  )
}

const PAGE_SIZE = 20

function DettaglioProdotto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scheda, setScheda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [movPage, setMovPage] = useState(0)
  const [showEditForm, setShowEditForm] = useState(false)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')
  const [categorie, setCategorie] = useState([])
  const [ubicazioni, setUbicazioni] = useState([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoError, setFotoError] = useState('')
  const [generatingBarcode, setGeneratingBarcode] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const fotoInputRef = useRef(null)

  const [ebayData, setEbayData] = useState(null)
  const [ebayLoading, setEbayLoading] = useState(false)
  const [ebayError, setEbayError] = useState(null)

  const [cardtraderData, setCardtraderData] = useState(null)
  const [cardtraderLoading, setCardtraderLoading] = useState(false)
  const [cardtraderError, setCardtraderError] = useState(null)

  const loadScheda = () => {
    setLoading(true)
    setError(null)
    prodottiAPI.getScheda(id)
      .then(res => setScheda(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Prodotto non trovato'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadScheda()
    Promise.all([categorieAPI.getAll(), ubicazioniAPI.getAll()])
      .then(([c, u]) => { setCategorie(c.data); setUbicazioni(u.data) })
      .catch(() => {})
  }, [id])

  const fetchEbayPrezzi = (prodotto) => {
    setEbayData(null)
    setEbayLoading(true)
    setEbayError(null)
    ebayAPI.getPrezzi(prodotto.nome, prodotto.stato_conservazione)
      .then(res => setEbayData(res.data))
      .catch(err => setEbayError(err.response?.data?.detail || 'Errore prezzi eBay'))
      .finally(() => setEbayLoading(false))
  }

  const fetchCardtraderPrezzi = (prodotto) => {
    setCardtraderData(null)
    setCardtraderLoading(true)
    setCardtraderError(null)
    const ctParams = {}
    const ctCondizione = CONDIZIONE_MAP[prodotto.stato_conservazione]
    const ctLingua = LINGUA_MAP[prodotto.lingua]
    if (ctCondizione) ctParams.condizione = ctCondizione
    if (ctLingua) ctParams.lingua = ctLingua
    cardtraderAPI.getMarketPrices(prodotto.cardtrader_blueprint_id, ctParams)
      .then(res => setCardtraderData(res.data))
      .catch(err => setCardtraderError(err.response?.data?.detail || 'Errore prezzi CardTrader'))
      .finally(() => setCardtraderLoading(false))
  }

  useEffect(() => {
    if (!scheda) return
    const { prodotto } = scheda
    fetchEbayPrezzi(prodotto)
    if (prodotto.cardtrader_blueprint_id) {
      fetchCardtraderPrezzi(prodotto)
    }
  }, [scheda?.prodotto?.id])

  const refreshEbay = () => {
    if (!scheda) return
    fetchEbayPrezzi(scheda.prodotto)
  }

  const refreshCardtrader = () => {
    if (!scheda) return
    fetchCardtraderPrezzi(scheda.prodotto)
  }

  const handleEditOpen = () => {
    const p = scheda.prodotto
    setForm({
      nome: p.nome || '',
      descrizione: p.descrizione || '',
      sku: p.sku || '',
      quantita: p.quantita ?? 0,
      quantita_minima: p.quantita_minima ?? 0,
      prezzo_acquisto: p.prezzo_acquisto || '',
      prezzo_vendita: p.prezzo_vendita || '',
      categoria_id: p.categoria_id || '',
      ubicazione_id: p.ubicazione_id || '',
      stato_conservazione: p.stato_conservazione || '',
      lingua: p.lingua || '',
      cardtrader_blueprint_id: p.cardtrader_blueprint_id || '',
    })
    setFormError('')
    setShowEditForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    const payload = {
      ...form,
      quantita: parseInt(form.quantita),
      quantita_minima: parseInt(form.quantita_minima),
      prezzo_acquisto: form.prezzo_acquisto ? parseFloat(form.prezzo_acquisto) : null,
      prezzo_vendita: form.prezzo_vendita ? parseFloat(form.prezzo_vendita) : null,
      categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
      ubicazione_id: form.ubicazione_id ? parseInt(form.ubicazione_id) : null,
      stato_conservazione: form.stato_conservazione || null,
      lingua: form.lingua || null,
      cardtrader_blueprint_id: form.cardtrader_blueprint_id ? parseInt(form.cardtrader_blueprint_id) : null,
    }
    try {
      await prodottiAPI.update(id, payload)
      setShowEditForm(false)
      loadScheda()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Eliminare questo prodotto?')) return
    try {
      await prodottiAPI.delete(id)
      navigate('/prodotti')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'eliminazione')
    }
  }

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true)
    setBarcodeError('')
    try {
      await prodottiAPI.generateBarcode(id)
      loadScheda()
    } catch (err) {
      setBarcodeError(err.response?.data?.detail || 'Errore nella generazione del barcode')
    } finally {
      setGeneratingBarcode(false)
    }
  }

  useEffect(() => {
    if (uploadingFoto && fotoInputRef.current) {
      fotoInputRef.current.click()
    }
  }, [uploadingFoto])

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>Caricamento...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#c62828', fontSize: '1.1rem' }}>{error}</p>
        <button onClick={() => navigate('/prodotti')} style={btnStyle(PRIMARY_COLOR)}>← Torna ai Prodotti</button>
      </div>
    )
  }

  if (!scheda) return <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>Dati non disponibili</div>

  const { prodotto, movimenti, storico_quantita, prodotti_correlati, stats } = scheda

  const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const handleStampaQR = () => {
    const canvas = document.createElement('canvas')
    QRCode.toCanvas(canvas, `prodotto:${prodotto.id}`, { width: 256, margin: 2 }, (err) => {
      if (err) {
        alert('Errore nella generazione del QR code.')
        return
      }
      const win = window.open('', '_blank')
      if (!win) {
        alert('Il popup è stato bloccato dal browser. Consenti i popup per questa pagina e riprova.')
        return
      }
      const safeName = escapeHtml(prodotto.nome)
      const safeId = escapeHtml(prodotto.id)
      const html = `<html><head><title>QR - ${safeName}</title></head><body style="display:flex;align-items:center;justify-content:center;padding:32px;font-family:sans-serif"><div style="text-align:center"><img src="${canvas.toDataURL()}" style="width:200px;height:200px"><p style="margin-top:12px;font-size:14px;color:#555">${safeName}</p><p style="font-size:11px;color:#888;font-family:monospace">prodotto:${safeId}</p></div></body></html>`
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    })
  }

  const sottoScorta = prodotto.quantita < prodotto.quantita_minima

  // Pagination for movements
  const totalPages = Math.ceil(movimenti.length / PAGE_SIZE)
  const movimentiPagina = movimenti.slice(movPage * PAGE_SIZE, (movPage + 1) * PAGE_SIZE)

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fmtPrice = (v) => v != null ? `€${Number(v).toFixed(2)}` : '—'

  const margine = stats.margine_lordo
  const margineColor = margine == null ? '#888' : margine >= 0 ? '#2e7d32' : '#c62828'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/prodotti')} style={btnStyle('#546e7a')}>← Torna ai Prodotti</button>
        <h1 style={{ color: PRIMARY_COLOR, margin: 0, flex: 1, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}>{prodotto.nome}</h1>
        {prodotto.stato_conservazione && <StatoBadge value={prodotto.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />}
        <button onClick={handleEditOpen} style={btnStyle(PRIMARY_COLOR)}>✏️ Modifica</button>
        <button onClick={handleDelete} style={btnStyle('#c62828')}>🗑️ Elimina</button>
      </div>

      {/* Edit form */}
      {showEditForm && (
        <form onSubmit={handleSave} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 style={{ color: PRIMARY_COLOR, marginTop: 0 }}>✏️ Modifica Prodotto</h3>
          {formError && <div style={{ color: 'red', marginBottom: '12px' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {[
              { key: 'nome', label: 'Nome *', required: true },
              { key: 'sku', label: 'SKU *', required: true },
              { key: 'descrizione', label: 'Descrizione' },
              { key: 'quantita', label: 'Quantità', type: 'number' },
              { key: 'quantita_minima', label: 'Quantità Minima', type: 'number' },
              { key: 'prezzo_acquisto', label: 'Prezzo Acquisto (€)', type: 'number', step: '0.01' },
              { key: 'prezzo_vendita', label: 'Prezzo Vendita (€)', type: 'number', step: '0.01' },
            ].map(({ key, label, type = 'text', required, step }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
                <input
                  type={type}
                  step={step}
                  required={required}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }}
                />
              </label>
            ))}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Stato di Conservazione</span>
              <select value={form.stato_conservazione} onChange={(e) => setForm({ ...form, stato_conservazione: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuno --</option>
                <option value="Mint">Mint</option>
                <option value="Near Mint">Near Mint</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Light Played">Light Played</option>
                <option value="Played">Played</option>
                <option value="Poor">Poor</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Lingua</span>
              <select value={form.lingua} onChange={(e) => setForm({ ...form, lingua: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuna --</option>
                <option value="Italiano">Italiano</option>
                <option value="Inglese">Inglese</option>
                <option value="Giapponese">Giapponese</option>
                <option value="Cinese">Cinese</option>
                <option value="Coreano">Coreano</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Categoria</span>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuna --</option>
                {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Ubicazione</span>
              <select value={form.ubicazione_id} onChange={(e) => setForm({ ...form, ubicazione_id: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuna --</option>
                {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </label>
          </div>

          {/* CardTrader Blueprint ID - SOLO INPUT */}
          <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>🃏 CardTrader Blueprint ID</span>
              <input
                type="number"
                value={form.cardtrader_blueprint_id ?? ''}
                onChange={(e) => setForm({ ...form, cardtrader_blueprint_id: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%', maxWidth: 300 }}
                placeholder="es. 123456"
              />
              <span style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                Inserisci manualmente l&apos;ID del blueprint da CardTrader
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="submit" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Salva</button>
            <button type="button" onClick={() => setShowEditForm(false)} style={{ backgroundColor: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer' }}>✕ Annulla</button>
          </div>
        </form>
      )}

      {/* Main info grid — 2 columns: product info (left) + stats (right) */}
      <div className={styles.mainGrid} style={{ marginBottom: 24 }}>
        {/* Left: product image + details */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {prodotto.foto_url
                ? <>
                    <img
                      src={getFotoUrl(prodotto.foto_url)}
                      alt={prodotto.nome}
                      style={{ width: 140, height: 140, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline' }}
                    />
                    <span style={{ fontSize: '4.5rem', lineHeight: 1, display: 'none' }}>📦</span>
                  </>
                : <span style={{ fontSize: '4.5rem', lineHeight: 1 }}>📦</span>
              }
              <button
                onClick={() => setUploadingFoto(true)}
                style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem' }}
                title="Cambia foto"
              >📷</button>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fotoInputRef}
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files[0]
                if (!file) return
                setFotoError('')
                try {
                  await prodottiAPI.uploadFoto(id, file)
                  loadScheda()
                } catch {
                  setFotoError('Errore nel caricamento della foto')
                } finally {
                  setUploadingFoto(false)
                  e.target.value = ''
                }
              }}
            />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: PRIMARY_COLOR, marginBottom: 4 }}>{prodotto.nome}</div>
              {prodotto.descrizione && <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: 8 }}>{prodotto.descrizione}</div>}
              <div style={{ fontSize: '0.85rem', color: '#888' }}>SKU: <code style={{ backgroundColor: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{prodotto.sku}</code></div>
              {prodotto.cardtrader_blueprint_id && (
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 2 }}>🃏 Blueprint ID: <code style={{ backgroundColor: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{prodotto.cardtrader_blueprint_id}</code></div>
              )}
              {fotoError && <div style={{ color: 'red', fontSize: '0.8rem', marginTop: 4 }}>{fotoError}</div>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {prodotto.categoria_nome && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Categoria</span>
                <span style={valueStyle}>{prodotto.categoria_nome}</span>
              </div>
            )}
            {prodotto.ubicazione_nome && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Ubicazione</span>
                <span style={valueStyle}>{prodotto.ubicazione_nome}</span>
              </div>
            )}
            {prodotto.lingua && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Lingua</span>
                <span style={valueStyle}>{prodotto.lingua}</span>
              </div>
            )}
            {prodotto.stato_conservazione && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Conservazione</span>
                <StatoBadge value={prodotto.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />
              </div>
            )}
          </div>
        </div>

        {/* Right: 2x2 stat cards + margine badge */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* Quantità */}
            <div style={{ ...statCardStyle, borderLeft: `4px solid ${sottoScorta ? '#c62828' : '#2e7d32'}` }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>📦</div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>Quantità</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: sottoScorta ? '#c62828' : '#2e7d32' }}>
                {prodotto.quantita}
                {sottoScorta && <span style={{ fontSize: '0.9rem', marginLeft: 4 }}>⚠️</span>}
              </div>
              {sottoScorta && <div style={{ fontSize: '0.72rem', color: '#c62828', marginTop: 2 }}>Sotto scorta (min: {prodotto.quantita_minima})</div>}
            </div>

            {/* Prezzo Vendita */}
            <div style={{ ...statCardStyle, borderLeft: '4px solid #1565c0' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>💰</div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>Prezzo Vendita</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1565c0' }}>{fmtPrice(prodotto.prezzo_vendita)}</div>
            </div>

            {/* Prezzo Acquisto */}
            <div style={{ ...statCardStyle, borderLeft: '4px solid #7b1fa2' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🛒</div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>Prezzo Acquisto</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#7b1fa2' }}>{fmtPrice(prodotto.prezzo_acquisto)}</div>
            </div>

            {/* Margine Lordo */}
            <div style={{ ...statCardStyle, borderLeft: `4px solid ${margineColor}` }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>📈</div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>Margine Lordo</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: margineColor }}>
                {margine != null ? fmtPrice(margine) : '—'}
              </div>
            </div>
          </div>

          {/* Margine percentuale badge */}
          {stats.margine_percentuale != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#555', fontSize: '0.9rem' }}>Margine %:</span>
              <span style={{
                backgroundColor: stats.margine_percentuale >= 0 ? '#e8f5e9' : '#ffebee',
                color: stats.margine_percentuale >= 0 ? '#2e7d32' : '#c62828',
                padding: '4px 14px', borderRadius: '20px',
                fontWeight: 700, fontSize: '0.95rem',
              }}>
                {stats.margine_percentuale >= 0 ? '+' : ''}{stats.margine_percentuale}%
              </span>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>
                (Carico tot: {stats.totale_carico} | Scarico tot: {stats.totale_scarico})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confronto Prezzi di Mercato */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{
          color: PRIMARY_COLOR,
          marginTop: 0,
          marginBottom: 16,
          fontSize: '1.1rem',
          borderBottom: '2px solid #e8eaf6',
          paddingBottom: 12,
        }}>💰 Confronto Prezzi di Mercato</h2>

        <div className={styles.marketGrid}>
          {/* eBay */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: 8,
            padding: 16,
            borderLeft: '4px solid #1565c0',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#1565c0', fontWeight: 700 }}>
              🛒 Prezzi eBay
            </h3>
            {ebayLoading && <div style={{ fontSize: '0.85rem', color: '#888' }}>⏳ Caricamento...</div>}
            {ebayError && !ebayLoading && <div style={{ fontSize: '0.8rem', color: '#c62828' }}>⚠️ Non disponibile</div>}
            {ebayData && !ebayError && !ebayLoading && (
              ebayData.configurato === false
                ? <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>Non configurato</div>
                : ebayData.numero_risultati === 0
                  ? <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>Nessun risultato</div>
                  : <div>
                      <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                        Medio: <strong style={{ color: '#1565c0' }}>€{Number(ebayData.prezzo_medio).toFixed(2)}</strong>
                      </div>
                      {ebayData.ultimo_prezzo_venduto != null && (
                        <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                          Venduto: <strong style={{ color: '#e65100' }}>€{Number(ebayData.ultimo_prezzo_venduto).toFixed(2)}</strong>
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 6 }}>{ebayData.numero_risultati} annunci</div>
                      <a href={ebayData.url_ricerca} target="_blank" rel="noopener noreferrer"
                        aria-label="Vedi su eBay (apre in una nuova scheda)"
                        style={{ fontSize: '0.75rem', color: '#1565c0', display: 'inline-block', marginBottom: 4 }}>🔗 Vedi su eBay</a>
                    </div>
            )}
            <button onClick={refreshEbay} disabled={ebayLoading} aria-label="Aggiorna prezzi eBay" style={{ marginTop: 6, fontSize: '0.75rem', color: '#1565c0', background: 'none', border: 'none', cursor: ebayLoading ? 'not-allowed' : 'pointer', padding: 0, opacity: ebayLoading ? 0.6 : 1 }}>
              🔄 Aggiorna
            </button>
          </div>

          {/* CardTrader */}
          <div style={{
            backgroundColor: '#faf8fc',
            borderRadius: 8,
            padding: 16,
            borderLeft: '4px solid #7b1fa2',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#7b1fa2', fontWeight: 700 }}>
              🃏 Prezzi CardTrader
            </h3>
            {!prodotto.cardtrader_blueprint_id
              ? <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                  Blueprint ID non configurato.{' '}
                  <button onClick={handleEditOpen} style={{ background: 'none', border: 'none', color: '#7b1fa2', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}>Modifica prodotto</button>
                </div>
              : <>
                  {cardtraderLoading && <div style={{ fontSize: '0.85rem', color: '#888' }}>⏳ Caricamento...</div>}
                  {cardtraderError && !cardtraderLoading && <div style={{ fontSize: '0.8rem', color: '#c62828' }}>⚠️ Non disponibile</div>}
                  {cardtraderData && !cardtraderError && !cardtraderLoading && (
                    cardtraderData.numero_offerte === 0
                      ? <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>Nessun risultato</div>
                      : <div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                            💰 Min: <strong style={{ color: '#7b1fa2' }}>€{Number(cardtraderData.prezzo_minimo).toFixed(2)}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                            📊 Medio: <strong style={{ color: '#7b1fa2' }}>€{Number(cardtraderData.prezzo_medio).toFixed(2)}</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>{cardtraderData.numero_offerte} offerte</div>
                          {(CONDIZIONE_MAP[prodotto.stato_conservazione] || LINGUA_MAP[prodotto.lingua]) && (
                            <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 2 }}>
                              {[
                                CONDIZIONE_MAP[prodotto.stato_conservazione],
                                LINGUA_MAP[prodotto.lingua],
                              ].filter(Boolean).join(' / ')}
                            </div>
                          )}
                        </div>
                  )}
                  <button onClick={refreshCardtrader} disabled={cardtraderLoading} aria-label="Aggiorna prezzi CardTrader" style={{ marginTop: 6, fontSize: '0.75rem', color: '#7b1fa2', background: 'none', border: 'none', cursor: cardtraderLoading ? 'not-allowed' : 'pointer', padding: 0, opacity: cardtraderLoading ? 0.6 : 1 }}>
                    🔄 Aggiorna
                  </button>
                </>
            }
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>📊 Quantità nel tempo</h2>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <QuantitaChart storico={storico_quantita} />
        </div>
      </div>

      {/* Movements table */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>
          📋 Storico Movimenti
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#888', marginLeft: 8 }}>({movimenti.length} totali)</span>
        </h2>
        {movimenti.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '24px 0' }}>Nessun movimento registrato</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}>
                    {['Data', 'Tipo', 'Quantità', 'Fornitore', 'Note'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimentiPagina.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '9px 14px', color: '#555', whiteSpace: 'nowrap' }}>{fmtDate(m.data_movimento)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{
                          backgroundColor: m.tipo === 'carico' ? '#e8f5e9' : '#ffebee',
                          color: m.tipo === 'carico' ? '#2e7d32' : '#c62828',
                          padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '0.82rem',
                        }}>{m.tipo}</span>
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 600 }}>{m.quantita}</td>
                      <td style={{ padding: '9px 14px', color: '#555' }}>{m.fornitore_nome || '—'}</td>
                      <td style={{ padding: '9px 14px', color: '#777', fontStyle: m.note ? 'normal' : 'italic' }}>{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button onClick={() => setMovPage(p => Math.max(0, p - 1))} disabled={movPage === 0}
                  style={btnSmall(movPage === 0 ? '#ccc' : PRIMARY_COLOR)}>‹ Prec</button>
                <span style={{ padding: '4px 10px', fontSize: '0.9rem', color: '#555' }}>
                  {movPage + 1} / {totalPages}
                </span>
                <button onClick={() => setMovPage(p => Math.min(totalPages - 1, p + 1))} disabled={movPage === totalPages - 1}
                  style={btnSmall(movPage === totalPages - 1 ? '#ccc' : PRIMARY_COLOR)}>Succ ›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sezione Codici & Etichette */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>🔖 Codici &amp; Etichette</h2>
        {barcodeError && <div style={{ color: 'red', marginBottom: 8, fontSize: '0.9rem' }}>{barcodeError}</div>}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {prodotto.barcode ? (
            <div>
              <BarcodeDisplay value={prodotto.barcode} productName={prodotto.nome} width={2} height={60} />
              <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#555', fontFamily: 'monospace', textAlign: 'center' }}>{prodotto.barcode}</div>
            </div>
          ) : (
            <div style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.9rem', padding: '8px 0' }}>
              Nessun barcode generato
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>QR Code</div>
            <QRCodeDisplay value={`prodotto:${prodotto.id}`} size={100} productName={prodotto.nome} />
            <div style={{ fontSize: '0.75rem', color: '#555', textAlign: 'center' }}>📱 Scansiona con fotocamera</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleGenerateBarcode}
              disabled={generatingBarcode}
              style={{ ...btnStyle(PRIMARY_COLOR), opacity: generatingBarcode ? 0.6 : 1, cursor: generatingBarcode ? 'not-allowed' : 'pointer' }}
            >
              {generatingBarcode ? '⏳ Generazione...' : prodotto.barcode ? '🔄 Rigenera Barcode' : '🔖 Genera Barcode'}
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              style={btnStyle('#1565c0')}
            >🖨️ Stampa Etichetta</button>
            <button
              onClick={handleStampaQR}
              style={btnStyle('#7c3aed')}
            >🖨️ Stampa QR</button>
          </div>
        </div>
      </div>

      {/* Prodotti correlati */}
      {prodotti_correlati.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h2 style={{ color: PRIMARY_COLOR, marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>🔗 Prodotti correlati</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {prodotti_correlati.map(pc => (
              <div key={pc.id}
                onClick={() => navigate(`/prodotti/${pc.id}`)}
                style={{
                  cursor: 'pointer', borderRadius: 8, border: '1px solid #e8eaf6',
                  padding: 12, transition: 'box-shadow 0.2s',
                  backgroundColor: 'white',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  {pc.foto_url
                    ? <img src={getFotoUrl(pc.foto_url)} alt={pc.nome}
                        style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover' }} />
                    : <span style={{ fontSize: '2.5rem' }}>📦</span>
                  }
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: PRIMARY_COLOR, marginBottom: 4, textAlign: 'center' }}>{pc.nome}</div>
                <div style={{ fontSize: '0.78rem', color: '#888', textAlign: 'center', marginBottom: 4 }}>
                  <code>{pc.sku}</code>
                </div>
                <div style={{ fontSize: '0.82rem', textAlign: 'center', color: pc.quantita < pc.quantita_minima ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
                  Qty: {pc.quantita}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPrintModal && (
        <PrintBarcodeModal
          prodotti={[prodotto]}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  )
}

const cardStyle = {
  backgroundColor: 'white', borderRadius: '8px',
  padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const statCardStyle = {
  backgroundColor: 'white', borderRadius: '8px',
  padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}

const infoRowStyle = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', gap: 8, padding: '4px 0',
  borderBottom: '1px solid #f0f0f0',
}

const labelStyle = { fontSize: '0.85rem', color: '#888', fontWeight: 500 }
const valueStyle = { fontSize: '0.9rem', color: '#333', fontWeight: 600, textAlign: 'right' }

const btnStyle = (bg) => ({
  backgroundColor: bg, color: 'white', border: 'none',
  borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold',
  fontSize: '0.9rem',
})

const btnSmall = (bg) => ({
  ...btnStyle(bg), padding: '4px 12px', fontSize: '0.85rem',
  cursor: bg === '#ccc' ? 'default' : 'pointer',
})

export default DettaglioProdotto