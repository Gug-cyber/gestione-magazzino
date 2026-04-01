import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { movimentiAPI, prodottiAPI, fornitoriAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import RicercaRapidaProdotto from '../components/RicercaRapidaProdotto'
import '../styles/shared.css'

const emptyForm = { prodotto_id: '', tipo: 'carico', quantita: 1, note: '', fornitore_id: '' }

// Icons
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ArrowDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
)

const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
)

function NuovoMovimento() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [fornitori, setFornitori] = useState([])
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const f = await fornitoriAPI.getAll()
        setFornitori(f.data)
      } catch {
        setError('Errore nel caricamento dei dati')
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.prodotto_id) {
      setError('Seleziona un prodotto dalla lista o scansiona un QR code')
      return
    }
    const payload = {
      prodotto_id: parseInt(form.prodotto_id),
      tipo: form.tipo,
      quantita: parseInt(form.quantita),
      note: form.note || null,
      fornitore_id: form.fornitore_id ? parseInt(form.fornitore_id) : null,
    }
    try {
      await movimentiAPI.create(payload)
      navigate('/movimenti')
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div className="page-icon">
            <PlusIcon />
          </div>
          <h1 className="page-title">Registra Movimento</h1>
        </div>
        <button onClick={() => navigate('/movimenti')} className="btn-back">
          <ArrowLeftIcon /> Torna ai Movimenti
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card" style={{ maxWidth: '800px' }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>
          <PlusIcon /> Nuovo Movimento
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '20px', fontSize: '0.92rem' }}>
          Compila il form per registrare un movimento di magazzino
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-full">
              <label className="form-label">Prodotto *</label>
              <RicercaRapidaProdotto
                onSelect={(prodotto) => setForm(f => ({ ...f, prodotto_id: String(prodotto.id) }))}
                placeholder="Cerca prodotto per nome, SKU..."
                showScanner={true}
                onScannerOpen={() => setShowScanner(true)}
              />
              {form.prodotto_id && (
                <span style={{ fontSize: '0.78rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <CheckIcon /> Prodotto selezionato
                </span>
              )}
            </div>

            <div>
              <label className="form-label">Tipo *</label>
              <select
                required
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="form-input"
              >
                <option value="carico">Carico</option>
                <option value="scarico">Scarico</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: form.tipo === 'carico' ? 'var(--success)' : 'var(--warning)' }}>
                {form.tipo === 'carico' ? <ArrowDownIcon /> : <ArrowUpIcon />}
                <span style={{ fontSize: '0.75rem' }}>{form.tipo === 'carico' ? 'Aggiunge quantita' : 'Rimuove quantita'}</span>
              </div>
            </div>

            <div>
              <label className="form-label">Quantita *</label>
              <input
                type="number"
                min="1"
                required
                value={form.quantita}
                onChange={(e) => setForm({ ...form, quantita: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Fornitore</label>
              <select
                value={form.fornitore_id}
                onChange={(e) => setForm({ ...form, fornitore_id: e.target.value })}
                className="form-input"
              >
                <option value="">-- Nessuno --</option>
                {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div className="form-full">
              <label className="form-label">Note</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="form-input"
                placeholder="Note opzionali..."
              />
            </div>
          </div>

          <button type="submit" className="btn-success" style={{ marginTop: '16px' }}>
            <CheckIcon /> Registra Movimento
          </button>
        </form>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={async (value) => {
            setShowScanner(false)
            if (/^prodotto:\d+$/i.test(value)) {
              const id = parseInt(value.split(':')[1])
              setForm(f => ({ ...f, prodotto_id: String(id) }))
              return
            }
            try {
              const res = await prodottiAPI.lookupByBarcode(value)
              if (res.data?.id) {
                setForm(f => ({ ...f, prodotto_id: String(res.data.id) }))
              }
            } catch {
              try {
                const res2 = await prodottiAPI.getAll({ search: value, limit: 1 })
                const items = Array.isArray(res2.data) ? res2.data : (res2.data?.items || [])
                if (items.length > 0) setForm(f => ({ ...f, prodotto_id: String(items[0].id) }))
              } catch { /* ignore */ }
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default NuovoMovimento
