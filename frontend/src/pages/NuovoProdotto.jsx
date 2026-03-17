import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, ubicazioniAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'
import JsBarcode from 'jsbarcode'
import { normalizeSkuForCode39 } from '../utils/formatters'
import { generateSKU } from '../utils/skuGenerator'

function BarcodeCanvas({ value, canvasRef: extRef }) {
  const localRef = useRef(null)
  const canvasRef = extRef || localRef

  useEffect(() => {
    if (!canvasRef.current || !value) return

    // Convert to uppercase and remove characters not supported by CODE39
    // CODE39 charset: 0-9, A-Z, - . $ / + % (space)
    const sanitized = value.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '')

    if (!sanitized) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      return
    }

    try {
      JsBarcode(canvasRef.current, sanitized, {
        format: 'CODE39',
        width: 4,
        height: 140,
        displayValue: true,
        fontSize: 18,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch (e) {
      console.warn('Barcode generation failed:', e)
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.font = '14px Arial'
      ctx.fillStyle = '#c62828'
      ctx.textAlign = 'center'
      ctx.fillText('Errore generazione barcode', canvasRef.current.width / 2, 50)
    }
  }, [value])

  return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }} />
}

const emptyForm = {
  nome: '', descrizione: '', sku: '', quantita: 0,
  quantita_minima: 0, prezzo_acquisto: '', prezzo_vendita: '',
  categoria_id: '', ubicazione_id: '', stato_conservazione: '', lingua: '',
}

