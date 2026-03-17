import { useState, useEffect } from 'react'
import { ubicazioniAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

const emptyForm = { nome: '', zona: '', scaffale: '', piano: '' }

function Ubicazioni() {
  const isMobile = useIsMobile()
  const [ubicazioni, setUbicazioni] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const res = await ubicazioniAPI.getAll()
      setUbicazioni(res.data)
    } catch {
      setError('Errore nel caricamento')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      piano: form.piano !== '' ? parseInt(form.piano) : null,
    }
    try {
      if (editing) {
        await ubicazioniAPI.update(editing, payload)
      } else {
        await ubicazioniAPI.create(payload)
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = (u) => {
    setForm({ nome: u.nome, zona: u.zona || '', scaffale: u.scaffale || '', piano: u.piano ?? '' })
    setEditing(u.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa ubicazione?')) return
    try {
      await ubicazioniAPI.delete(id)
      fetchAll()
    } catch {
      setError('Errore nell\'eliminazione')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e' }}>📍 Ubicazioni</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }} style={btnStyle('#1a237e')}>
          {showForm ? 'Annulla' : '+ Aggiungi Ubicazione'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>{editing ? 'Modifica Ubicazione' : 'Nuova Ubicazione'}</h3>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span>Nome *</span>
              <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Zona</span>
              <input type="text" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Scaffale</span>
              <input type="text" value={form.scaffale} onChange={(e) => setForm({ ...form, scaffale: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Piano</span>
              <input type="number" value={form.piano} onChange={(e) => setForm({ ...form, piano: e.target.value })} style={inputStyle} />
            </label>
          </div>
          <button type="submit" style={btnStyle('#2e7d32')}>{editing ? 'Salva Modifiche' : 'Crea Ubicazione'}</button>
        </form>
      )}

      {isMobile ? (
        <div>
          {ubicazioni.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Nessuna ubicazione trovata</div>
          ) : ubicazioni.map((u) => (
            <div key={u.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, color: '#1a237e' }}>📍 {u.nome}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEdit(u)} style={btnSmall('#1565c0')}>✏️</button>
                  <button onClick={() => handleDelete(u.id)} style={btnSmall('#c62828')}>🗑️</button>
                </div>
              </div>
              {u.zona && <div style={cardRowStyle}><span style={cardLabelStyle}>Zona</span><span style={cardValueStyle}>{u.zona}</span></div>}
              {u.scaffale && <div style={cardRowStyle}><span style={cardLabelStyle}>Scaffale</span><span style={cardValueStyle}>{u.scaffale}</span></div>}
              {u.piano != null && <div style={cardRowStyle}><span style={cardLabelStyle}>Piano</span><span style={cardValueStyle}>{u.piano}</span></div>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                {['ID', 'Nome', 'Zona', 'Scaffale', 'Piano', 'Azioni'].map(h => (
                  <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ubicazioni.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Nessuna ubicazione trovata</td></tr>
              ) : ubicazioni.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{u.id}</td>
                  <td style={tdStyle}>{u.nome}</td>
                  <td style={tdStyle}>{u.zona || '-'}</td>
                  <td style={tdStyle}>{u.scaffale || '-'}</td>
                  <td style={tdStyle}>{u.piano ?? '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(u)} style={btnSmall('#1565c0')}>✏️</button>
                    <button onClick={() => handleDelete(u.id)} style={btnSmall('#c62828')}>🗑️</button>
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

const thStyle = { textAlign: 'left', padding: '11px 16px', fontWeight: '700', fontSize: '12px', color: '#555770', background: '#f5f7ff', borderBottom: '2px solid #e0e4ef', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 16px', color: '#333', verticalAlign: 'middle' }
const btnStyle = (bg) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', height: '36px', padding: '0 16px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'filter 0.15s' })
const btnSmall = (bg) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: bg, color: 'white', border: 'none', borderRadius: '6px', height: '28px', padding: '0 10px', cursor: 'pointer', fontSize: '13px', marginRight: '4px' })
const inputStyle = { height: '36px', padding: '0 12px', border: '1.5px solid #e0e4ef', borderRadius: '6px', fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s' }
const formStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: '#555' }
const cardStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid #e8eaf6' }
const cardRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.9rem' }
const cardLabelStyle = { color: '#888', fontWeight: 500, marginRight: '8px' }
const cardValueStyle = { color: '#333', fontWeight: 600, textAlign: 'right' }

export default Ubicazioni
