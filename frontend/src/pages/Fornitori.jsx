import { useState, useEffect } from 'react'
import { fornitoriAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

const emptyForm = { nome: '', email: '', telefono: '', indirizzo: '', partita_iva: '', note: '' }

function Fornitori() {
  const isMobile = useIsMobile()
  const [fornitori, setFornitori] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const res = await fornitoriAPI.getAll()
      setFornitori(res.data)
    } catch {
      setError('Errore nel caricamento')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await fornitoriAPI.update(editing, form)
      } else {
        await fornitoriAPI.create(form)
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = (f) => {
    setForm({ nome: f.nome, email: f.email || '', telefono: f.telefono || '', indirizzo: f.indirizzo || '', partita_iva: f.partita_iva || '', note: f.note || '' })
    setEditing(f.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo fornitore?')) return
    try {
      await fornitoriAPI.delete(id)
      fetchAll()
    } catch {
      setError('Errore nell\'eliminazione')
    }
  }

  const fields = [
    { key: 'nome', label: 'Nome *', required: true },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'indirizzo', label: 'Indirizzo' },
    { key: 'partita_iva', label: 'Partita IVA' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e' }}>🏢 Fornitori</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }} style={btnStyle('#1a237e')}>
          {showForm ? 'Annulla' : '+ Aggiungi Fornitore'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>{editing ? 'Modifica Fornitore' : 'Nuovo Fornitore'}</h3>
          <div style={gridStyle}>
            {fields.map(({ key, label, required }) => (
              <label key={key} style={labelStyle}>
                <span>{label}</span>
                <input
                  type="text"
                  required={required}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
          <label style={{ ...labelStyle, marginBottom: '16px' }}>
            <span>Note</span>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>
          <button type="submit" style={btnStyle('#2e7d32')}>{editing ? 'Salva Modifiche' : 'Crea Fornitore'}</button>
        </form>
      )}

      {isMobile ? (
        <div>
          {fornitori.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Nessun fornitore trovato</div>
          ) : fornitori.map((f) => (
            <div key={f.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a237e' }}>🏢 {f.nome}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEdit(f)} style={btnSmall('#1565c0')}>✏️</button>
                  <button onClick={() => handleDelete(f.id)} style={btnSmall('#c62828')}>🗑️</button>
                </div>
              </div>
              {f.email && <div style={cardRowStyle}><span style={cardLabelStyle}>📧 Email</span><span style={cardValueStyle}>{f.email}</span></div>}
              {f.telefono && <div style={cardRowStyle}><span style={cardLabelStyle}>📞 Tel</span><span style={cardValueStyle}>{f.telefono}</span></div>}
              {f.partita_iva && <div style={cardRowStyle}><span style={cardLabelStyle}>P.IVA</span><span style={cardValueStyle}>{f.partita_iva}</span></div>}
              {f.note && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>{f.note}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                {['ID', 'Nome', 'Email', 'Telefono', 'Partita IVA', 'Note', 'Azioni'].map(h => (
                  <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fornitori.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Nessun fornitore trovato</td></tr>
              ) : fornitori.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{f.id}</td>
                  <td style={tdStyle}>{f.nome}</td>
                  <td style={tdStyle}>{f.email || '-'}</td>
                  <td style={tdStyle}>{f.telefono || '-'}</td>
                  <td style={tdStyle}>{f.partita_iva || '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.note || ''}>{f.note || '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(f)} style={btnSmall('#1565c0')}>✏️</button>
                    <button onClick={() => handleDelete(f.id)} style={btnSmall('#c62828')}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: '600' }
const tdStyle = { padding: '10px 16px', color: '#333' }
const btnStyle = (bg) => ({ backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' })
const btnSmall = (bg) => ({ ...btnStyle(bg), padding: '4px 10px', marginRight: '4px', fontSize: '0.85rem' })
const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.95rem', width: '100%' }
const formStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: '#555' }
const cardStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid #e8eaf6' }
const cardRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.9rem' }
const cardLabelStyle = { color: '#888', fontWeight: 500, marginRight: '8px' }
const cardValueStyle = { color: '#333', fontWeight: 600, textAlign: 'right' }

export default Fornitori
