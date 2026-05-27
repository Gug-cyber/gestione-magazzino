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
    } catch (_) { /* render as plain text */ }
  }
  return content
}

function toStr(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `€${Number(value).toFixed(2)}`
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  const number = Number(value)
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
}

const TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'mercato', label: 'Analisi Mercato' },
  { key: 'prezzi', label: 'Analisi Prezzi' },
  { key: 'magazzino', label: 'Analisi Magazzino' },
  { key: 'descrizioni', label: 'Descrizioni' },
  { key: 'email', label: 'Email Fornitore' },
  { key: 'trend', label: 'Trend' },
  { key: 'stock', label: 'Previsioni Stock' },
]

const badgeStyle = {
  sopra_mercato: { background: '#ffebee', color: '#c62828' },
  sotto_mercato: { background: '#e8f5e9', color: '#2e7d32' },
  in_linea: { background: '#fff8e1', color: '#ef6c00' },
  troppo_basso: { background: '#e8f5e9', color: '#2e7d32' },
  troppo_alto: { background: '#ffebee', color: '#c62828' },
  nella_norma: { background: '#fff8e1', color: '#ef6c00' },
  dati_insufficienti: { background: '#eceff1', color: '#455a64' },
}

const inputStyle = {
  minHeight: 40,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  padding: '0 10px',
}

