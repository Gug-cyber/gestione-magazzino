import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, ubicazioniAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'

function generateSKU(nome, statoConservazione, lingua) {
  const parenMatch = nome.match(/\(([^)]+)\)/)
  const parenCode = parenMatch
    ? parenMatch[1].replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toUpperCase()
    : null

  const nomePulito = nome.replace(/\([^)]*\)/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const prefix = nomePulito.replace(/\s+/g, '').substring(0, 3).toUpperCase()

  const statoMap = {
    'Mint': 'MT', 'Near Mint': 'NM', 'Excellent': 'EX',
    'Good': 'GD', 'Light Played': 'LP', 'Played': 'PL', 'Poor': 'PO',
  }
  const statoCode = statoMap[statoConservazione] || null

  const linguaMap = {
    'Italiano': 'IT', 'Inglese': 'EN', 'Giapponese': 'JP',
    'Cinese': 'CN', 'Coreano': 'KR',
  }
  const linguaCode = linguaMap[lingua] || null

  const parts = [prefix, parenCode, statoCode, linguaCode].filter(Boolean)
  return parts.join('-')
}

const CODE39_CHARS = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011',
  '3': '110110010101', '4': '101001101011', '5': '110100110101',
  '6': '101100110101', '7': '101001011011', '8': '110100101101',
  '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
  'C': '110110100101', 'D': '101011001011', 'E': '110101100101',
  'F': '101101100101', 'G': '101010011011', 'H': '110101001101',
  'I': '101101001101', 'J': '101011001101', 'K': '110101010011',
  'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
  'O': '110101101001', 'P': '101101101001', 'Q': '101010110011',
  'R': '110101011001', 'S': '101101011001', 'T': '101011011001',
  'U': '110010101011', 'V': '100110101011', 'W': '110011010101',
  'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101',
  '$': '100100100101', '/': '100100101001', '+': '100101001001',
  '%': '101001001001', '*': '100101101101',
}

function BarcodeCanvas({ value, canvasRef: extRef }) {
  const localRef = useRef(null)
  const canvasRef = extRef || localRef

  useEffect(() => {
    if (!canvasRef.current || !value) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const narrowW = 2
    const wideW = narrowW * 3
    const barcodeHeight = 60
    const quietZone = narrowW * 10
    // Strip characters not supported by Code 39 (keep only valid charset)
    const sanitized = value.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '')
    const chars = ('*' + sanitized + '*').split('')

    let totalWidth = quietZone * 2
    for (let ci = 0; ci < chars.length; ci++) {
      const pattern = CODE39_CHARS[chars[ci]]
      if (!pattern) continue
      for (let i = 0; i < pattern.length; i++) {
        totalWidth += pattern[i] === '1' ? wideW : narrowW
      }
      if (ci < chars.length - 1) totalWidth += narrowW
    }

    canvas.width = Math.ceil(totalWidth)
    canvas.height = barcodeHeight + 24

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let x = quietZone
    ctx.fillStyle = '#000000'
    for (let ci = 0; ci < chars.length; ci++) {
      const char = chars[ci]
      const pattern = CODE39_CHARS[char]
      if (!pattern) continue
      for (let i = 0; i < pattern.length; i++) {
        const isBar = i % 2 === 0
        const isWide = pattern[i] === '1'
        const w = isWide ? wideW : narrowW
        if (isBar) ctx.fillRect(Math.round(x), 0, Math.round(w), barcodeHeight)
        x += w
      }
      if (ci < chars.length - 1) x += narrowW
    }

    ctx.font = '9px monospace'
    ctx.fillStyle = '#000'
    ctx.textAlign = 'center'
    ctx.fillText(sanitized, canvas.width / 2, barcodeHeight + 12)
  }, [value])

  return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto', imageRendering: 'pixelated' }} />
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
    setForm(f => ({ ...f, sku: generated }))
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
  .label { width: 48mm; height: 23mm; border: 0.3mm solid #888; border-radius: 1.5mm; padding: 1mm 2mm; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .label img { width: 44mm; height: auto; display: block; margin: 0 auto; }
  .sku { font-size: 6pt; font-weight: bold; letter-spacing: 0.05em; margin-top: 1mm; }
  .nome { font-size: 5pt; color: #333; font-family: sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 44mm; }
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
          style={{ background: 'none', border: '1.5px solid #c5cae9', color: '#1a237e', cursor: 'pointer', fontSize: '0.9rem', padding: '6px 14px', borderRadius: '8px', fontWeight: 600 }}
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
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>SKU *</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => { setSkuManuale(true); setForm({ ...form, sku: e.target.value }) }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setSkuManuale(false)}
                    style={{ padding: '10px', backgroundColor: '#546e7a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                    title="Rigenera SKU automaticamente"
                  >🔄</button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    style={{ padding: '10px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                    title="Scansiona codice a barre"
                  >📷</button>
                </div>
              </label>
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
          onScan={(value) => { setSkuManuale(true); setForm(f => ({ ...f, sku: value })); setShowScanner(false) }}
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
  padding: '10px 12px',
  border: '1.5px solid #c5cae9',
  borderRadius: '8px',
  fontSize: '0.95rem',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '5px' }
const labelTextStyle = { fontSize: '0.85rem', color: '#444', fontWeight: 600 }
const submitBtnStyle = {
  backgroundColor: '#2e7d32',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 20px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '1rem',
  width: '100%',
}

export default NuovoProdotto
