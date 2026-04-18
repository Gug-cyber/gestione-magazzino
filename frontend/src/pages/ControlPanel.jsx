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

  const channelFlags = flags.filter(f => f.key.startsWith('analytics_channel_'))
  const otherFlags = flags.filter(f => !f.key.startsWith('analytics_channel_'))

  const channelLabel = (key) => {
    const map = {
      analytics_channel_instagram: 'Instagram',
      analytics_channel_facebook: 'Facebook',
      analytics_channel_tiktok: 'TikTok',
      analytics_channel_twitch: 'Twitch',
      analytics_channel_youtube: 'YouTube',
      analytics_channel_google: 'Google',
      analytics_channel_bing: 'Bing',
      analytics_channel_yahoo: 'Yahoo',
      analytics_channel_ebay: 'eBay',
      analytics_channel_direct: 'Traffico diretto',
      analytics_channel_other: 'Altri canali',
    }
    return map[key] || key
  }

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="gm-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
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
            {otherFlags.map(flag => (
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

      {channelFlags.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Canali Analytics
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Abilita o disabilita i canali che appaiono nelle Report &amp; Statistiche.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {channelFlags.map(flag => (
              <div key={flag.key} className="gm-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text)' }}>{channelLabel(flag.key)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    <span className="gm-badge" style={{
                      backgroundColor: flag.enabled ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      color: flag.enabled ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {flag.enabled ? 'Attivo' : 'Disattivo'}
                    </span>
                  </div>
                </div>
                <Toggle checked={flag.enabled} onChange={(val) => handleToggle(flag.key, val)} />
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [uploadingImage, setUploadingImage] = useState(false)

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
    if (!form.titolo || !form.titolo.trim()) {
      setToast('Il titolo è obbligatorio')
      return
    }
    setSaving(true)
    try {
      const payload = {
        titolo: form.titolo.trim(),
        immagine_url: form.immagine_url.trim(),
        link_url: form.link_url?.trim() || null,
        ordine: Number(form.ordine) || 0,
        attivo: form.attivo,
        data_inizio: form.data_inizio ? new Date(form.data_inizio).toISOString() : null,
        data_fine: form.data_fine ? new Date(form.data_fine).toISOString() : null,
        descrizione: form.descrizione?.trim() || null,
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
    } catch (err) {
      console.error('Errore salvataggio banner:', err)
      const detail = err?.response?.data?.detail
      setToast(typeof detail === 'string' ? detail : 'Errore nel salvataggio')
    } finally { setSaving(false) }
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Immagine Banner
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingImage(true)
                        try {
                          const res = await controlPanelAPI.uploadBannerImage(file)
                          setForm(p => ({ ...p, immagine_url: res.data.immagine_url }))
                          setToast('Immagine caricata ✓')
                        } catch {
                          setToast('Errore upload immagine')
                        } finally {
                          setUploadingImage(false)
                        }
                      }}
                    />
                    <span className="gm-btn gm-btn-secondary gm-btn-sm">
                      {uploadingImage ? 'Caricamento...' : '📁 Carica immagine'}
                    </span>
                  </label>
                  {form.immagine_url && (
                    <img src={form.immagine_url} alt="Preview" style={{ height: '40px', maxWidth: '120px', objectFit: 'cover', borderRadius: '4px' }} onError={e => { e.target.style.display = 'none' }} />
                  )}
                </div>
                <input
                  style={{ ...inputStyle, marginTop: '4px' }}
                  type="text"
                  placeholder="Oppure inserisci URL immagine..."
                  value={form.immagine_url}
                  onChange={e => setForm(p => ({ ...p, immagine_url: e.target.value }))}
                />
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                URL Link (CTA)
                <input style={inputStyle} value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Priorità
                <input style={inputStyle} type="number" value={form.ordine} onChange={e => setForm(p => ({ ...p, ordine: e.target.value }))} />
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
              <div style={labelStyle}>Logo store</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const res = await controlPanelAPI.uploadStoreLogo(file)
                        setSettings(p => ({ ...p, store_logo_url: res.data.store_logo_url }))
                        setToast('Logo caricato ✓')
                      } catch {
                        setToast('Errore upload logo')
                      }
                    }}
                  />
                  <span className="gm-btn gm-btn-secondary gm-btn-sm">📁 Carica logo</span>
                </label>
                {settings.store_logo_url && (
                  <img src={settings.store_logo_url} alt="Logo" style={{ height: '36px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px' }} onError={e => { e.target.style.display = 'none' }} />
                )}
              </div>
            </div>
            <div style={{ ...rowStyle, borderTop: '1px solid var(--color-border-subtle)', borderBottom: 'none' }}>
              <div style={labelStyle}>Sfondo store</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const res = await controlPanelAPI.uploadStoreSfondo(file)
                        setSettings(p => ({ ...p, store_sfondo_url: res.data.store_sfondo_url }))
                        setToast('Sfondo caricato ✓')
                      } catch {
                        setToast('Errore upload sfondo')
                      }
                    }}
                  />
                  <span className="gm-btn gm-btn-secondary gm-btn-sm">📁 Carica sfondo</span>
                </label>
                {settings.store_sfondo_url && (
                  <img src={settings.store_sfondo_url} alt="Sfondo" style={{ height: '36px', maxWidth: '120px', objectFit: 'cover', borderRadius: '4px' }} onError={e => { e.target.style.display = 'none' }} />
                )}
              </div>
            </div>
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

        {/* Sezione D — Tipografia Footer */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>🔤 Stile Footer</h3>
          <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Font</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Famiglia di caratteri del footer</div>
              </div>
              <select
                style={{ ...inputStyle, width: '220px' }}
                value={settings.footer_font_family || 'Inter, sans-serif'}
                onChange={e => setSettings(p => ({ ...p, footer_font_family: e.target.value }))}
              >
                <option value="Inter, sans-serif">Inter (default)</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Playfair Display', serif">Playfair Display</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Arial, sans-serif">Arial</option>
              </select>
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Dimensione testo — {settings.footer_font_size || 14}px</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Grandezza del testo nel footer</div>
              </div>
              <input
                style={{ width: '160px' }}
                type="range"
                min="12"
                max="20"
                step="1"
                value={settings.footer_font_size || 14}
                onChange={e => setSettings(p => ({ ...p, footer_font_size: parseInt(e.target.value) }))}
              />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Colore testo</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Colore del testo nel footer</div>
              </div>
              <input
                type="color"
                value={settings.footer_text_color || '#a0aec0'}
                onChange={e => setSettings(p => ({ ...p, footer_text_color: e.target.value }))}
                style={{ width: '48px', height: '36px', padding: '2px', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <div>
                <div style={labelStyle}>Colore sfondo footer</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Colore di sfondo del footer</div>
              </div>
              <input
                type="color"
                value={settings.footer_bg_color || '#1a202c'}
                onChange={e => setSettings(p => ({ ...p, footer_bg_color: e.target.value }))}
                style={{ width: '48px', height: '36px', padding: '2px', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
            </div>
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

// ─── Tab: Link UTM ───────────────────────────────────────────────────────────

function buildUtmLink(targetUrl, { source, medium, campaign, content }) {
  try {
    const url = new URL(targetUrl)
    if (source) url.searchParams.set('utm_source', source)
    if (medium) url.searchParams.set('utm_medium', medium)
    if (campaign) url.searchParams.set('utm_campaign', campaign)
    if (content) url.searchParams.set('utm_content', content)
    return url.toString()
  } catch (_) {
    return ''
  }
}

function TabUtm() {
  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/store` : ''
  const [destinationUrl, setDestinationUrl] = useState(storeUrl)
  const [sourcePreset, setSourcePreset] = useState('instagram')
  const [customSource, setCustomSource] = useState('')
  const [medium, setMedium] = useState('social')
  const [campaign, setCampaign] = useState('')
  const [content, setContent] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  const selectedSource = sourcePreset === 'custom' ? customSource.trim().toLowerCase() : sourcePreset
  const generatedLink = buildUtmLink(destinationUrl.trim(), {
    source: selectedSource,
    medium: medium.trim(),
    campaign: campaign.trim(),
    content: content.trim(),
  })

  const quickExamples = [
    {
      key: 'instagram',
      label: 'Instagram',
      link: buildUtmLink(storeUrl, { source: 'instagram', medium: 'social', campaign: 'post_instagram', content: 'bio' }),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      link: buildUtmLink(storeUrl, { source: 'facebook', medium: 'social', campaign: 'post_facebook', content: 'post' }),
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      link: buildUtmLink(storeUrl, { source: 'tiktok', medium: 'social', campaign: 'post_tiktok', content: 'bio' }),
    },
  ]

  async function copyToClipboard(value, key) {
    if (!value) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2000)
    } catch (err) {
      console.error('Errore copia link UTM:', err)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontSize: '14px',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
  }

  return (
    <div>
      <div className="gm-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 14px', color: 'var(--color-text)' }}>🔗 Generatore Link UTM</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>URL di destinazione</label>
            <input
              type="text"
              style={inputStyle}
              value={destinationUrl}
              onChange={e => setDestinationUrl(e.target.value)}
              placeholder="https://tuosito.com/store"
            />
          </div>

          <div>
            <label style={labelStyle}>Sorgente (utm_source)</label>
            <select style={inputStyle} value={sourcePreset} onChange={e => setSourcePreset(e.target.value)}>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="custom">Altro (campo libero)</option>
            </select>
          </div>

          {sourcePreset === 'custom' && (
            <div>
              <label style={labelStyle}>Sorgente personalizzata</label>
              <input
                type="text"
                style={inputStyle}
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
                placeholder="es. newsletter_partner"
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>Medium (utm_medium)</label>
            <input type="text" style={inputStyle} value={medium} onChange={e => setMedium(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Campagna (utm_campaign)</label>
            <input
              type="text"
              style={inputStyle}
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              placeholder="es. post_aprile"
            />
          </div>

          <div>
            <label style={labelStyle}>Contenuto (utm_content, opzionale)</label>
            <input
              type="text"
              style={inputStyle}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="es. storia, post, bio"
            />
          </div>
        </div>
      </div>

      <div className="gm-card" style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px', color: 'var(--color-text)' }}>Link generato</h4>
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '13px', color: generatedLink ? 'var(--color-text)' : 'var(--color-danger)', wordBreak: 'break-all' }}>
            {generatedLink || 'Inserisci un URL valido per generare il link UTM.'}
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="gm-btn gm-btn-primary"
            onClick={() => copyToClipboard(generatedLink, 'generated')}
            disabled={!generatedLink}
          >
            {copiedKey === 'generated' ? 'Copiato ✓' : 'Copia'}
          </button>
        </div>
      </div>

      <div className="gm-card">
        <h4 style={{ margin: '0 0 10px', color: 'var(--color-text)' }}>Esempi rapidi social</h4>
        <div style={{ display: 'grid', gap: '10px' }}>
          {quickExamples.map(example => (
            <div key={example.key} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text)', marginBottom: '6px' }}>{example.label}</div>
              <a
                href={example.link}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', color: 'var(--color-primary)', fontSize: '13px', wordBreak: 'break-all', marginBottom: '10px' }}
              >
                {example.link}
              </a>
              <button type="button" className="gm-btn" onClick={() => copyToClipboard(example.link, example.key)}>
                {copiedKey === example.key ? 'Copiato ✓' : 'Copia'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Footer ─────────────────────────────────────────────────────────────

function TabFooter() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newPage, setNewPage] = useState({ slug: '', titolo: '', sezione: 'informative', contenuto: '', ordine: 0 })
  const [saving, setSaving] = useState(false)

  function loadPages() {
    setLoading(true)
    controlPanelAPI.getFooterPages()
      .then(res => setPages(res.data || []))
      .catch(err => { console.error('Errore caricamento footer pages:', err) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPages() }, [])

  async function handleToggle(slug, abilitato) {
    try {
      const res = await controlPanelAPI.updateFooterPage(slug, { abilitato })
      setPages(prev => prev.map(p => p.slug === slug ? res.data : p))
      setToast('Salvato ✓')
    } catch (err) {
      console.error('Errore toggle:', err)
      setToast('Errore nel salvataggio')
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { slug, ...data } = editing
      const res = await controlPanelAPI.updateFooterPage(slug, data)
      setPages(prev => prev.map(p => p.slug === slug ? res.data : p))
      setEditing(null)
      setToast('Salvato ✓')
    } catch (err) {
      console.error('Errore salvataggio:', err)
      setToast('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await controlPanelAPI.createFooterPage(newPage)
      setPages(prev => [...prev, res.data])
      setCreating(false)
      setNewPage({ slug: '', titolo: '', sezione: 'informative', contenuto: '', ordine: 0 })
      setToast('Pagina creata ✓')
    } catch (err) {
      console.error('Errore creazione:', err)
      setToast('Errore nella creazione')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(slug) {
    if (!window.confirm(`Eliminare la pagina "${slug}"?`)) return
    try {
      await controlPanelAPI.deleteFooterPage(slug)
      setPages(prev => prev.filter(p => p.slug !== slug))
      setToast('Eliminato ✓')
    } catch (err) {
      console.error('Errore eliminazione:', err)
      setToast('Errore eliminazione')
    }
  }

  const sezioneLabel = { informative: 'Informative', scopri: 'Scopri Fantasia', account: 'Il Tuo Account', servizio: 'Servizio Clienti' }

  const inputStyle = {
    padding: '8px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  }

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  }

  const modalStyle = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '28px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>

  return (
    <div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
          Gestisci le voci del footer dello store e il loro contenuto.
        </p>
        <button className="gm-btn gm-btn-primary" onClick={() => setCreating(true)}>
          + Nuova Pagina
        </button>
      </div>

      <div className="gm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table className="gm-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Slug</th>
              <th>Titolo</th>
              <th>Sezione</th>
              <th style={{ textAlign: 'center' }}>Ordine</th>
              <th style={{ textAlign: 'center' }}>Abilitato</th>
              <th style={{ textAlign: 'center' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pages.map(page => (
              <tr key={page.slug}>
                <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{page.slug}</td>
                <td style={{ fontWeight: '500' }}>{page.titolo}</td>
                <td>
                  <span className="gm-badge">{sezioneLabel[page.sezione] || page.sezione}</span>
                </td>
                <td style={{ textAlign: 'center' }}>{page.ordine}</td>
                <td style={{ textAlign: 'center' }}>
                  <Toggle checked={page.abilitato} onChange={val => handleToggle(page.slug, val)} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      className="gm-btn"
                      style={{ padding: '4px 12px', fontSize: '13px' }}
                      onClick={() => setEditing({ ...page })}
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      className="gm-btn"
                      style={{ padding: '4px 12px', fontSize: '13px', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                      onClick={() => handleDelete(page.slug)}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
                  Nessuna pagina footer configurata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', color: 'var(--color-text)' }}>✏️ Modifica — {editing.slug}</h3>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Titolo</label>
                <input style={inputStyle} type="text" value={editing.titolo} onChange={e => setEditing(p => ({ ...p, titolo: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Sezione</label>
                <select style={inputStyle} value={editing.sezione} onChange={e => setEditing(p => ({ ...p, sezione: e.target.value }))}>
                  <option value="informative">Informative</option>
                  <option value="scopri">Scopri Fantasia</option>
                  <option value="account">Il Tuo Account</option>
                  <option value="servizio">Servizio Clienti</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Ordine</label>
                <input style={{ ...inputStyle, width: '100px' }} type="number" value={editing.ordine} onChange={e => setEditing(p => ({ ...p, ordine: parseInt(e.target.value) || 0 }))} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Contenuto (HTML o testo)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '200px', resize: 'vertical', fontFamily: 'monospace' }}
                  value={editing.contenuto || ''}
                  onChange={e => setEditing(p => ({ ...p, contenuto: e.target.value }))}
                  placeholder="Inserisci il contenuto della pagina..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="gm-btn" onClick={() => setEditing(null)}>Annulla</button>
                <button type="submit" className="gm-btn gm-btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : '💾 Salva'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div style={modalOverlayStyle} onClick={e => { if (e.target === e.currentTarget) setCreating(false) }}>
          <div style={modalStyle}>
            <h3 style={{ margin: '0 0 20px', color: 'var(--color-text)' }}>+ Nuova Pagina Footer</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Slug (univoco, es. "mia-pagina")</label>
                <input style={inputStyle} type="text" value={newPage.slug} onChange={e => setNewPage(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') }))} required placeholder="es. termini-e-condizioni" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Titolo</label>
                <input style={inputStyle} type="text" value={newPage.titolo} onChange={e => setNewPage(p => ({ ...p, titolo: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Sezione</label>
                <select style={inputStyle} value={newPage.sezione} onChange={e => setNewPage(p => ({ ...p, sezione: e.target.value }))}>
                  <option value="informative">Informative</option>
                  <option value="scopri">Scopri Fantasia</option>
                  <option value="account">Il Tuo Account</option>
                  <option value="servizio">Servizio Clienti</option>
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Ordine</label>
                <input style={{ ...inputStyle, width: '100px' }} type="number" value={newPage.ordine} onChange={e => setNewPage(p => ({ ...p, ordine: parseInt(e.target.value) || 0 }))} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Contenuto (HTML o testo)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', fontFamily: 'monospace' }}
                  value={newPage.contenuto}
                  onChange={e => setNewPage(p => ({ ...p, contenuto: e.target.value }))}
                  placeholder="Inserisci il contenuto della pagina..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="gm-btn" onClick={() => setCreating(false)}>Annulla</button>
                <button type="submit" className="gm-btn gm-btn-primary" disabled={saving}>{saving ? 'Creazione...' : '✅ Crea'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  { key: 'utm', label: '🔗 Link UTM' },
  { key: 'footer', label: '📄 Footer' },
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
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
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
      {activeTab === 'utm' && <TabUtm />}
      {activeTab === 'footer' && <TabFooter />}
    </div>
  )
}