const textAreaStyle = {
  minHeight: 120,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  padding: 10,
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

  const [priceAnalysis, setPriceAnalysis] = useState({ prodotti: [], top_critici: [] })
  const [magazzinoResult, setMagazzinoResult] = useState([])

  const [descrForm, setDescrForm] = useState({ prodotto_id: '', nome: '', condizione: '', lingua: '', categoria: '' })
  const [descrResult, setDescrResult] = useState(null)

  const [emailForm, setEmailForm] = useState({ nome_fornitore: '', descrizione_lotto: '', prezzo_proposto: '', tipo_email: 'proposta_acquisto' })
  const [emailResult, setEmailResult] = useState(null)

  const [trendForm, setTrendForm] = useState({ prodotto_id: '', periodo_giorni: '30' })
  const [trendResult, setTrendResult] = useState(null)

  const [stockResult, setStockResult] = useState([])
  const [stockSummary, setStockSummary] = useState('')

  useEffect(() => {
    prodottiAPI.getAll({ limit: 200 })
      .then((res) => setProducts(res.data || []))
      .catch(() => setProducts([]))
  }, [])

  const selectedMercatoProduct = useMemo(
    () => products.find((p) => String(p.id) === String(mercatoForm.prodotto_id)),
    [products, mercatoForm.prodotto_id],
  )

  const selectedTrendProduct = useMemo(
    () => products.find((p) => String(p.id) === String(trendForm.prodotto_id)),
    [products, trendForm.prodotto_id],
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

  const runPriceAnalysis = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aiAPI.analisiPrezzi()
      setPriceAnalysis({
        prodotti: res.data?.prodotti || [],
        top_critici: res.data?.top_critici || [],
      })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante analisi prezzi')
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

  const runEmail = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aiAPI.generaEmailFornitore({
        ...emailForm,
        prezzo_proposto: Number(emailForm.prezzo_proposto),
      })
      setEmailResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante generazione email')
    } finally {
      setLoading(false)
    }
  }

  const runTrend = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await aiAPI.trendProdotto({
        prodotto_id: Number(trendForm.prodotto_id),
        periodo_giorni: Number(trendForm.periodo_giorni),
      })
      setTrendResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Errore durante analisi trend')
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
            {chatMessages.length === 0 && <div style={{ opacity: 0.7 }}>Fai una domanda sul magazzino (valore stock, prodotti sotto scorta, articoli recenti...).</div>}
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
              style={{ ...inputStyle, flex: 1 }}
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
              style={inputStyle}
            >
              <option value="">Seleziona prodotto da magazzino (opzionale)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {!mercatoForm.prodotto_id && (
              <>
                <input placeholder="Nome prodotto" value={mercatoForm.nome} onChange={(e) => setMercatoForm((p) => ({ ...p, nome: e.target.value }))} style={inputStyle} />
                <input placeholder="Lingua" value={mercatoForm.lingua} onChange={(e) => setMercatoForm((p) => ({ ...p, lingua: e.target.value }))} style={inputStyle} />
                <input placeholder="Condizione" value={mercatoForm.condizione} onChange={(e) => setMercatoForm((p) => ({ ...p, condizione: e.target.value }))} style={inputStyle} />
                <input placeholder="Prezzo acquisto" type="number" value={mercatoForm.prezzo_acquisto} onChange={(e) => setMercatoForm((p) => ({ ...p, prezzo_acquisto: e.target.value }))} style={inputStyle} />
              </>
            )}
            <button className="gm-btn gm-btn-primary" onClick={runMercato} disabled={loading || (!mercatoForm.prodotto_id && !mercatoForm.nome)}>
              Analizza
            </button>
          </div>
          {selectedMercatoProduct && <div style={{ fontSize: 13, opacity: 0.8 }}>Prodotto selezionato: {selectedMercatoProduct.nome}</div>}
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
                        Annunci considerati: <strong>{s.count}</strong>
                        {s.outliers_esclusi > 0 && ` (su ${s.total_annunci} totali, ${s.outliers_esclusi} esclusi come outlier)`}
                      </div>
                    )}
                    <div>💰 Prezzo minimo: <strong>{formatCurrency(s.min)}</strong></div>
                    <div>📊 Prezzo medio: <strong>{formatCurrency(s.avg)}</strong></div>
                    <div>🎯 Prezzo max acquisto (margine 30%): <strong>{formatCurrency(r.prezzo_massimo_acquisto_per_margine_30)}</strong></div>
                    <div>🏷️ Prezzo vendita consigliato: <strong>{formatCurrency(r.prezzo_consigliato_vendita)}</strong></div>
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

      {tab === 'prezzi' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12, overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0 }}>📊 Analisi Prezzi</h3>
            <button className="gm-btn gm-btn-primary" onClick={runPriceAnalysis}>Aggiorna analisi</button>
          </div>
          {priceAnalysis.top_critici?.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontWeight: 600 }}>Top 5 casi più critici</div>
              {priceAnalysis.top_critici.map((item) => (
                <div key={item.prodotto_id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 10, background: 'var(--color-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{item.nome}</strong>
                    <span style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, ...(badgeStyle[item.classificazione] || badgeStyle.dati_insufficienti) }}>
                      {item.classificazione}
                    </span>
                  </div>
                  <div>Prezzo vendita: {formatCurrency(item.prezzo_vendita)} | Mercato medio: {formatCurrency(item.prezzo_mercato_medio)} | Scostamento: {formatPercent(item.differenza_pct)}</div>
                  <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{item.commento_ai}</div>
                </div>
              ))}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Prodotto</th>
                <th style={{ textAlign: 'left' }}>Prezzo vendita</th>
                <th style={{ textAlign: 'left' }}>Prezzo medio mercato</th>
                <th style={{ textAlign: 'left' }}>Differenza</th>
                <th style={{ textAlign: 'left' }}>Classificazione</th>
              </tr>
            </thead>
            <tbody>
              {priceAnalysis.prodotti.map((r) => (
                <tr key={r.prodotto_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 0' }}>{r.nome}</td>
                  <td>{formatCurrency(r.prezzo_vendita)}</td>
                  <td>{formatCurrency(r.prezzo_mercato_medio)}</td>
                  <td>{formatPercent(r.differenza_pct)}</td>
                  <td>
                    <span style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, ...(badgeStyle[r.classificazione] || badgeStyle.dati_insufficienti) }}>
                      {r.classificazione}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'magazzino' && (
        <div className="gm-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>📦 Analisi Magazzino</h3>
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
                  <td>{formatCurrency(r.prezzo_vendita)}</td>
                  <td>{formatCurrency(r.prezzo_mercato_medio)}</td>
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
          <select value={descrForm.prodotto_id} onChange={(e) => setDescrForm((p) => ({ ...p, prodotto_id: e.target.value }))} style={inputStyle}>
            <option value="">Seleziona prodotto da magazzino (opzionale)</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          {!descrForm.prodotto_id && (
            <>
              <input placeholder="Nome prodotto" value={descrForm.nome} onChange={(e) => setDescrForm((p) => ({ ...p, nome: e.target.value }))} style={inputStyle} />
              <input placeholder="Condizione" value={descrForm.condizione} onChange={(e) => setDescrForm((p) => ({ ...p, condizione: e.target.value }))} style={inputStyle} />
              <input placeholder="Lingua" value={descrForm.lingua} onChange={(e) => setDescrForm((p) => ({ ...p, lingua: e.target.value }))} style={inputStyle} />
              <input placeholder="Categoria" value={descrForm.categoria} onChange={(e) => setDescrForm((p) => ({ ...p, categoria: e.target.value }))} style={inputStyle} />
            </>
          )}
          <button className="gm-btn gm-btn-primary" onClick={runDescrizione} disabled={loading || (!descrForm.prodotto_id && !descrForm.nome)}>
            Genera descrizione
          </button>
          {descrResult && (
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Italiano</label>
              <textarea readOnly value={toStr(descrResult.descrizione_it) || toStr(descrResult.raw)} style={textAreaStyle} />
              <button className="gm-btn gm-btn-secondary" onClick={() => navigator.clipboard.writeText(toStr(descrResult.descrizione_it) || toStr(descrResult.raw))}>Copia IT</button>
              <label>English</label>
              <textarea readOnly value={toStr(descrResult.descrizione_en)} style={textAreaStyle} />
              <button className="gm-btn gm-btn-secondary" onClick={() => navigator.clipboard.writeText(toStr(descrResult.descrizione_en))}>Copy EN</button>
            </div>
          )}
        </div>
      )}

      {tab === 'email' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>📧 Email Fornitore</h3>
          <input placeholder="Nome fornitore (opzionale)" value={emailForm.nome_fornitore} onChange={(e) => setEmailForm((p) => ({ ...p, nome_fornitore: e.target.value }))} style={inputStyle} />
          <textarea placeholder="Descrizione lotto/prodotto" value={emailForm.descrizione_lotto} onChange={(e) => setEmailForm((p) => ({ ...p, descrizione_lotto: e.target.value }))} style={textAreaStyle} />
          <input placeholder="Prezzo proposto" type="number" value={emailForm.prezzo_proposto} onChange={(e) => setEmailForm((p) => ({ ...p, prezzo_proposto: e.target.value }))} style={inputStyle} />
          <select value={emailForm.tipo_email} onChange={(e) => setEmailForm((p) => ({ ...p, tipo_email: e.target.value }))} style={inputStyle}>
            <option value="proposta_acquisto">Proposta acquisto</option>
            <option value="richiesta_info">Richiesta info</option>
            <option value="controfferta">Controfferta</option>
          </select>
          <button className="gm-btn gm-btn-primary" onClick={runEmail} disabled={loading || !emailForm.descrizione_lotto || !emailForm.prezzo_proposto}>
            Genera email
          </button>
          {emailResult && (
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Oggetto</label>
              <textarea readOnly value={toStr(emailResult.oggetto)} style={{ ...textAreaStyle, minHeight: 70 }} />
              <button className="gm-btn gm-btn-secondary" onClick={() => navigator.clipboard.writeText(toStr(emailResult.oggetto))}>Copia oggetto</button>
              <label>Corpo email</label>
              <textarea readOnly value={toStr(emailResult.corpo)} style={{ ...textAreaStyle, minHeight: 220 }} />
              <button className="gm-btn gm-btn-secondary" onClick={() => navigator.clipboard.writeText(toStr(emailResult.corpo))}>Copia email</button>
            </div>
          )}
        </div>
      )}

      {tab === 'trend' && (
        <div className="gm-card" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>📈 Trend Prodotto</h3>
          <select value={trendForm.prodotto_id} onChange={(e) => setTrendForm((p) => ({ ...p, prodotto_id: e.target.value }))} style={inputStyle}>
            <option value="">Seleziona prodotto</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select value={trendForm.periodo_giorni} onChange={(e) => setTrendForm((p) => ({ ...p, periodo_giorni: e.target.value }))} style={inputStyle}>
            <option value="30">Ultimi 30 giorni</option>
            <option value="60">Ultimi 60 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
          </select>
          <button className="gm-btn gm-btn-primary" onClick={runTrend} disabled={loading || !trendForm.prodotto_id}>
            Analizza trend
          </button>
          {selectedTrendProduct && <div style={{ fontSize: 13, opacity: 0.8 }}>Prodotto selezionato: {selectedTrendProduct.nome}</div>}
          {trendResult && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, background: 'var(--color-bg)' }}>
                <div><strong>{trendResult.prodotto?.nome}</strong></div>
                <div>Periodo: {trendResult.periodo_giorni} giorni</div>
                <div>Prezzo iniziale: {formatCurrency(trendResult.prezzo_iniziale)}</div>
                <div>Prezzo finale: {formatCurrency(trendResult.prezzo_finale)}</div>
                <div>Variazione: <strong>{formatPercent(trendResult.variazione_pct)}</strong></div>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{trendResult.commento_ai}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Data</th>
                    <th style={{ textAlign: 'left' }}>Prezzo medio</th>
                  </tr>
                </thead>
                <tbody>
                  {trendResult.serie_prezzi?.map((item, idx) => (
                    <tr key={`${item.data}-${idx}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 0' }}>{item.data}</td>
                      <td>{formatCurrency(item.prezzo_medio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
