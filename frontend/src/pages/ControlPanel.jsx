import { useState, useEffect } from 'react'
import { controlPanelAPI } from '../api/controlPanel'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFlagKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: checked ? 'var(--color-success)' : 'var(--color-border)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 200ms ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  )
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: 'var(--color-success)',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontWeight: '500',
      fontSize: '14px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      {message}
    </div>
  )
}

// ─── Tab: Feature Flags ───────────────────────────────────────────────────────

function TabFlags() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    controlPanelAPI.getFlagsAdmin()
      .then(res => setFlags(res.data))
      .catch(err => { console.error('Errore caricamento flags admin:', err) })
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(key, enabled) {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f))
    try {
      await controlPanelAPI.updateFlag(key, { enabled })
      setToast('Salvato ✓')
    } catch (err) {
      console.error('Errore aggiornamento flag:', err)
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !enabled } : f))
      setToast('Errore nel salvataggio')
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="gm-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Funzionalità</th>
              <th>Descrizione</th>
              <th style={{ textAlign: 'center' }}>Stato</th>
              <th style={{ textAlign: 'center' }}>Attiva/Disattiva</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(flag => (
              <tr key={flag.key}>
                <td style={{ fontWeight: '500', fontFamily: 'monospace', fontSize: '13px' }}>{flag.key}</td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  {flag.description || formatFlagKey(flag.key)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="gm-badge" style={{
                    backgroundColor: flag.enabled ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                    color: flag.enabled ? 'var(--color-success)' : 'var(--color-danger)',
                  }}>
                    {flag.enabled ? 'Attivo' : 'Disattivo'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Toggle checked={flag.enabled} onChange={(val) => handleToggle(flag.key, val)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Banner ──────────────────────────────────────────────────────────────

const EMPTY_BANNER = { titolo: '', immagine_url: '', link_url: '', ordine: 0, attivo: true, data_inizio: '', data_fine: '', descrizione: '', posizione: 'top' }

function TabBanner() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_BANNER)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchBanners() }, [])

  async function fetchBanners() {
    setLoading(true)
    try {
      const res = await controlPanelAPI.getBanners()
      setBanners(res.data)
    } catch (err) { console.error('Errore caricamento banner:', err) } finally { setLoading(false) }
  }

  function openNew() { setEditId(null); setForm(EMPTY_BANNER); setShowForm(true) }
  function openEdit(b) {
    setEditId(b.id)
    setForm({
      titolo: b.titolo,
      immagine_url: b.immagine_url,
      link_url: b.link_url || '',
      ordine: b.ordine,
      attivo: b.attivo,
      data_inizio: b.data_inizio ? b.data_inizio.slice(0, 16) : '',
      data_fine: b.data_fine ? b.data_fine.slice(0, 16) : '',
      descrizione: b.descrizione || '',
      posizione: b.posizione || 'top',
    })
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        titolo: form.titolo,
        immagine_url: form.immagine_url,
        link_url: form.link_url || null,
        ordine: Number(form.ordine) || 0,
        attivo: form.attivo,
        data_inizio: form.data_inizio ? new Date(form.data_inizio).toISOString() : null,
        data_fine: form.data_fine ? new Date(form.data_fine).toISOString() : null,
        descrizione: form.descrizione || null,
        posizione: form.posizione || 'top',
      }
      if (editId) {
        await controlPanelAPI.updateBanner(editId, payload)
      } else {
        await controlPanelAPI.createBanner(payload)
      }
      setToast('Salvato ✓')
      setShowForm(false)
      fetchBanners()
    } catch (err) { console.error('Errore salvataggio:', err); setToast('Errore nel salvataggio') } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eliminare questo banner?')) return
    try {
      await controlPanelAPI.deleteBanner(id)
      setToast('Banner eliminato')
      fetchBanners()
    } catch (err) { console.error('Errore eliminazione:', err); setToast('Errore eliminazione') }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    boxSizing: 'border-box',
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Gestione Banner</h3>
        <button className="gm-btn gm-btn-primary" onClick={openNew}>+ Nuovo Banner</button>
      </div>

      {showForm && (
        <div className="gm-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', color: 'var(--color-text)' }}>{editId ? 'Modifica Banner' : 'Nuovo Banner'}</h4>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Titolo *
                <input style={inputStyle} required value={form.titolo} onChange={e => setForm(p => ({ ...p, titolo: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                URL Immagine *
                <input style={inputStyle} required value={form.immagine_url} onChange={e => setForm(p => ({ ...p, immagine_url: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                URL Link (CTA)
                <input style={inputStyle} value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Priorità
                <input style={inputStyle} type="number" value={form.ordine} onChange={e => setForm(p => ({ ...p, ordine: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Posizione
                <select style={inputStyle} value={form.posizione} onChange={e => setForm(p => ({ ...p, posizione: e.target.value }))}>
                  <option value="top">In cima (banner orizzontale)</option>
                  <option value="sidebar_left">Colonna sinistra</option>
                  <option value="sidebar_right">Colonna destra</option>
                  <option value="sidebar_both">Entrambe le colonne</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Data inizio
                <input style={inputStyle} type="datetime-local" value={form.data_inizio} onChange={e => setForm(p => ({ ...p, data_inizio: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Data fine
                <input style={inputStyle} type="datetime-local" value={form.data_fine} onChange={e => setForm(p => ({ ...p, data_fine: e.target.value }))} />
              </label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '16px' }}>
              Descrizione
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={form.descrizione} onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              <Toggle checked={form.attivo} onChange={val => setForm(p => ({ ...p, attivo: val }))} />
              Attivo
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="gm-btn gm-btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
              <button type="button" className="gm-btn gm-btn-secondary" onClick={() => setShowForm(false)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="gm-table">
            <thead>
              <tr>
                <th>Titolo</th>
                <th>Immagine</th>
                <th>Link</th>
                <th>Posizione</th>
                <th>Priorità</th>
                <th>Attivo</th>
                <th>Date</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>Nessun banner</td></tr>
              ) : banners.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: '500' }}>{b.titolo}</td>
                  <td>
                    {b.immagine_url && (
                      <img src={b.immagine_url} alt={b.titolo} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} onError={e => { e.target.style.display = 'none' }} />
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.link_url || '—'}
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {{ top: 'In cima', sidebar_left: 'Col. sinistra', sidebar_right: 'Col. destra', sidebar_both: 'Entrambe' }[b.posizione] || b.posizione || 'In cima'}
                  </td>
                  <td>{b.ordine}</td>
                  <td>
                    <span className="gm-badge" style={{
                      backgroundColor: b.attivo ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      color: b.attivo ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {b.attivo ? 'Sì' : 'No'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {b.data_inizio ? new Date(b.data_inizio).toLocaleDateString('it-IT') : '—'} →{' '}
                    {b.data_fine ? new Date(b.data_fine).toLocaleDateString('it-IT') : '∞'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="gm-btn gm-btn-ghost gm-btn-sm" onClick={() => openEdit(b)}>✏️</button>
                      <button className="gm-btn gm-btn-ghost gm-btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(b.id)}>🗑️</button>
                    </div>
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

// ─── Tab: Promozioni ──────────────────────────────────────────────────────────

const EMPTY_PROMO = { nome: '', tipo: 'percentage', valore: '', prodotto_id: '', categoria_id: '', data_inizio: '', data_fine: '', is_active: true }

function TabPromozioni() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_PROMO)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchPromos() }, [])

  async function fetchPromos() {
    setLoading(true)
    try {
      const res = await controlPanelAPI.getPromozioni()
      setPromos(res.data)
    } catch (err) { console.error('Errore caricamento promozioni:', err) } finally { setLoading(false) }
  }

  function openNew() { setEditId(null); setForm(EMPTY_PROMO); setShowForm(true) }
  function openEdit(p) {
    setEditId(p.id)
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      valore: p.valore,
      prodotto_id: p.prodotto_id ?? '',
      categoria_id: p.categoria_id ?? '',
      data_inizio: p.data_inizio ? p.data_inizio.slice(0, 16) : '',
      data_fine: p.data_fine ? p.data_fine.slice(0, 16) : '',
      is_active: p.is_active,
    })
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        valore: parseFloat(form.valore),
        prodotto_id: form.prodotto_id ? parseInt(form.prodotto_id) : null,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        data_inizio: form.data_inizio ? new Date(form.data_inizio).toISOString() : null,
        data_fine: form.data_fine ? new Date(form.data_fine).toISOString() : null,
        is_active: form.is_active,
      }
      if (editId) {
        await controlPanelAPI.updatePromozione(editId, payload)
      } else {
        await controlPanelAPI.createPromozione(payload)
      }
      setToast('Salvato ✓')
      setShowForm(false)
      fetchPromos()
    } catch (err) { console.error('Errore salvataggio:', err); setToast('Errore nel salvataggio') } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eliminare questa promozione?')) return
    try {
      await controlPanelAPI.deletePromozione(id)
      setToast('Promozione eliminata')
      fetchPromos()
    } catch (err) { console.error('Errore eliminazione:', err); setToast('Errore eliminazione') }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    boxSizing: 'border-box',
  }

  // Calcola anteprima prezzo scontato
  const prevAnteprima = form.valore && !isNaN(parseFloat(form.valore))
    ? form.tipo === 'percentage'
      ? `Es: prezzo €100 → €${Math.max(0, 100 * (1 - parseFloat(form.valore) / 100)).toFixed(2)}`
      : `Es: prezzo €100 → €${Math.max(0, 100 - parseFloat(form.valore)).toFixed(2)}`
    : null

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Gestione Promozioni</h3>
        <button className="gm-btn gm-btn-primary" onClick={openNew}>+ Nuova Promozione</button>
      </div>

      {showForm && (
        <div className="gm-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px', color: 'var(--color-text)' }}>{editId ? 'Modifica Promozione' : 'Nuova Promozione'}</h4>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Nome *
                <input style={inputStyle} required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Tipo *
                <select style={inputStyle} value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                  <option value="percentage">Percentuale (%)</option>
                  <option value="fixed">Fisso (€)</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Valore *
                <input style={inputStyle} required type="number" step="0.01" min="0" value={form.valore} onChange={e => setForm(p => ({ ...p, valore: e.target.value }))} />
                {prevAnteprima && <span style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '2px' }}>{prevAnteprima}</span>}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                ID Prodotto (opzionale)
                <input style={inputStyle} type="number" min="1" value={form.prodotto_id} onChange={e => setForm(p => ({ ...p, prodotto_id: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                ID Categoria (opzionale)
                <input style={inputStyle} type="number" min="1" value={form.categoria_id} onChange={e => setForm(p => ({ ...p, categoria_id: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Data inizio
                <input style={inputStyle} type="datetime-local" value={form.data_inizio} onChange={e => setForm(p => ({ ...p, data_inizio: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Data fine
                <input style={inputStyle} type="datetime-local" value={form.data_fine} onChange={e => setForm(p => ({ ...p, data_fine: e.target.value }))} />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              <Toggle checked={form.is_active} onChange={val => setForm(p => ({ ...p, is_active: val }))} />
              Attiva
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="gm-btn gm-btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
              <button type="button" className="gm-btn gm-btn-secondary" onClick={() => setShowForm(false)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="gm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Valore</th>
                <th>Prodotto</th>
                <th>Categoria</th>
                <th>Date</th>
                <th>Attiva</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {promos.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>Nessuna promozione</td></tr>
              ) : promos.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: '500' }}>{p.nome}</td>
                  <td>
                    <span className="gm-badge" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                      {p.tipo === 'percentage' ? 'Percentuale' : 'Fisso'}
                    </span>
                  </td>
                  <td>{p.tipo === 'percentage' ? `${p.valore}%` : `€${p.valore}`}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{p.prodotto_nome || (p.prodotto_id ? `#${p.prodotto_id}` : '—')}</td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{p.categoria_nome || (p.categoria_id ? `#${p.categoria_id}` : '—')}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {p.data_inizio ? new Date(p.data_inizio).toLocaleDateString('it-IT') : '—'} →{' '}
                    {p.data_fine ? new Date(p.data_fine).toLocaleDateString('it-IT') : '∞'}
                  </td>
                  <td>
                    <span className="gm-badge" style={{
                      backgroundColor: p.is_active ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      color: p.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {p.is_active ? 'Sì' : 'No'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="gm-btn gm-btn-ghost gm-btn-sm" onClick={() => openEdit(p)}>✏️</button>
                      <button className="gm-btn gm-btn-ghost gm-btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(p.id)}>🗑️</button>
                    </div>
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

// ─── Tab: Magazzino ───────────────────────────────────────────────────────────

function TabMagazzino() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    controlPanelAPI.getWarehouseSettings()
      .then(res => setSettings(res.data))
      .catch(err => { console.error('Errore caricamento warehouse settings:', err) })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await controlPanelAPI.updateWarehouseSettings(settings)
      setSettings(res.data)
      setToast('Salvato ✓')
    } catch (err) { console.error('Errore salvataggio:', err); setToast('Errore nel salvataggio') } finally { setSaving(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
  if (!settings) return null

  const inputStyle = {
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    width: '120px',
  }

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border-subtle)',
  }

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text)',
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <h3 style={{ marginBottom: '16px', color: 'var(--color-text)' }}>Impostazioni Magazzino</h3>
      <form onSubmit={handleSave}>
        <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Soglia stock minimo (default)</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Quantità sotto cui scatta l'alert di scorta bassa</div>
            </div>
            <input
              style={inputStyle}
              type="number"
              min="0"
              value={settings.low_stock_threshold_default}
              onChange={e => setSettings(p => ({ ...p, low_stock_threshold_default: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Nascondi prodotti a zero</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Nasconde i prodotti con quantità = 0 dalla lista</div>
            </div>
            <Toggle checked={settings.hide_zero_stock_products} onChange={val => setSettings(p => ({ ...p, hide_zero_stock_products: val }))} />
          </div>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Mostra prezzo di acquisto</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Visualizza il costo di acquisto nelle liste prodotti</div>
            </div>
            <Toggle checked={settings.show_purchase_price} onChange={val => setSettings(p => ({ ...p, show_purchase_price: val }))} />
          </div>
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>Mostra margine</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Visualizza il margine di profitto nelle analisi</div>
            </div>
            <Toggle checked={settings.show_margin} onChange={val => setSettings(p => ({ ...p, show_margin: val }))} />
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <div>
              <div style={labelStyle}>Alert automatici</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Invia notifiche automatiche per stock basso</div>
            </div>
            <Toggle checked={settings.enable_auto_alerts} onChange={val => setSettings(p => ({ ...p, enable_auto_alerts: val }))} />
          </div>
        </div>
        <div style={{ marginTop: '20px' }}>
          <button type="submit" className="gm-btn gm-btn-primary" disabled={saving}>
            {saving ? 'Salvataggio...' : '💾 Salva Impostazioni'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Tab: Store ───────────────────────────────────────────────────────────────

function TabStore() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    controlPanelAPI.getStoreSettings()
      .then(res => setSettings(res.data))
      .catch(err => { console.error('Errore caricamento store settings:', err) })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await controlPanelAPI.updateStoreSettings(settings)
      setSettings(res.data)
      setToast('Salvato ✓')
    } catch (err) { console.error('Errore salvataggio:', err); setToast('Errore nel salvataggio') } finally { setSaving(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
  if (!settings) return null

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-border-subtle)',
  }

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text)',
  }

  const inputStyle = {
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
  }

  const sectionStyle = {
    marginBottom: '24px',
  }

  const sectionTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--color-text)',
    marginBottom: '12px',
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <form onSubmit={handleSave}>

        {/* Sezione A — Identità portale */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>🏪 Identità portale</h3>
          <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={rowStyle}>
              <div style={labelStyle}>Nome store</div>
              <input
                style={{ ...inputStyle, width: '220px' }}
                type="text"
                value={settings.store_nome}
                onChange={e => setSettings(p => ({ ...p, store_nome: e.target.value }))}
              />
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <div style={labelStyle}>Logo URL</div>
              <input
                style={{ ...inputStyle, width: '320px' }}
                type="url"
                placeholder="https://..."
                value={settings.store_logo_url || ''}
                onChange={e => setSettings(p => ({ ...p, store_logo_url: e.target.value || null }))}
              />
            </div>
            {settings.store_logo_url && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border-subtle)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Anteprima logo</div>
                <img
                  src={settings.store_logo_url}
                  alt="Logo store"
                  style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain', borderRadius: '4px' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sezione B — Metodi di spedizione */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>📦 Metodi di spedizione</h3>
          <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0', alignItems: 'center' }}>
              {/* Header */}
              <div style={{ padding: '10px 20px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metodo</div>
              <div style={{ padding: '10px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costo (€)</div>
              <div style={{ padding: '10px 16px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tempi</div>
              <div style={{ padding: '10px 20px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abilitato</div>

              {/* Ritiro negozio */}
              <div style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border-subtle)' }}>Ritiro in negozio</div>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                <input style={{ ...inputStyle, width: '80px', textAlign: 'right' }} type="number" min="0" step="0.01" value={settings.spedizione_ritiro_costo} onChange={e => setSettings(p => ({ ...p, spedizione_ritiro_costo: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                <input style={{ ...inputStyle, width: '160px' }} type="text" value={settings.spedizione_ritiro_giorni} onChange={e => setSettings(p => ({ ...p, spedizione_ritiro_giorni: e.target.value }))} />
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={settings.spedizione_ritiro_abilitato} onChange={val => setSettings(p => ({ ...p, spedizione_ritiro_abilitato: val }))} />
              </div>

              {/* Spedizione standard */}
              <div style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border-subtle)' }}>Spedizione standard</div>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                <input style={{ ...inputStyle, width: '80px', textAlign: 'right' }} type="number" min="0" step="0.01" value={settings.spedizione_standard_costo} onChange={e => setSettings(p => ({ ...p, spedizione_standard_costo: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
                <input style={{ ...inputStyle, width: '160px' }} type="text" value={settings.spedizione_standard_giorni} onChange={e => setSettings(p => ({ ...p, spedizione_standard_giorni: e.target.value }))} />
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={settings.spedizione_standard_abilitato} onChange={val => setSettings(p => ({ ...p, spedizione_standard_abilitato: val }))} />
              </div>

              {/* Spedizione express */}
              <div style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>Spedizione express</div>
              <div style={{ padding: '14px 16px', textAlign: 'center' }}>
                <input style={{ ...inputStyle, width: '80px', textAlign: 'right' }} type="number" min="0" step="0.01" value={settings.spedizione_express_costo} onChange={e => setSettings(p => ({ ...p, spedizione_express_costo: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div style={{ padding: '14px 16px', textAlign: 'center' }}>
                <input style={{ ...inputStyle, width: '160px' }} type="text" value={settings.spedizione_express_giorni} onChange={e => setSettings(p => ({ ...p, spedizione_express_giorni: e.target.value }))} />
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={settings.spedizione_express_abilitato} onChange={val => setSettings(p => ({ ...p, spedizione_express_abilitato: val }))} />
              </div>
            </div>
          </div>
        </div>

        {/* Sezione C — Metodi di pagamento */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>💳 Metodi di pagamento</h3>
          <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { label: 'Carta di credito/debito', key: 'pagamento_carta_abilitato' },
              { label: 'PayPal', key: 'pagamento_paypal_abilitato' },
              { label: 'Apple Pay', key: 'pagamento_apple_pay_abilitato' },
              { label: 'Google Pay', key: 'pagamento_google_pay_abilitato' },
              { label: 'Pagamento in negozio', key: 'pagamento_negozio_abilitato' },
            ].map(({ label, key }, i, arr) => (
              <div key={key} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <div style={labelStyle}>{label}</div>
                <Toggle checked={settings[key]} onChange={val => setSettings(p => ({ ...p, [key]: val }))} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button type="submit" className="gm-btn gm-btn-primary" disabled={saving}>
            {saving ? 'Salvataggio...' : '💾 Salva Impostazioni'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main ControlPanel Page ───────────────────────────────────────────────────

const TABS = [
  { key: 'flags', label: '⚡ Funzionalità' },
  { key: 'banner', label: '🖼️ Banner' },
  { key: 'promozioni', label: '🏷️ Promozioni' },
  { key: 'magazzino', label: '🏭 Magazzino' },
  { key: 'store', label: '🏪 Store' },
]

export default function ControlPanel() {
  const [activeTab, setActiveTab] = useState('flags')

  return (
    <div style={{ maxWidth: '1200px' }}>
      <h1 style={{ margin: '0 0 24px', color: 'var(--color-text)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: '700' }}>
        ⚙️ Control Panel
      </h1>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '28px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        padding: '4px',
        flexWrap: 'wrap',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '600' : '400',
              fontSize: '14px',
              backgroundColor: activeTab === tab.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
              transition: 'all 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'flags' && <TabFlags />}
      {activeTab === 'banner' && <TabBanner />}
      {activeTab === 'promozioni' && <TabPromozioni />}
      {activeTab === 'magazzino' && <TabMagazzino />}
      {activeTab === 'store' && <TabStore />}
    </div>
  )
}
