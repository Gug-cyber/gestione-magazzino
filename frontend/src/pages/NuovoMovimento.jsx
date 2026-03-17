import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { movimentiAPI, prodottiAPI, fornitoriAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'

const emptyForm = { prodotto_id: '', tipo: 'carico', quantita: 1, note: '', fornitore_id: '' }

function NuovoMovimento() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [prodotti, setProdotti] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, f] = await Promise.all([
          prodottiAPI.getAll({ limit: 1000 }),
          fornitoriAPI.getAll(),
        ])
        setProdotti(p.data)
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
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e', marginBottom: '8px' }}>➕ Registra Movimento</h1>
        <button
          onClick={() => navigate('/movimenti')}
          style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', fontSize: '0.9rem', padding: 0, textDecoration: 'underline' }}
        >
          ← Torna ai Movimenti
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '800px' }}>
        <h2 style={{ color: '#1a237e', marginTop: 0, marginBottom: '4px' }}>📝 Nuovo Movimento</h2>
        <p style={{ color: '#666', marginTop: 0, marginBottom: '20px', fontSize: '0.92rem' }}>Compila il form per registrare un movimento di magazzino</p>

        <form onSubmit={handleSubmit}>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Prodotto *</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  required
                  value={form.prodotto_id}
                  onChange={(e) => setForm({ ...form, prodotto_id: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">-- Seleziona --</option>
                  {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', padding: '0 10px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.1rem' }}
                  title="Scansiona codice a barre"
                >📷</button>
              </div>
            </label>

            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Tipo *</span>
              <select
                required
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                style={inputStyle}
              >
                <option value="carico">📥 Carico</option>
                <option value="scarico">📤 Scarico</option>
              </select>
            </label>

            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Quantità *</span>
              <input
                type="number"
                min="1"
                required
                value={form.quantita}
                onChange={(e) => setForm({ ...form, quantita: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Fornitore</span>
              <select
                value={form.fornitore_id}
                onChange={(e) => setForm({ ...form, fornitore_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">-- Nessuno --</option>
                {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </label>

            <label style={{ ...labelStyle, gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>Note</span>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                style={inputStyle}
              />
            </label>
          </div>

          <button type="submit" style={btnStyle('#2e7d32')}>Registra Movimento</button>
        </form>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={(value) => {
            const prodotto = prodotti.find(p => p.sku === value)
            if (prodotto) setForm(f => ({ ...f, prodotto_id: String(prodotto.id) }))
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

const inputStyle = { height: '36px', padding: '0 12px', border: '1.5px solid #e0e4ef', borderRadius: '6px', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '4px' }
const btnStyle = (bg) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', height: '36px', padding: '0 16px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' })

export default NuovoMovimento