function NuovoProdotto() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [form, setForm] = useState(emptyForm)
  const [categorie, setCategorie] = useState([])
  const [ubicazioni, setUbicazioni] = useState([])
  const [error, setError] = useState('')
  const [importMsg, setImportMsg] = useState(null)
  const csvInputRef = useRef(null)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const fotoInputRef = useRef(null)
  const [showScanner, setShowScanner] = useState(false)
  const [skuManuale, setSkuManuale] = useState(false)
  const barcodeCanvasRef = useRef(null)

  useEffect(() => {
    if (skuManuale) return
    const generated = generateSKU(form.nome, form.stato_conservazione, form.lingua)
    setForm(f => ({ ...f, sku: normalizeSkuForCode39(generated) }))
  }, [form.nome, form.stato_conservazione, form.lingua, skuManuale])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, u] = await Promise.all([categorieAPI.getAll(), ubicazioniAPI.getAll()])
        setCategorie(c.data)
        setUbicazioni(u.data)
      } catch {
        setError('Errore nel caricamento dei dati')
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
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
    }
    try {
      const res = await prodottiAPI.create(payload)
      const newProdotto = res.data
      if (fotoFile) {
        try {
          await prodottiAPI.uploadFoto(newProdotto.id, fotoFile)
        } catch {
          // upload foto fallisce silenziosamente, il prodotto è già creato
        }
      }
      navigate('/prodotti')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleFotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      setError('La foto non può superare i 10 MB')
      return
    }
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setFotoPreview(ev.target.result)
    reader.onerror = () => setError('Errore nella lettura del file immagine')
    reader.readAsDataURL(file)
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImportMsg(null)
    setError('')
    try {
      const res = await prodottiAPI.importCSV(file)
      const { importati, saltati, errori } = res.data
      setImportMsg({ importati, saltati, errori })
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'importazione CSV')
    }
  }

  const handlePrintBarcode = () => {
    const canvas = barcodeCanvasRef.current
    if (!canvas) return
    const imgData = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank', 'width=300,height=200')
    if (!printWindow) return
    const safeSku = form.sku.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const safeNome = form.nome ? form.nome.substring(0, 25).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) : ''
    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Etichetta</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 50mm 25mm; margin: 0; } /* Standard adhesive label size (approx. 2" x 1") */
  body { width: 50mm; height: 25mm; overflow: hidden; background: white; font-family: monospace; display: flex; align-items: center; justify-content: center; }
  .label { width: 48mm; height: 23mm; border: 0.3mm solid #888; border-radius: 1.5mm; padding: 0.5mm 1mm; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .label img { width: 46mm; height: auto; display: block; margin: 0 auto; max-height: 18mm; }
  .sku { font-size: 7pt; font-weight: bold; letter-spacing: 0.05em; margin-top: 0.5mm; }
  .nome { font-size: 5.5pt; color: #333; font-family: sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 46mm; }
</style>
</head><body>
<div class="label">
  <img src="${imgData}" />
  <div class="sku">${safeSku}</div>
  ${safeNome ? `<div class="nome">${safeNome}</div>` : ''}
</div>
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},400);}<\/script>
</body></html>`)
    printWindow.document.close()
  }

  const handleDownloadSample = () => {
    const csv = [
      'nome,sku,quantita,quantita_minima,prezzo_acquisto,prezzo_vendita,descrizione,stato_conservazione,lingua',
      'Prodotto Esempio,SKU-001,10,2,5.00,12.50,Descrizione opzionale,Mint,Italiano',
      'Altro Prodotto,SKU-002,5,1,,,,,',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prodotti_esempio.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/prodotti')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'none', border: '1.5px solid #e0e4ef', color: '#1a237e', cursor: 'pointer', fontSize: '14px', height: '36px', padding: '0 14px', borderRadius: '6px', fontWeight: 600 }}
        >
          ← Prodotti
        </button>
        <h1 style={{ color: '#1a237e', margin: 0 }}>➕ Aggiungi Prodotto</h1>
      </div>

      {error && (
        <div style={{ color: '#c62828', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: '20px', alignItems: 'start' }}>

        {/* LEFT: Form */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1a237e', marginTop: 0, marginBottom: '18px', fontSize: '1.1rem' }}>📝 Inserimento Manuale</h2>

          <form onSubmit={handleSubmit}>
            {/* Grid 2 cols */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                <span style={labelTextStyle}>Nome *</span>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                <span style={labelTextStyle}>Descrizione</span>
                <input
                  type="text"
                  value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Quantità</span>
                <input
                  type="number"
                  value={form.quantita}
                  onChange={(e) => setForm({ ...form, quantita: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Quantità Minima</span>
                <input
                  type="number"
                  value={form.quantita_minima}
                  onChange={(e) => setForm({ ...form, quantita_minima: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Prezzo Acquisto (€)</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.prezzo_acquisto}
                  onChange={(e) => setForm({ ...form, prezzo_acquisto: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Prezzo Vendita (€)</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.prezzo_vendita}
                  onChange={(e) => setForm({ ...form, prezzo_vendita: e.target.value })}
                  style={inputStyle}
                />
              </label>
            </div>

            {/* SKU row */}
            <div>
              <label style={labelStyle}>
                <span style={labelTextStyle}>SKU *</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => { setSkuManuale(true); setForm({ ...form, sku: normalizeSkuForCode39(e.target.value) }) }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setSkuManuale(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', padding: '0 10px', backgroundColor: '#546e7a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
                    title="Rigenera SKU automaticamente"
                  >🔄</button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', padding: '0 10px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
                    title="Scansiona codice a barre"
                  >📷</button>
                </div>
              </label>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '-8px', marginBottom: '14px' }}>
                ℹ️ Lo SKU verrà convertito automaticamente in MAIUSCOLO. Caratteri validi: 0-9, A-Z, - . $ / + % (spazio)
              </div>
            </div>

            {/* Grid 2 cols: selects */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Stato di Conservazione</span>
                <select value={form.stato_conservazione} onChange={(e) => setForm({ ...form, stato_conservazione: e.target.value })} style={inputStyle}>
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

              <label style={labelStyle}>
                <span style={labelTextStyle}>Lingua</span>
                <select value={form.lingua} onChange={(e) => setForm({ ...form, lingua: e.target.value })} style={inputStyle}>
                  <option value="">-- Nessuna --</option>
                  <option value="Italiano">Italiano</option>
                  <option value="Inglese">Inglese</option>
                  <option value="Giapponese">Giapponese</option>
                  <option value="Cinese">Cinese</option>
                  <option value="Coreano">Coreano</option>
                </select>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Categoria</span>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Nessuna --</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Ubicazione</span>
                <select value={form.ubicazione_id} onChange={(e) => setForm({ ...form, ubicazione_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Nessuna --</option>
                  {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
            </div>

            {/* Foto upload */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ ...labelTextStyle, display: 'block', marginBottom: '8px' }}>Foto prodotto</span>
              <div
                onClick={() => fotoInputRef.current && fotoInputRef.current.click()}
                style={{
                  width: '140px', height: '140px', border: '2px dashed #c5cae9', borderRadius: '10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backgroundColor: '#f8f9ff', overflow: 'hidden', position: 'relative',
                }}
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="anteprima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <span style={{ fontSize: '2.5rem' }}>📷</span>
                    <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '6px', textAlign: 'center', padding: '0 8px' }}>
                      Clicca per aggiungere foto
                    </span>
                  </>
                )}
              </div>
              {fotoPreview && (
                <button
                  type="button"
                  onClick={() => { setFotoFile(null); setFotoPreview(null) }}
                  style={{ marginTop: '6px', background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  ✕ Rimuovi foto
                </button>
              )}
              <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
            </div>

            <button type="submit" style={submitBtnStyle}>✓ Crea Prodotto</button>
          </form>
        </div>

        {/* RIGHT: Barcode + CSV */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Barcode card */}
          {form.sku && (
            <div style={cardStyle}>
              <h3 style={{ color: '#1a237e', marginTop: 0, marginBottom: '14px', fontSize: '1rem' }}>🔖 Codice a Barre</h3>
              <BarcodeCanvas value={form.sku} canvasRef={barcodeCanvasRef} />
              <button
                type="button"
                onClick={handlePrintBarcode}
                style={{
                  marginTop: '12px', width: '100%',
                  backgroundColor: '#37474f', color: 'white', border: 'none',
                  borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                  fontSize: '0.88rem', fontWeight: 'bold',
                }}
              >
                🖨️ Stampa etichetta
              </button>
            </div>
          )}

          {/* CSV card */}
          <div style={cardStyle}>
            <h3 style={{ color: '#6a1b9a', marginTop: 0, marginBottom: '10px', fontSize: '1rem' }}>📂 Importa da CSV</h3>
            <p style={{ color: '#666', marginTop: 0, marginBottom: '12px', fontSize: '0.88rem' }}>
              Carica un file CSV per aggiungere più prodotti contemporaneamente
            </p>

            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f3e5f5', borderRadius: '6px', fontSize: '0.82rem', color: '#555' }}>
              <strong>Colonne attese:</strong><br />
              <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>nome, sku, quantita, quantita_minima, prezzo_acquisto, prezzo_vendita, descrizione, stato_conservazione, lingua</code>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => csvInputRef.current && csvInputRef.current.click()}
                style={{ backgroundColor: '#6a1b9a', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.92rem' }}
              >
                📂 Carica file CSV
              </button>
              <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />

              <button
                onClick={handleDownloadSample}
                style={{ background: 'none', border: 'none', color: '#6a1b9a', cursor: 'pointer', fontSize: '0.88rem', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
              >
                Scarica CSV di esempio
              </button>
            </div>

            {importMsg && (
              <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  ✅ Importati {importMsg.importati} prodotti.{importMsg.saltati > 0 ? ` ${importMsg.saltati} saltati.` : ''}
                </span>
                {importMsg.errori && importMsg.errori.length > 0 && (
                  <ul style={{ marginTop: '8px', marginBottom: 0, color: '#c62828', fontSize: '0.9rem' }}>
                    {importMsg.errori.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                {importMsg.importati > 0 && (
                  <button
                    onClick={() => navigate('/prodotti')}
                    style={{ backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', display: 'block', width: '100%' }}
                  >
                    Vai ai Prodotti
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={(value) => { setSkuManuale(true); setForm(f => ({ ...f, sku: normalizeSkuForCode39(value) })); setShowScanner(false) }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

const cardStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(26,35,126,0.06)',
  border: '1px solid #e8eaf6',
}
const inputStyle = {
  height: '36px',
  padding: '0 12px',
  border: '1.5px solid #e0e4ef',
  borderRadius: '6px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.18s, box-shadow 0.18s',
}
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '5px' }
const labelTextStyle = { fontSize: '0.85rem', color: '#444', fontWeight: 600 }
const submitBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  backgroundColor: '#2e7d32',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  height: '40px',
  padding: '0 20px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '15px',
  width: '100%',
}

export default NuovoProdotto
