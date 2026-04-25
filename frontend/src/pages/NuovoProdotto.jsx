import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, ubicazioniAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'
import JsBarcode from 'jsbarcode'
import { normalizeSkuForCode39 } from '../utils/formatters'
import { generateSKU } from '../utils/skuGenerator'
import { flattenCategorieTree } from '../utils/categorieUtils'
import '../styles/shared.css'

function BarcodeCanvas({ value, canvasRef: extRef }) {
  const localRef = useRef(null)
  const canvasRef = extRef || localRef

  useEffect(() => {
    if (!canvasRef.current || !value) return
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
      ctx.fillStyle = '#ef4444'
      ctx.textAlign = 'center'
      ctx.fillText('Errore generazione barcode', canvasRef.current.width / 2, 50)
    }
  }, [value])

  return <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '8px' }} />
}

const emptyForm = {
  nome: '', descrizione: '', sku: '', barcode: '', quantita: 0,
  quantita_minima: 0, prezzo_acquisto: '', prezzo_vendita: '',
  categoria_id: '', ubicazione_id: '', stato_conservazione: '', lingua: '',
  su_vinted: false, su_wallapop: false,
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
        const [c, u] = await Promise.all([categorieAPI.getTree(), ubicazioniAPI.getAll()])
        setCategorie(c.data || [])
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
      barcode: form.barcode ? form.barcode.trim() || null : null,
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
          // upload foto fallisce silenziosamente
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
      setError('La foto non puo superare i 10 MB')
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
  @page { size: 50mm 25mm; margin: 0; }
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
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-section">
          <button onClick={() => navigate('/prodotti')} className="btn-back">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Prodotti
          </button>
          <div className="page-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Aggiungi Prodotto</h1>
            <p className="page-subtitle">Inserisci un nuovo prodotto nel catalogo</p>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Two-column layout */}
      <div className="two-column-layout">
        {/* LEFT: Form */}
        <div className="card section-card">
          <h2 className="section-title">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Inserimento Manuale
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group form-full">
                <label className="form-label">Nome *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group form-full">
                <label className="form-label">Descrizione</label>
                <input
                  type="text"
                  value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantita</label>
                <input
                  type="number"
                  value={form.quantita}
                  onChange={(e) => setForm({ ...form, quantita: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantita Minima</label>
                <input
                  type="number"
                  value={form.quantita_minima}
                  onChange={(e) => setForm({ ...form, quantita_minima: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prezzo Acquisto</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prezzo_acquisto}
                  onChange={(e) => setForm({ ...form, prezzo_acquisto: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Prezzo Vendita</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prezzo_vendita}
                  onChange={(e) => setForm({ ...form, prezzo_vendita: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            {/* SKU row */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">SKU *</label>
              <div className="input-with-button">
                <input
                  type="text"
                  required
                  value={form.sku}
                  onChange={(e) => { setSkuManuale(true); setForm({ ...form, sku: normalizeSkuForCode39(e.target.value) }) }}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setSkuManuale(false)}
                  className="btn-icon btn-icon-gray"
                  title="Rigenera SKU automaticamente"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="btn-icon btn-icon-blue"
                  title="Scansiona codice a barre"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
              </div>
              <p className="form-hint">Lo SKU verra convertito automaticamente in MAIUSCOLO. Caratteri validi: 0-9, A-Z, - . $ / + % (spazio)</p>
            </div>

            {/* Grid 2 cols: selects */}
            <div className="form-grid" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Stato di Conservazione</label>
                <select value={form.stato_conservazione} onChange={(e) => setForm({ ...form, stato_conservazione: e.target.value })} className="form-input">
                  <option value="">-- Nessuno --</option>
                  <option value="Mint">Mint</option>
                  <option value="Near Mint">Near Mint</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Light Played">Light Played</option>
                  <option value="Played">Played</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lingua</label>
                <select value={form.lingua} onChange={(e) => setForm({ ...form, lingua: e.target.value })} className="form-input">
                  <option value="">-- Nessuna --</option>
                  <option value="Italiano">Italiano</option>
                  <option value="Inglese">Inglese</option>
                  <option value="Giapponese">Giapponese</option>
                  <option value="Cinese">Cinese</option>
                  <option value="Coreano">Coreano</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="form-input">
                  <option value="">-- Nessuna --</option>
                  {flattenCategorieTree(categorie).map(c => (
                    <option key={c.id} value={c.id}>
                      {'\u00a0\u00a0'.repeat(c.level)}{c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ubicazione</label>
                <select value={form.ubicazione_id} onChange={(e) => setForm({ ...form, ubicazione_id: e.target.value })} className="form-input">
                  <option value="">-- Nessuna --</option>
                  {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Piattaforme annunci */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Piattaforme annunci</label>
              <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!form.su_vinted}
                    onChange={(e) => setForm({ ...form, su_vinted: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Vinted</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!form.su_wallapop}
                    onChange={(e) => setForm({ ...form, su_wallapop: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Wallapop</span>
                </label>
              </div>
            </div>

            {/* Foto upload */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Foto prodotto</label>
              <div
                onClick={() => fotoInputRef.current && fotoInputRef.current.click()}
                className="foto-upload-zone"
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="anteprima" className="foto-preview" />
                ) : (
                  <>
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.5 }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span className="foto-upload-text">Clicca per aggiungere foto</span>
                  </>
                )}
              </div>
              {fotoPreview && (
                <button
                  type="button"
                  onClick={() => { setFotoFile(null); setFotoPreview(null) }}
                  className="btn-remove-foto"
                >
                  Rimuovi foto
                </button>
              )}
              <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
            </div>

            <button type="submit" className="btn-success btn-full">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Crea Prodotto
            </button>
          </form>
        </div>

        {/* RIGHT: Barcode + CSV */}
        <div className="sidebar-cards">
          {/* Barcode card */}
          {form.sku && (
            <div className="card section-card">
              <h3 className="section-title-sm">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 2v20M18 2v20M3 6h4M17 6h4M3 18h4M17 18h4M3 12h18"/>
                </svg>
                Codice a Barre
              </h3>
              <div className="barcode-container">
                <BarcodeCanvas value={form.sku} canvasRef={barcodeCanvasRef} />
              </div>
              <button type="button" onClick={handlePrintBarcode} className="btn-secondary btn-full">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Stampa etichetta
              </button>
            </div>
          )}

          {/* CSV card */}
          <div className="card section-card csv-card">
            <h3 className="section-title-sm csv-title">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Importa da CSV
            </h3>
            <p className="csv-description">Carica un file CSV per aggiungere piu prodotti contemporaneamente</p>

            <div className="csv-columns-info">
              <strong>Colonne attese:</strong><br />
              <code>nome, sku, quantita, quantita_minima, prezzo_acquisto, prezzo_vendita, descrizione, stato_conservazione, lingua</code>
            </div>

            <div className="csv-actions">
              <button
                type="button"
                onClick={() => csvInputRef.current && csvInputRef.current.click()}
                className="btn-purple btn-full"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Carica file CSV
              </button>
              <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />

              <button type="button" onClick={handleDownloadSample} className="link-button">
                Scarica CSV di esempio
              </button>
            </div>

            {importMsg && (
              <div className="import-result">
                <span className="import-success">
                  Importati {importMsg.importati} prodotti.{importMsg.saltati > 0 ? ` ${importMsg.saltati} saltati.` : ''}
                </span>
                {importMsg.errori && importMsg.errori.length > 0 && (
                  <ul className="import-errors">
                    {importMsg.errori.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                {importMsg.importati > 0 && (
                  <button onClick={() => navigate('/prodotti')} className="btn-success btn-full">
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
          onScan={(value) => {
            const normalizedBarcode = normalizeSkuForCode39(value)
            setForm(f => ({
              ...f,
              barcode: value,
              sku: skuManuale ? f.sku : normalizedBarcode,
            }))
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default NuovoProdotto
