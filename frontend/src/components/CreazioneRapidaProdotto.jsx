import { useState, useEffect } from 'react'
import { prodottiAPI, categorieAPI } from '../api/client'

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  border: '1.5px solid #e0e4ef',
  borderRadius: 8,
  fontSize: 16,
  outline: 'none',
  minHeight: 48,
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 14,
}

const labelText = {
  fontSize: '0.85rem',
  color: '#555',
  fontWeight: 600,
}

export default function CreazioneRapidaProdotto({ barcode = '', onSuccess, onClose }) {
  const [categorie, setCategorie] = useState([])
  const [form, setForm] = useState({
    nome: '',
    barcode: barcode,
    sku: barcode || '',
    categoria_id: '',
    prezzo_acquisto: '',
    prezzo_vendita: '',
    quantita: 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    categorieAPI.getAll()
      .then(r => setCategorie(r.data))
      .catch(() => {})
  }, [])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Il nome del prodotto è obbligatorio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const parsedAcquisto = parseFloat(form.prezzo_acquisto)
      const parsedVendita = parseFloat(form.prezzo_vendita)
      const payload = {
        nome: form.nome.trim(),
        ...(form.barcode.trim() && { barcode: form.barcode.trim() }),
        ...(form.sku.trim() && { sku: form.sku.trim() }),
        ...(form.categoria_id && { categoria_id: Number(form.categoria_id) }),
        ...(!isNaN(parsedAcquisto) && { prezzo_acquisto: parsedAcquisto }),
        ...(!isNaN(parsedVendita) && { prezzo_vendita: parsedVendita }),
        quantita: Number(form.quantita) || 0,
      }
      const res = await prodottiAPI.create(payload)
      onSuccess(res.data)
    } catch (err) {
      const msg = err.response?.data?.detail
      if (Array.isArray(msg)) {
        setError(msg.map(e => e.msg || JSON.stringify(e)).join(', '))
      } else {
        setError(msg || 'Errore durante la creazione del prodotto.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px 16px 0 0',
        padding: 'clamp(16px, 4vw, 28px)',
        width: '100%',
        maxWidth: 640,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#1a237e', fontSize: 'clamp(1rem, 4vw, 1.3rem)' }}>
            ➕ Crea Prodotto Rapido
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.5rem',
            cursor: 'pointer', color: '#666', minHeight: 44, minWidth: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#ffebee', color: '#c62828', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: '0.9rem',
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            <span style={labelText}>Nome prodotto *</span>
            <input
              style={inputStyle}
              placeholder="Es. Prodotto XYZ"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              required
              autoFocus
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Barcode / QR</span>
            <input
              style={inputStyle}
              placeholder="Codice scansionato"
              value={form.barcode}
              onChange={e => set('barcode', e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>SKU <span style={{ fontWeight: 400, color: '#888' }}>(lascia vuoto per auto-generare)</span></span>
            <input
              style={inputStyle}
              placeholder="Opzionale"
              value={form.sku}
              onChange={e => set('sku', e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Categoria</span>
            <select
              style={{ ...inputStyle, backgroundColor: 'white' }}
              value={form.categoria_id}
              onChange={e => set('categoria_id', e.target.value)}
            >
              <option value="">— Seleziona categoria —</option>
              {categorie.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              <span style={labelText}>Prezzo acquisto (€)</span>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.prezzo_acquisto}
                onChange={e => set('prezzo_acquisto', e.target.value)}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelText}>Prezzo vendita (€)</span>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.prezzo_vendita}
                onChange={e => set('prezzo_vendita', e.target.value)}
              />
            </label>
          </div>

          <label style={labelStyle}>
            <span style={labelText}>
              Quantità iniziale{' '}
              <span style={{ fontWeight: 400, color: '#888' }}>(sarà aggiunta tramite la fornitura)</span>
            </span>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="1"
              value={form.quantita}
              onChange={e => set('quantita', e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                minHeight: 52,
                fontSize: 16,
                borderRadius: 10,
                border: '1.5px solid #ccc',
                background: 'white',
                color: '#555',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                minHeight: 52,
                fontSize: 16,
                borderRadius: 10,
                border: 'none',
                background: saving ? '#ccc' : '#2e7d32',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              {saving ? '⏳ Salvataggio…' : '✅ Crea e Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
