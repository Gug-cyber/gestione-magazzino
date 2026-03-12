import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, ubicazioniAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'

const emptyForm = {
  nome: '', descrizione: '', sku: '', quantita: 0,
  quantita_minima: 0, prezzo_acquisto: '', prezzo_vendita: '',
  categoria_id: '', ubicazione_id: '', stato_conservazione: '', lingua: '',
}

const statoColors = {
  'Mint':         { bg: '#e8f5e9', text: '#2e7d32' },
  'Near Mint':    { bg: '#f1f8e9', text: '#558b2f' },
  'Excellent':    { bg: '#e3f2fd', text: '#1565c0' },
  'Good':         { bg: '#fff8e1', text: '#f57f17' },
  'Light Played': { bg: '#fff3e0', text: '#e65100' },
  'Played':       { bg: '#fce4ec', text: '#c62828' },
  'Poor':         { bg: '#ffebee', text: '#b71c1c' },
}

function StatoBadge({ value }) {
  if (!value) return <span>—</span>
  const colors = statoColors[value] || { bg: '#f5f5f5', text: '#555' }
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.8rem',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

function Prodotti() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [prodotti, setProdotti] = useState([])
  const [categorie, setCategorie] = useState([])
  const [ubicazioni, setUbicazioni] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [uploadingFotoId, setUploadingFotoId] = useState(null)
  const fotoInputRef = useRef(null)
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const fetchAll = async () => {
    try {
      const [p, c, u] = await Promise.all([
        prodottiAPI.getAll({ limit: 1000 }),
        categorieAPI.getAll(),
        ubicazioniAPI.getAll(),
      ])
      setProdotti(p.data)
      setCategorie(c.data)
      setUbicazioni(u.data)
    } catch (err) {
      setError('Errore nel caricamento dei dati')
    }
  }

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (uploadingFotoId !== null && fotoInputRef.current) {
      fotoInputRef.current.click()
    }
  }, [uploadingFotoId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
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
      if (editing) {
        await prodottiAPI.update(editing, payload)
      } else {
        await prodottiAPI.create(payload)
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleEdit = (p) => {
    setForm({
      nome: p.nome, descrizione: p.descrizione || '', sku: p.sku,
      quantita: p.quantita, quantita_minima: p.quantita_minima,
      prezzo_acquisto: p.prezzo_acquisto || '', prezzo_vendita: p.prezzo_vendita || '',
      categoria_id: p.categoria_id || '', ubicazione_id: p.ubicazione_id || '',
      stato_conservazione: p.stato_conservazione || '',
      lingua: p.lingua || '',
    })
    setEditing(p.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo prodotto?')) return
    try {
      await prodottiAPI.delete(id)
      fetchAll()
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'eliminazione')
    }
  }

  const prodottiFiltrati = prodotti.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (p.nome || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.descrizione || '').toLowerCase().includes(q) ||
      (p.stato_conservazione || '').toLowerCase().includes(q) ||
      (p.lingua || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: '#1a237e', margin: 0 }}>📦 Prodotti</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cerca per nome, SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px',
                height: '36px',
                boxSizing: 'border-box',
                border: '1.5px solid #c5cae9',
                borderRadius: '6px',
                fontSize: '0.95rem',
                width: 'clamp(160px, 30vw, 280px)',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#888', padding: '0 2px' }} title="Cancella ricerca">✕</button>
            )}
            {search && (
              <span style={{ fontSize: '0.82rem', color: '#666', whiteSpace: 'nowrap' }}>
                {prodottiFiltrati.length} / {prodotti.length}
              </span>
            )}
            <button
              onClick={() => setShowScanner(true)}
              style={{ padding: '7px 12px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1.1rem' }}
              title="Cerca con codice a barre"
            >📷</button>
          </div>
          <button onClick={() => navigate('/prodotti/nuovo')}
            style={btnStyle('#1a237e')}>+ Aggiungi Prodotto</button>
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fotoInputRef}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files[0]
          if (!file || !uploadingFotoId) return
          try {
            await prodottiAPI.uploadFoto(uploadingFotoId, file)
            fetchAll()
          } catch (err) {
            setError('Errore nel caricamento della foto')
          } finally {
            setUploadingFotoId(null)
            e.target.value = ''
          }
        }}
      />

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>{editing ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h3>
          <div style={gridStyle}>{[
            { key: 'nome', label: 'Nome *', required: true },
            { key: 'sku', label: 'SKU *', required: true },
            { key: 'descrizione', label: 'Descrizione' },
            { key: 'quantita', label: 'Quantità', type: 'number' },
            { key: 'quantita_minima', label: 'Quantità Minima', type: 'number' },
            { key: 'prezzo_acquisto', label: 'Prezzo Acquisto (€)', type: 'number', step: '0.01' },
            { key: 'prezzo_vendita', label: 'Prezzo Vendita (€)', type: 'number', step: '0.01' },
          ].map(({ key, label, type = 'text', required, step }) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>{label}</span>
              <input
                type={type}
                step={step}
                required={required}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={inputStyle}
              />
            </label>
          ))}

          {/* Stato di Conservazione */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Stato di Conservazione</span>
            <select
              value={form.stato_conservazione}
              onChange={(e) => setForm({ ...form, stato_conservazione: e.target.value })}
              style={inputStyle}>
              <option value="">-- Nessuno --</option>
              <option value="Mint">Mint</option>
              <option value="Near Mint">Near Mint</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Light Played">Light Played</option>
              <option value="Played">Played</option>
              <option value="Poor">Poor</option>
            </select>
          </label>

          {/* Lingua */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Lingua</span>
            <select
              value={form.lingua}
              onChange={(e) => setForm({ ...form, lingua: e.target.value })}
              style={inputStyle}>
              <option value="">-- Nessuna --</option>
              <option value="Italiano">Italiano</option>
              <option value="Inglese">Inglese</option>
              <option value="Giapponese">Giapponese</option>
              <option value="Cinese">Cinese</option>
              <option value="Coreano">Coreano</option>
            </select>
          </label>

          {/* Categoria */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Categoria</span>
            <select
              value={form.categoria_id}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              style={inputStyle}>
              <option value="">-- Nessuna --</option>
              {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>

          {/* Ubicazione */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.85rem', color: '#555' }}>Ubicazione</span>
            <select
              value={form.ubicazione_id}
              onChange={(e) => setForm({ ...form, ubicazione_id: e.target.value })}
              style={inputStyle}>
              <option value="">-- Nessuna --</option>
              {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </label>
        </div>
          <button type="submit" style={btnStyle('#2e7d32')}> 
            {editing ? 'Salva Modifiche' : 'Crea Prodotto'}
          </button>
        </form>
      )}


      {isMobile ? (
        <div>
          {prodottiFiltrati.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
              {search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
            </div>
          ) : prodottiFiltrati.map((p) => (
            <div key={p.id} style={{ ...cardStyle, backgroundColor: p.quantita < p.quantita_minima ? '#fff8e1' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {p.foto_url
                    ? <img src={p.foto_url} alt={p.nome} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} onClick={() => setUploadingFotoId(p.id)} />
                    : <span style={{ fontSize: '2rem', cursor: 'pointer' }} onClick={() => setUploadingFotoId(p.id)}>📷</span>
                  }
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a237e' }}>{p.nome}</div>
                    <code style={{ fontSize: '0.8rem', color: '#666' }}>{p.sku}</code>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEdit(p)} style={btnSmall('#1565c0')}>✏️</button>
                  <button onClick={() => handleDelete(p.id)} style={btnSmall('#c62828')}>🗑️</button>
                  <button onClick={() => setUploadingFotoId(p.id)} style={btnSmall('#7b1fa2')} title="Carica foto">🖼️</button>
                </div>
              </div>
              <div style={cardRowStyle}>
                <span style={cardLabelStyle}>Quantità</span>
                <span style={{ ...cardValueStyle, color: p.quantita < p.quantita_minima ? '#c62828' : '#2e7d32' }}>{p.quantita} {p.quantita < p.quantita_minima ? '⚠️' : ''}</span>
              </div>
              {p.prezzo_vendita && <div style={cardRowStyle}><span style={cardLabelStyle}>Prezzo</span><span style={cardValueStyle}>€{p.prezzo_vendita}</span></div>}
              {p.stato_conservazione && <div style={cardRowStyle}><span style={cardLabelStyle}>Stato</span><StatoBadge value={p.stato_conservazione} /></div>}
              {p.lingua && <div style={cardRowStyle}><span style={cardLabelStyle}>Lingua</span><span style={cardValueStyle}>{p.lingua}</span></div>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a237e', color: 'white' }}>
                {['ID', 'Foto', 'Nome', 'SKU', 'Quantità', 'Q.Min', 'P.Acquisto', 'P.Vendita', 'Conservazione', 'Lingua', 'Azioni'].map(h => (
                  <th key={h} style={{ ...thStyle, color: 'white' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodottiFiltrati.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                    {search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
                  </td>
                </tr>
              ) : prodottiFiltrati.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee', backgroundColor: p.quantita < p.quantita_minima ? '#fff8e1' : 'white' }}>
                  <td style={tdStyle}>{p.id}</td>
                  <td style={tdStyle}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nome}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setUploadingFotoId(p.id)}
                        />
                      : <span
                          style={{ fontSize: '1.4rem', cursor: 'pointer' }}
                          onClick={() => setUploadingFotoId(p.id)}
                          title="Carica foto"
                        >📷</span>
                    }
                  </td>
                  <td style={tdStyle}>{p.nome}</td>
                  <td style={tdStyle}><code>{p.sku}</code></td>
                  <td style={{ ...tdStyle, color: p.quantita < p.quantita_minima ? '#c62828' : '#2e7d32', fontWeight: 'bold' }}>{p.quantita}</td>
                  <td style={tdStyle}>{p.quantita_minima}</td>
                  <td style={tdStyle}>{p.prezzo_acquisto ? `€${p.prezzo_acquisto}` : '-'}</td>
                  <td style={tdStyle}>{p.prezzo_vendita ? `€${p.prezzo_vendita}` : '-'}</td>
                  <td style={tdStyle}><StatoBadge value={p.stato_conservazione} /></td>
                  <td style={tdStyle}>{p.lingua || '—'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(p)} style={btnSmall('#1565c0')}>✏️</button>
                    <button onClick={() => handleDelete(p.id)} style={btnSmall('#c62828')}>🗑️</button>
                    <button onClick={() => setUploadingFotoId(p.id)} style={btnSmall('#7b1fa2')} title="Carica foto">🖼️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {showScanner && (
        <BarcodeScanner
          onScan={(value) => { setSearch(value); setShowScanner(false) }}
          onClose={() => setShowScanner(false)}
        />
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
const cardStyle = { backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid #e8eaf6' }
const cardRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.9rem' }
const cardLabelStyle = { color: '#888', fontWeight: 500, marginRight: '8px' }
const cardValueStyle = { color: '#333', fontWeight: 600, textAlign: 'right' }

export default Prodotti