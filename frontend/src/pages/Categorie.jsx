import { useState, useEffect } from 'react'
import { categorieAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

const emptyForm = { nome: '' }

function Categorie() {
  const isMobile = useIsMobile()
  const [categorie, setCategorie] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const res = await categorieAPI.getAll()
      setCategorie(res.data)
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
        await categorieAPI.update(editing, form)
      } else {
        await categorieAPI.create(form)
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = (c) => {
    setForm({ nome: c.nome })
    setEditing(c.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa categoria?')) return
    try {
      await categorieAPI.delete(id)
      fetchAll()
    } catch {
      setError('Errore nell\'eliminazione')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#1a237e' }}>🏷️ Categorie</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }} style={btnStyle('#1a237e')}>
          {showForm ? 'Annulla' : '+ Aggiungi Categoria'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>{editing ? 'Modifica Categoria' : 'Nuova Categoria'}</h3>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <span>Nome *</span>
              <input type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
            </label>
          </div>
          <button type="submit" style={btnStyle('#2e7d32')}>{editing ? 'Salva Modifiche' : 'Crea Categoria'}</button>
        </form>
      )}

      {isMobile ? (
        <div>
          {categorie.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Nessuna categoria trovata</div>
          ) : categorie.map((c) => (
            <div key={c.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: '#1a237e' }}>🏷️ {c.nome}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEdit(c)} style={btnSmall('#1565c0')}>✏️</button>
                  <button onClick={() => handleDelete(c.id)} style={btnSmall('#c62828')}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                {['ID', 'Nome', 'Azioni'].map(h => (
                  <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categorie.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>Nessuna categoria trovata</td></tr>
              ) : categorie.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{c.id}</td>
                  <td style={tdStyle}>{c.nome}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(c)} style={btnSmall('#1565c0')}>✏️</button>
                    <button onClick={() => handleDelete(c.id)} style={btnSmall('#c62828')}>🗑️</button>
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

export default Categorie
