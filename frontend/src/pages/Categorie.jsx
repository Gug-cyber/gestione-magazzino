import { useState, useEffect } from 'react'
import { categorieAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

const emptyForm = { nome: '', descrizione: '', parent_id: '' }

// Componente ricorsivo per un singolo nodo dell'albero
function CategoriaNode({ categoria, livello, onEdit, onDelete, onAddChild }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = categoria.figli && categoria.figli.length > 0
  const indent = livello * 24

  const levelColors = ['var(--primary)', '#10b981', '#f59e0b']
  const levelColor = levelColors[Math.min(livello, 2)]

  return (
    <div>
      {/* Riga categoria */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          gap: '8px',
          paddingLeft: `${16 + indent}px`,
        }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            title={expanded ? 'Comprimi' : 'Espandi'}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 18, flexShrink: 0 }} />
        )}

        {/* Icona livello */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={levelColor} strokeWidth="2" style={{ flexShrink: 0 }}>
          {livello === 0
            ? <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>
            : livello === 1
            ? <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            : <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>
          }
        </svg>

        {/* Nome */}
        <span style={{ flex: 1, fontWeight: livello === 0 ? 600 : 400, fontSize: livello === 0 ? '0.95rem' : '0.9rem' }}>
          {categoria.nome}
        </span>

        {/* Badge livello */}
        <span style={{
          fontSize: '0.7rem',
          padding: '2px 8px',
          borderRadius: '9999px',
          background: `${levelColor}22`,
          color: levelColor,
          flexShrink: 0,
        }}>
          {livello === 0 ? 'Categoria' : livello === 1 ? 'Sottocategoria' : 'Tipo'}
        </span>

        {/* Azioni */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {livello < 2 && (
            <button
              onClick={() => onAddChild(categoria)}
              className="btn-icon-blue"
              title="Aggiungi sottocategoria"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              + Sub
            </button>
          )}
          <button onClick={() => onEdit(categoria)} className="btn-icon-blue" title="Modifica">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(categoria.id)} className="btn-icon-red" title="Elimina">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Figli ricorsivi */}
      {hasChildren && expanded && categoria.figli.map(figlio => (
        <CategoriaNode
          key={figlio.id}
          categoria={figlio}
          livello={livello + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  )
}

function Categorie() {
  const isMobile = useIsMobile()
  const [tree, setTree] = useState([])
  const [allCategorie, setAllCategorie] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    try {
      const [treeRes, allRes] = await Promise.all([
        categorieAPI.getTree(),
        categorieAPI.getAll(),
      ])
      setTree(treeRes.data)
      setAllCategorie(allRes.data)
    } catch {
      setError('Errore nel caricamento')
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      nome: form.nome,
      descrizione: form.descrizione || null,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null,
    }
    try {
      if (editing) {
        await categorieAPI.update(editing, payload)
      } else {
        await categorieAPI.create(payload)
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
    setForm({ nome: c.nome, descrizione: c.descrizione || '', parent_id: c.parent_id ? String(c.parent_id) : '' })
    setEditing(c.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAddChild = (parent) => {
    setForm({ nome: '', descrizione: '', parent_id: String(parent.id) })
    setEditing(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa categoria e tutte le sue sottocategorie?')) return
    try {
      await categorieAPI.delete(id)
      fetchAll()
    } catch {
      setError("Errore nell'eliminazione")
    }
  }

  const parentOptions = allCategorie.filter(c => !editing || c.id !== editing)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          Categorie
        </h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }}
          className={showForm ? 'btn btn-secondary' : 'btn btn-primary'}
        >
          {showForm ? 'Annulla' : '+ Aggiungi Categoria'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card mb-6">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {editing ? 'Modifica Categoria' : form.parent_id ? 'Aggiungi sottocategoria' : 'Nuova Categoria Radice'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Nome *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Es. Carte Collezionabili"
                required
              />
            </div>
            <div>
              <label className="form-label">Categoria padre</label>
              <select
                className="form-input"
                value={form.parent_id}
                onChange={e => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">-- Nessuna (categoria radice) --</option>
                {parentOptions.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} (ID: {c.id})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Lascia vuoto per creare una categoria di primo livello
              </p>
            </div>
            <div>
              <label className="form-label">Descrizione</label>
              <input
                className="form-input"
                value={form.descrizione}
                onChange={e => setForm({ ...form, descrizione: e.target.value })}
                placeholder="Descrizione opzionale"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">{editing ? 'Salva modifiche' : 'Crea categoria'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm) }}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {/* Albero categorie */}
      <div className="table-container" style={{ overflow: 'hidden' }}>
        {tree.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nessuna categoria. Clicca &quot;+ Aggiungi Categoria&quot; per iniziare.
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{
              display: 'flex',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              gap: '8px',
            }}>
              <span style={{ flex: 1 }}>STRUTTURA</span>
              <span style={{ flexShrink: 0 }}>LIVELLO</span>
              <span style={{ width: '140px', flexShrink: 0, textAlign: 'right' }}>AZIONI</span>
            </div>
            {/* Nodi radice */}
            {tree.map(cat => (
              <CategoriaNode
                key={cat.id}
                categoria={cat}
                livello={0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--primary)', label: 'Categoria (livello 1)' },
          { color: '#10b981', label: 'Sottocategoria (livello 2)' },
          { color: '#f59e0b', label: 'Tipo (livello 3)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Categorie
