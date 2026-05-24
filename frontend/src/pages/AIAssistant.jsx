import { useEffect, useMemo, useState } from 'react'
import { aiAPI } from '../api/ai'
import { prodottiAPI } from '../api/client'

function renderMessageContent(content) {
  if (!content) return null
  const trimmed = content.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return (
          <div style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            {Object.entries(parsed).map(([k, v]) => (
              <div key={k}><strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
            ))}
          </div>
        )
      }
    } catch (_) { /* not valid JSON, render as text */ }
  }
  return content
}

const TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'mercato', label: 'Analisi Mercato' },
  { key: 'magazzino', label: 'Analisi Magazzino' },
  { key: 'descrizioni', label: 'Descrizioni' },
  { key: 'stock', label: 'Previsioni Stock' },
]

const badgeStyle = {
  troppo_basso: { background: '#e8f5e9', color: '#2e7d32' },
  troppo_alto: { background: '#ffebee', color: '#c62828' },
  nella_norma: { background: '#fff8e1', color: '#ef6c00' },
  dati_insufficienti: { background: '#eceff1', color: '#455a64' },
}

export default function AIAssistant() {
  const [tab, setTab] = useState('chat')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')

  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])

  const [mercatoForm, setMercatoForm] = useState({ prodotto_id: '', nome: '', lingua: '', condizione: '', prezzo_acquisto: '' })
  const [mercatoResult, setMercatoResult] = useState(null)

  const [magazzinoResult, setMagazzinoResult] = useState([])

  const [descrForm, setDescrForm] = useState({ prodotto_id: '', nome: '', condizione: '', lingua: '', categoria: '' })
  const [descrResult, setDescrResult] = useState(null)

  const [stockResult, setStockResult] = useState([])
  const [stockSummary, setStockSummary] = useState('')

  useEffect(() => {
    prodottiAPI.getAll({ limit: 200 })
      .then((res) => setProducts(res.data || []))
      .catch(() => setProducts([]))
  }, [])

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(mercatoForm.prodotto_id)),
    [products, mercatoForm.prodotto_id],
  )

  const runMercato = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = mercatoForm.prodotto_id
        ? { prodotto_id: Number(mercatoForm.prodotto_id) }
        : {
            nome: mercatoForm.nome,
            lingua: mercatoForm.lingua,
            condizione: mercatoForm.condizione,
            prezzo_acquisto: mercatoForm.prezzo_acquisto ? Number(mercatoForm.prezzo_acquisto) : undefined,
          }
      const res = await aiAPI.analisiMercato(payload)
      setMercatoResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante analisi mercato')
    } finally {
      setLoading(false)
    }
  }

  const runMagazzino = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aiAPI.analisiMagazzino()
      setMagazzinoResult(res.data?.suggerimenti || [])
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante analisi magazzino')
    } finally {
      setLoading(false)
    }
  }

  const runDescrizione = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = descrForm.prodotto_id
        ? { prodotto_id: Number(descrForm.prodotto_id) }
        : descrForm
      const res = await aiAPI.generaDescrizione(payload)
      setDescrResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante generazione descrizione')
    } finally {
      setLoading(false)
    }
  }

  const runStock = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aiAPI.previsioniStock()
      setStockResult(res.data?.suggerimenti || [])
      setStockSummary(res.data?.riepilogo_ai || '')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante previsioni stock')
    } finally {
      setLoading(false)
    }
  }

  const sendChat = async () => {
    const text = chatInput.trim()
    if (!text || loading) return
    const newMessages = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(newMessages)
    setChatInput('')
    setLoading(true)
    setError('')
    try {
      const res = await aiAPI.chat({ messaggio: text, history: newMessages })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data?.risposta || '' }])
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore chat AI')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div className="gm-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`gm-btn ${tab === t.key ? 'gm-btn-primary' : 'gm-btn-secondary'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="gm-card" style={{ color: 'var(--color-danger)' }}>⚠️ {error}</div>}
      {loading && <div className="gm-card">⏳ AI sta scrivendo... (può richiedere fino a 60 secondi)</div>}

      {tab === 'chat' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>💬 Chat Assistant</h3>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, minHeight: 280, maxHeight: 420, overflowY: 'auto', background: 'var(--color-bg)' }}>
            {chatMessages.length === 0 && <div style={{ opacity: 0.7 }}>Fai una domanda sul magazzino (riordini, prodotti più venduti, valore stock...).</div>}
            {chatMessages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <span style={{ display: 'inline-block', padding: '8px 10px', borderRadius: 10, background: m.role === 'user' ? 'rgba(99,120,255,.12)' : 'var(--color-surface-hover)' }}>
                  {renderMessageContent(m.content)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Scrivi la tua domanda..."
              style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }}
            />
            <button className="gm-btn gm-btn-primary" onClick={sendChat}>Invia</button>
          </div>
        </div>
      )}

      {tab === 'mercato' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>📊 Analisi Mercato</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <select
              value={mercatoForm.prodotto_id}
              onChange={(e) => setMercatoForm((prev) => ({ ...prev, prodotto_id: e.target.value }))}
              style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }}
            >
              <option value="">Seleziona prodotto da magazzino (opzionale)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {!mercatoForm.prodotto_id && (
              <>
                <input placeholder="Nome prodotto" value={mercatoForm.nome} onChange={(e) => setMercatoForm((p) => ({ ...p, nome: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
                <input placeholder="Lingua" value={mercatoForm.lingua} onChange={(e) => setMercatoForm((p) => ({ ...p, lingua: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
                <input placeholder="Condizione" value={mercatoForm.condizione} onChange={(e) => setMercatoForm((p) => ({ ...p, condizione: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
                <input placeholder="Prezzo acquisto" type="number" value={mercatoForm.prezzo_acquisto} onChange={(e) => setMercatoForm((p) => ({ ...p, prezzo_acquisto: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
              </>
            )}
            <button className="gm-btn gm-btn-primary" onClick={runMercato} disabled={loading || (!mercatoForm.prodotto_id && !mercatoForm.nome)}>
              Analizza
            </button>
          </div>
          {selectedProduct && <div style={{ fontSize: 13, opacity: 0.8 }}>Prodotto selezionato: {selectedProduct.nome}</div>}
          {mercatoResult && (
            <div style={{ display: 'grid', gap: 8 }}>
              {(() => {
                const s = mercatoResult.mercato?.summary || {}
                const r = mercatoResult.raccomandazioni || {}
                const p = mercatoResult.prodotto || {}
                return (
                  <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}>
                    <div style={{ fontWeight: 600 }}>📊 {p.nome}{p.condizione ? ` (${p.condizione})` : ''}</div>
                    {s.total_annunci != null && (
                      <div>
                        Annunci trovati: <strong>{s.count}</strong>
                        {s.outliers_esclusi > 0 && ` (su ${s.total_annunci} totali, ${s.outliers_esclusi} esclusi come outlier)`}
                      </div>
                    )}
                    {s.min != null && <div>💰 Prezzo minimo: <strong>€{s.min.toFixed(2)}</strong></div>}
                    {s.max != null && <div>📈 Prezzo massimo: <strong>€{s.max.toFixed(2)}</strong></div>}
                    {s.avg != null && <div>📊 Prezzo medio: <strong>€{s.avg.toFixed(2)}</strong></div>}
                    {r.prezzo_massimo_acquisto_per_margine_30 != null && (
                      <div>🎯 Prezzo max acquisto (margine 30%): <strong>€{r.prezzo_massimo_acquisto_per_margine_30.toFixed(2)}</strong></div>
                    )}
                    {r.suggerimenti_rule_based?.length > 0 && (
                      <div style={{ marginTop: 4, padding: '8px 10px', borderRadius: 6, background: 'var(--color-surface-hover)', fontSize: 13 }}>
                        {r.suggerimenti_rule_based.map((sg, i) => <div key={i}>⚠️ {sg}</div>)}
                      </div>
                    )}
                  </div>
                )
              })()}
              <div style={{ whiteSpace: 'pre-wrap' }}>{mercatoResult.raccomandazioni?.analisi_llm}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'magazzino' && (
        <div className="gm-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>📊 Analisi Magazzino</h3>
            <button className="gm-btn gm-btn-primary" onClick={runMagazzino}>Aggiorna analisi</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Prodotto</th>
                <th style={{ textAlign: 'left' }}>Prezzo vendita</th>
                <th style={{ textAlign: 'left' }}>Prezzo medio mercato</th>
                <th style={{ textAlign: 'left' }}>Stato</th>
                <th style={{ textAlign: 'left' }}>Suggerimento</th>
              </tr>
            </thead>
            <tbody>
              {magazzinoResult.map((r) => (
                <tr key={r.prodotto_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 0' }}>{r.nome}</td>
                  <td>€{r.prezzo_vendita ?? '-'}</td>
                  <td>€{r.prezzo_mercato_medio ?? '-'}</td>
                  <td>
                    <span style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, ...(badgeStyle[r.stato] || badgeStyle.dati_insufficienti) }}>
                      {r.stato}
                    </span>
                  </td>
                  <td>{r.suggerimento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'descrizioni' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>📝 Generazione Descrizioni</h3>
          <select value={descrForm.prodotto_id} onChange={(e) => setDescrForm((p) => ({ ...p, prodotto_id: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }}>
            <option value="">Seleziona prodotto da magazzino (opzionale)</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {!descrForm.prodotto_id && (
            <>
              <input placeholder="Nome prodotto" value={descrForm.nome} onChange={(e) => setDescrForm((p) => ({ ...p, nome: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
              <input placeholder="Condizione" value={descrForm.condizione} onChange={(e) => setDescrForm((p) => ({ ...p, condizione: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
              <input placeholder="Lingua" value={descrForm.lingua} onChange={(e) => setDescrForm((p) => ({ ...p, lingua: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
              <input placeholder="Categoria" value={descrForm.categoria} onChange={(e) => setDescrForm((p) => ({ ...p, categoria: e.target.value }))} style={{ minHeight: 40, borderRadius: 8, border: '1px solid var(--color-border)', padding: '0 10px' }} />
            </>
          )}
          <button className="gm-btn gm-btn-primary" onClick={runDescrizione} disabled={loading || (!descrForm.prodotto_id && !descrForm.nome)}>
            Genera descrizione
          </button>
          {descrResult && (
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Italiano</label>
              <textarea readOnly value={descrResult.descrizione_it || descrResult.raw || ''} style={{ minHeight: 120, borderRadius: 8, border: '1px solid var(--color-border)', padding: 10 }} />
              <button className="gm-btn gm-btn-secondary" onClick={() => navigator.clipboard.writeText(descrResult.descrizione_it || descrResult.raw || '')}>Copia IT</button>
              <label>English</label>
              <textarea readOnly value={descrResult.descrizione_en || ''} style={{ minHeight: 120, borderRadius: 8, border: '1px solid var(--color-border)', padding: 10 }} />
              <button className="gm-btn gm-btn-secondary" onClick={() => navigator.clipboard.writeText(descrResult.descrizione_en || '')}>Copy EN</button>
            </div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0 }}>📈 Previsioni Stock</h3>
            <button className="gm-btn gm-btn-primary" onClick={runStock}>Analizza stock</button>
          </div>
          {stockSummary && <div style={{ whiteSpace: 'pre-wrap' }}>{stockSummary}</div>}
          <div style={{ display: 'grid', gap: 8 }}>
            {stockResult.map((s) => (
              <div key={s.prodotto_id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 10 }}>
                <div><strong>{s.nome}</strong></div>
                <div>Quantità: {s.quantita_attuale} | Copertura: {s.giorni_copertura ?? 'n/d'} giorni</div>
                <div>{s.riordino_consigliato ? `Riordina ${s.quantita_riordino_suggerita} pezzi` : 'Nessun riordino immediato'}</div>
                <div style={{ opacity: 0.8 }}>{s.motivo}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
