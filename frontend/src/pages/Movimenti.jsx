import { useState, useEffect } from 'react'
import { movimentiAPI, prodottiAPI, fornitoriAPI } from '../api/client'

const emptyForm = { prodotto_id: '', tipo: 'carico', quantita: 1, note: '', fornitore_id: '' }

function Movimenti() {
  const [movimenti, setMovimenti] = useState([])
  const [prodotti, setProdotti] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchAll = async () => {
    try {
      const [m, p, f] = await Promise.all([
        movimentiAPI.getAll({ limit: 100 }),
        prodottiAPI.getAll({ limit: 1000 }),
        fornitoriAPI.getAll(),
      ])
      setMovimenti(m.data)
      setProdotti(p.data)
      setFornitori(f.data)
    } catch (err) {
      setError('Errore nel caricamento dei dati')
    }
  }

  useEffect(() => { fetchAll() }, [])

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
      setForm(emptyForm)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo movimento?')) return
    try {
      await movimentiAPI.delete(id)
      fetchAll()
    } catch (err) {
      setError('Errore nell\'eliminazione')
    }
  }

  const getProdottoNome = (id) => prodotti.find(p => p.id === id)?.nome || `#${id}`
  const getFornitoreNome = (id) => fornitori.find(f => f.id === id)?.nome || '-'

  const movimentiFiltrati = movimenti.filter(m => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      getProdottoNome(m.prodotto_id).toLowerCase().includes(q) ||
      (prodotti.find(p => p.id === m.prodotto_id)?.sku || '').toLowerCase().includes(q) ||
      (m.tipo || '').toLowerCase().includes(q) ||
      getFornitoreNome(m.fornitore_id).toLowerCase().includes(q) ||
      (m.note || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e' }}>🔄 Movimenti</h1>
        <button onClick={() => { setShowForm(!showForm); setForm(emptyForm) }} style={btnStyle('#1a237e')}>
          {showForm ? 'Annulla' : '+ Registra Movimento'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>Nuovo Movimento</h3>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span>Prodotto *</span>
              <select required value={form.prodotto_id} onChange={(e) => setForm({ ...form, prodotto_id: e.target.value })} style={inputStyle}>
                <option value="">-- Seleziona --</option>
                {prodotti.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.sku})</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              <span>Tipo *</span>
              <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                <option value="carico">📥 Carico</option>
                <option value="scarico">📤 Scarico</option>
              </select>
            </label>
            <label style={labelStyle}>
              <span>Quantità *</span>
              <input type="number" min="1" required value={form.quantita} onChange={(e) => setForm({ ...form, quantita: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Fornitore</span>
              <select value={form.fornitore_id} onChange={(e) => setForm({ ...form, fornitore_id: e.target.value })} style={inputStyle}>
                <option value="">-- Nessuno --</option>
                {fornitori.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: 'span 2' }}>
              <span>Note</span>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={inputStyle} />
            </label>
          </div>
          <button type="submit" style={btnStyle('#2e7d32')}>Registra Movimento</button>
        </form>
      )}

      {/* Barra di ricerca */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.1rem' }}>🔍</span>
        <input
          type="text"
          placeholder="Cerca per prodotto, SKU, tipo, fornitore, note..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...inputStyle,
            maxWidth: '420px',
            padding: '9px 14px',
            fontSize: '0.97rem',
            border: '1.5px solid #c5cae9',
            borderRadius: '8px',
            outline: 'none',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#888', padding: '0 4px' }}
            title="Cancella ricerca"
          >✕</button>
        )}
        {search && (
          <span style={{ fontSize: '0.88rem', color: '#666' }}>
            {movimentiFiltrati.length} risultat{movimentiFiltrati.length === 1 ? 'o' : 'i'} su {movimenti.length}
          </span>
        )}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
              {['ID', 'Prodotto', 'Tipo', 'Quantità', 'Fornitore', 'Note', 'Data', 'Azioni'].map(h => (
                <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movimentiFiltrati.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                  {search ? `Nessun movimento corrisponde a "${search}"` : 'Nessun movimento registrato'}
                </td>
              </tr>
            ) : movimentiFiltrati.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{m.id}</td>
                <td style={tdStyle}>{getProdottoNome(m.prodotto_id)}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px',
                    backgroundColor: m.tipo === 'carico' ? '#e8f5e9' : '#ffebee',
                    color: m.tipo === 'carico' ? '#2e7d32' : '#c62828',
                    fontWeight: 'bold', fontSize: '0.85rem',
                  }}>
                    {m.tipo === 'carico' ? '📥' : '📤'} {m.tipo}
                  </span>
                </td>
                <td style={tdStyle}>{m.quantita}</td>
                <td style={tdStyle}>{m.fornitore_id ? getFornitoreNome(m.fornitore_id) : '-'}</td>
                <td style={tdStyle}>{m.note || '-'}</td>
                <td style={tdStyle}>{m.data_movimento ? new Date(m.data_movimento).toLocaleString('it-IT') : '-'}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleDelete(m.id)} style={btnSmall('#c62828')}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: '600' }
const tdStyle = { padding: '10px 16px', color: '#333' }
const btnStyle = (bg) => ({ backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' })
const btnSmall = (bg) => ({ ...btnStyle(bg), padding: '4px 10px', fontSize: '0.85rem' })
const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }
const formStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: '#555' }

export default Movimenti
