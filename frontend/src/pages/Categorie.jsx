import { useState, useEffect, useCallback } from 'react'
import { categorieAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
}

const emptyForm = {
  nome: '',
  slug: '',
  descrizione: '',
  parent_id: '',
  sort_order: 0,
  is_active: true,
  show_in_store: true,
  show_in_warehouse: true,
  metadata: '',
}

const levelColors = ['var(--primary)', '#10b981', '#f59e0b']
const levelLabels = ['Categoria', 'Sottocategoria', 'Tipo']

function CategoriaNode({ categoria, livello, onEdit, onDelete, onAddChild, onReorder }) {
  const [expanded, setExpanded] = useState(true)
  const [editingOrder, setEditingOrder] = useState(false)
  const [orderValue, setOrderValue] = useState(categoria.sort_order ?? 0)
  const hasChildren = categoria.figli && categoria.figli.length > 0
  const indent = livello * 24
  const levelColor = levelColors[Math.min(livello, 2)]

  const handleOrderSave = async () => {
    await onReorder(categoria.id, { new_parent_id: categoria.parent_id ?? null, new_sort_order: parseInt(orderValue) || 0 })
    setEditingOrder(false)
  }

  return (
    <div>
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
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            title={expanded ? 'Comprimi' : 'Espandi'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 18, flexShrink: 0 }} />
        )}

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={levelColor} strokeWidth="2" style={{ flexShrink: 0 }}>
          {livello === 0
            ? <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>
            : livello === 1
            ? <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            : <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>
          }
        </svg>

        <span style={{ flex: 1, fontWeight: livello === 0 ? 600 : 400, fontSize: livello === 0 ? '0.95rem' : '0.9rem', opacity: categoria.is_active ? 1 : 0.5 }}>
          {categoria.nome}
          {categoria.slug && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>/{categoria.slug}</span>}
        </span>

        {/* Badges */}
        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '9999px', background: `${levelColor}22`, color: levelColor, flexShrink: 0 }}>
          {levelLabels[Math.min(livello, 2)]}
        </span>
        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '9999px', background: '#f3f4f6', color: '#6b7280', flexShrink: 0 }} title="Visibilità">
          {categoria.show_in_store && categoria.show_in_warehouse ? '🏪📦' : categoria.show_in_store ? '🏪' : categoria.show_in_warehouse ? '📦' : '—'}
        </span>
        {!categoria.is_active && (
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '9999px', background: '#fee2e2', color: '#ef4444', flexShrink: 0 }}>
            Disattiva
          </span>
        )}

        {/* Sort order inline */}
        {editingOrder ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <input
              type="number"
              value={orderValue}
              onChange={e => setOrderValue(e.target.value)}
              style={{ width: 48, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.8rem' }}
            />
            <button onClick={handleOrderSave} className="btn-icon-blue" style={{ padding: '3px 6px', fontSize: '0.7rem' }}>✓</button>
            <button onClick={() => setEditingOrder(false)} className="btn-icon-red" style={{ padding: '3px 6px', fontSize: '0.7rem' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setEditingOrder(true)} title="Riordina" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: '2px 4px', fontSize: '0.75rem' }}>
            🔃
          </button>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {livello < 5 && (
            <button onClick={() => onAddChild(categoria)} className="btn-icon-blue" title="Aggiungi sottocategoria" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
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

      {hasChildren && expanded && categoria.figli.map(figlio => (
        <CategoriaNode
          key={figlio.id}
          categoria={figlio}
          livello={livello + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onReorder={onReorder}
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
  const [excludedIds, setExcludedIds] = useState([])
  const [filterOnlyActive, setFilterOnlyActive] = useState(false)
  const [filterStore, setFilterStore] = useState(false)
  const [filterWarehouse, setFilterWarehouse] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const params = {}
      if (filterOnlyActive) params.only_active = true
      if (filterStore) params.show_in_store = true
      if (filterWarehouse) params.show_in_warehouse = true

      const [treeRes, allRes] = await Promise.all([
        categorieAPI.getTree(params),
        categorieAPI.getAll(),
      ])
      setTree(treeRes.data)
      setAllCategorie(allRes.data)
    } catch {
      setError('Errore nel caricamento')
    }
  }, [filterOnlyActive, filterStore, filterWarehouse])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleNomeChange = (nome) => {
    const next = { ...form, nome }
    if (!slugManual) {
      next.slug = slugify(nome)
    }
    setForm(next)
  }

  const handleSlugChange = (slug) => {
    setSlugManual(true)
    setForm({ ...form, slug })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    let metadata = {}
    if (form.metadata) {
      try {
        metadata = JSON.parse(form.metadata)
      } catch {
        setError('Metadata non è un JSON valido')
        return
      }
    }

    const payload = {
      nome: form.nome,
      slug: form.slug || undefined,
      descrizione: form.descrizione || null,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
      show_in_store: form.show_in_store,
      show_in_warehouse: form.show_in_warehouse,
      metadata,
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
      setSlugManual(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = async (c) => {
    setForm({
      nome: c.nome,
      slug: c.slug || '',
      descrizione: c.descrizione || '',
      parent_id: c.parent_id ? String(c.parent_id) : '',
      sort_order: c.sort_order ?? 0,
      is_active: c.is_active ?? true,
      show_in_store: c.show_in_store ?? true,
      show_in_warehouse: c.show_in_warehouse ?? true,
      metadata: c.metadata && Object.keys(c.metadata).length > 0 ? JSON.stringify(c.metadata, null, 2) : '',
    })
    setEditing(c.id)
    setShowForm(true)
    setSlugManual(true)

    // Carica discendenti per escluderli dal selettore parent
    try {
      const res = await categorieAPI.getDescendants(c.id)
      setExcludedIds([c.id, ...(res.data || [])])
    } catch {
      setExcludedIds([c.id])
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAddChild = (parent) => {
    setForm({ ...emptyForm, parent_id: String(parent.id) })
    setEditing(null)
    setExcludedIds([])
    setShowForm(true)
    setSlugManual(false)
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

  const handleReorder = async (id, data) => {
    try {
      await categorieAPI.reorder(id, data)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel riordinamento')
    }
  }

  const handleValidate = async () => {
    try {
      const res = await categorieAPI.validate()
      const errors = res.data
      if (errors.length === 0) {
        alert('✅ Albero valido — nessun errore trovato!')
      } else {
        alert('⚠️ Errori trovati:\n\n' + errors.join('\n'))
      }
    } catch {
      setError('Errore nella validazione')
    }
  }

  const parentOptions = allCategorie.filter(c => !excludedIds.includes(c.id))

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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleValidate} className="btn btn-secondary" title="Valida integrità albero">
            🔍 Valida Albero
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); setExcludedIds([]); setSlugManual(false) }}
            className={showForm ? 'btn btn-secondary' : 'btn btn-primary'}
          >
            {showForm ? 'Annulla' : '+ Aggiungi Categoria Radice'}
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filtri:</span>
        {[
          { key: 'onlyActive', label: 'Solo attive', state: filterOnlyActive, set: setFilterOnlyActive },
          { key: 'store', label: '🏪 Solo store', state: filterStore, set: setFilterStore },
          { key: 'warehouse', label: '📦 Solo magazzino', state: filterWarehouse, set: setFilterWarehouse },
        ].map(({ key, label, state, set }) => (
          <button
            key={key}
            onClick={() => set(v => !v)}
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              border: `1px solid ${state ? 'var(--primary)' : 'var(--border)'}`,
              background: state ? 'var(--primary)' : 'transparent',
              color: state ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card mb-6">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {editing ? 'Modifica Categoria' : form.parent_id ? 'Aggiungi sottocategoria' : 'Nuova Categoria Radice'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Nome *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={e => handleNomeChange(e.target.value)}
                placeholder="Es. Carte Collezionabili"
                required
              />
            </div>
            <div>
              <label className="form-label">Slug</label>
              <input
                className="form-input"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="auto-generato dal nome"
              />
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
                    {'  '.repeat(c.level || 0)}{c.nome} (ID: {c.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Ordinamento (sort_order)</label>
              <input
                type="number"
                className="form-input"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: e.target.value })}
                min={0}
              />
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', paddingTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                Attiva
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.show_in_store} onChange={e => setForm({ ...form, show_in_store: e.target.checked })} />
                🏪 Store
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.show_in_warehouse} onChange={e => setForm({ ...form, show_in_warehouse: e.target.checked })} />
                📦 Magazzino
              </label>
            </div>
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label className="form-label">Metadata (JSON opzionale)</label>
              <textarea
                className="form-input"
                value={form.metadata}
                onChange={e => setForm({ ...form, metadata: e.target.value })}
                placeholder='{"brand": "pokemon", "icona": "⚡"}'
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">{editing ? 'Salva modifiche' : 'Crea categoria'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); setSlugManual(false) }}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {/* Albero categorie */}
      <div className="table-container" style={{ overflow: 'hidden' }}>
        {tree.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nessuna categoria. Clicca &quot;+ Aggiungi Categoria Radice&quot; per iniziare.
          </div>
        ) : (
          <div>
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
              <span style={{ flexShrink: 0 }}>VIS.</span>
              <span style={{ flexShrink: 0 }}>ORD.</span>
              <span style={{ width: '160px', flexShrink: 0, textAlign: 'right' }}>AZIONI</span>
            </div>
            {tree.map(cat => (
              <CategoriaNode
                key={cat.id}
                categoria={cat}
                livello={0}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                onReorder={handleReorder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--primary)', label: 'Categoria (livello 0)' },
          { color: '#10b981', label: 'Sottocategoria (livello 1)' },
          { color: '#f59e0b', label: 'Tipo (livello 2+)' },
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
