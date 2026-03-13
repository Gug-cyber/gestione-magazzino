import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, ubicazioniAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'

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

function BarcodeCanvas({ value }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = 280
    canvas.height = 80

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const barWidth = 2
    const quietZone = 10
    let x = quietZone

    ctx.fillStyle = '#000000'

    ctx.fillRect(x, 5, barWidth, 60); x += barWidth + barWidth
    ctx.fillRect(x, 5, barWidth * 2, 60); x += barWidth * 2 + barWidth
    ctx.fillRect(x, 5, barWidth, 60); x += barWidth + barWidth * 2

    for (let i = 0; i < value.length && x < canvas.width - quietZone - 20; i++) {
      const charCode = value.charCodeAt(i)
      const pattern = charCode % 16
      for (let b = 0; b < 8; b++) {
        const isFilled = (pattern >> b) & 1
        const w = barWidth + (isFilled ? barWidth : 0)
        if (isFilled) {
          ctx.fillRect(x, 5, w, 60)
        }
        x += w + barWidth
      }
    }

    if (x < canvas.width - quietZone - 10) {
      ctx.fillRect(x, 5, barWidth * 2, 60); x += barWidth * 2 + barWidth
      ctx.fillRect(x, 5, barWidth, 60); x += barWidth + barWidth
      ctx.fillRect(x, 5, barWidth * 2, 60)
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
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e', marginBottom: '8px' }}>➕ Aggiungi Prodotto</h1>
        <button
          onClick={() => navigate('/prodotti')}
          style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontSize: '0.9rem', padding: 0, textDecoration: 'underline' }}
        >
          ← Torna ai Prodotti
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {/* Two sections side by side */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Section 1 — Manual form */}
        <div style={{ flex: '1 1 400px', backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#1a237e', marginTop: 0, marginBottom: '4px' }}>📝 Inserimento Manuale</h2>
          <p style={{ color: '#666', marginTop: 0, marginBottom: '20px', fontSize: '0.92rem' }}>Compila il form per aggiungere un prodotto</p>

          <form onSubmit={handleSubmit}>
            <div style={gridStyle}>
              {[
                { key: 'nome', label: 'Nome *', required: true },
                { key: 'descrizione', label: 'Descrizione' },
                { key: 'quantita', label: 'Quantità', type: 'number' },
                { key: 'quantita_minima', label: 'Quantità Minima', type: 'number' },
                { key: 'prezzo_acquisto', label: 'Prezzo Acquisto (€)', type: 'number', step: '0.01' },
                { key: 'prezzo_vendita', label: 'Prezzo Vendita (€)', type: 'number', step: '0.01' },
              ].map(({ key, label, type = 'text', required, step }) => (
                <label key={key} style={labelStyle}>
                  <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
                  <input
                    type={type}
                    step={step}
                    required={required}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    style={inputStyle}
                  />
                </label>
              ))}

              <label style={labelStyle}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>SKU *</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => {
                      setSkuManuale(true)
                      setForm({ ...form, sku: e.target.value })
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => { setSkuManuale(false) }}
                    style={{ padding: '8px 10px', backgroundColor: '#546e7a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}
                    title="Rigenera SKU automaticamente"
                  >🔄</button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    style={{ padding: '8px 10px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}
                    title="Scansiona codice a barre"
                  >📷</button>
                </div>
              </label>

              {/* Sezione Codice a Barre */}
              {form.sku && (
                <div style={{
                  gridColumn: '1 / -1',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#fafafa',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px', fontWeight: 600 }}>
                    🔖 Codice a Barre (SKU)
                  </div>
                  <BarcodeCanvas value={form.sku} />
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    letterSpacing: '0.15em',
                    color: '#1a237e',
                    marginTop: '8px',
                    fontWeight: 'bold',
                  }}>
                    {form.sku}
                  </div>
                </div>
              )}

              <label style={labelStyle}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>Stato di Conservazione</span>
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
                <span style={{ fontSize: '0.85rem', color: '#555' }}>Lingua</span>
                <select
                  value={form.lingua}
                  onChange={(e) => setForm({ ...form, lingua: e.target.value })}
                  style={inputStyle}>
                  <option value="">-- Nessuna --</option>
                  <option value="Italiano">Italiano</option>
                  <option value="Inglese">Inglese</option>
                  <option value="Giapponese">Giapponese</option>
                  <option value="Cinese">Cinese</option>
                  <option value="Coreano">Coreano</option>
                </select>
              </label>

              <label style={labelStyle}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>Categoria</span>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Nessuna --</option>
                  {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                <span style={{ fontSize: '0.85rem', color: '#555' }}>Ubicazione</span>
                <select value={form.ubicazione_id} onChange={(e) => setForm({ ...form, ubicazione_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Nessuna --</option>
                  {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </label>
            </div>

            {/* Upload Foto */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '8px' }}>Foto prodotto</span>
              <div
                onClick={() => fotoInputRef.current && fotoInputRef.current.click()}
                style={{
                  width: '120px', height: '120px', border: '2px dashed #c5cae9', borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backgroundColor: '#f8f9ff', overflow: 'hidden', position: 'relative',
                }}
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="anteprima" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <span style={{ fontSize: '2rem' }}>📷</span>
                    <span style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px', textAlign: 'center', padding: '0 8px' }}>
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
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFotoChange}
              />
            </div>

            <button type="submit" style={btnStyle('#2e7d32')}>Crea Prodotto</button>
          </form>
        </div>

        {/* Divider "OPPURE" */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '40px', paddingTop: '80px' }}>
          <div style={{ width: '1px', height: '40px', backgroundColor: '#ddd' }} />
          <span style={{ padding: '8px', color: '#888', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>OPPURE</span>
          <div style={{ width: '1px', height: '40px', backgroundColor: '#ddd' }} />
        </div>

        {/* Section 2 — CSV import */}
        <div style={{ flex: '1 1 320px', backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#6a1b9a', marginTop: 0, marginBottom: '4px' }}>📂 Importa da CSV</h2>
          <p style={{ color: '#666', marginTop: 0, marginBottom: '16px', fontSize: '0.92rem' }}>Carica un file CSV per aggiungere più prodotti contemporaneamente</p>

          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f3e5f5', borderRadius: '6px', fontSize: '0.85rem', color: '#555' }}>
            <strong>Colonne attese:</strong><br />
            <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>nome, sku, quantita, quantita_minima, prezzo_acquisto, prezzo_vendita, descrizione, stato_conservazione, lingua</code>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => csvInputRef.current && csvInputRef.current.click()}
              style={btnStyle('#6a1b9a')}
            >📂 Carica file CSV</button>
            <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />

            <button
              onClick={handleDownloadSample}
              style={{ background: 'none', border: 'none', color: '#6a1b9a', cursor: 'pointer', fontSize: '0.88rem', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
            >Scarica CSV di esempio</button>
          </div>

          {importMsg && (
            <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '6px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
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
                  style={{ ...btnStyle('#2e7d32'), marginTop: '12px', display: 'block' }}
                >Vai ai Prodotti</button>
              )}
            </div>
          )}
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

const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '4px' }
const btnStyle = (bg) => ({ backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' })

export default NuovoProdotto
