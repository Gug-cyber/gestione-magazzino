import { useState, useEffect } from 'react'
import { speseGestioneAPI, analisiAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

// Bar Chart Component
function BarChart({ data, labelKey, title }) {
  if (!data || data.length === 0) {
    return <p className="text-muted">Nessun dato disponibile.</p>
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.costi || 0, d.ricavi || 0, d.spese || 0, d.packaging || 0)),
    1
  )

  const series = [
    { key: 'costi', label: 'Costi merci', color: 'var(--danger)' },
    { key: 'ricavi', label: 'Ricavi', color: 'var(--success)' },
    { key: 'spese', label: 'Spese gestione', color: 'var(--warning)' },
    { key: 'packaging', label: 'Packaging', color: '#8b5cf6' },
  ]

  return (
    <div>
      <h3 className="section-title-sm" style={{ marginBottom: '16px' }}>{title}</h3>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: s.color, borderRadius: '3px' }} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* Grafico */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: '8px', 
          minWidth: `${data.length * 72}px`, 
          height: '220px', 
          paddingBottom: '28px', 
          position: 'relative',
          borderBottom: '1px solid var(--border-primary)'
        }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', justifyContent: 'center', height: '180px' }}>
                {series.map((s) => {
                  const val = d[s.key] || 0
                  const heightPct = (val / maxVal) * 100
                  return (
                    <div
                      key={s.key}
                      title={`${s.label}: €${val.toFixed(2)}`}
                      style={{
                        width: '14px',
                        height: `${heightPct}%`,
                        minHeight: val > 0 ? '2px' : '0',
                        backgroundColor: s.color,
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                      }}
                    />
                  )
                })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {typeof d[labelKey] === 'number' && labelKey === 'mese'
                  ? MESI[d[labelKey] - 1]
                  : d[labelKey]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Tab Grafici
function TabGrafici() {
  const [vista, setVista] = useState('mensile')
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [datiMensili, setDatiMensili] = useState([])
  const [datiAnnuali, setDatiAnnuali] = useState([])
  const [topProdotti, setTopProdotti] = useState([])
  const [marginalita, setMarginalita] = useState(null)
  const [meseSelezionato, setMeseSelezionato] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    const caricaDati = async () => {
      setLoading(true)
      setErrore(null)
      try {
        const [mensileRes, annualeRes, topProdottiRes, marginalitaRes] = await Promise.all([
          analisiAPI.getMensile(anno),
          analisiAPI.getAnnuale(),
          analisiAPI.getTopProdottiMensile(anno, meseSelezionato),
          analisiAPI.getMarginalitaConfronto(anno, meseSelezionato),
        ])
        setDatiMensili(mensileRes.data)
        setDatiAnnuali(annualeRes.data)
        setTopProdotti(topProdottiRes.data)
        setMarginalita(marginalitaRes.data)
      } catch {
        setErrore('Errore nel caricamento dei dati di analisi.')
      } finally {
        setLoading(false)
      }
    }
    caricaDati()
  }, [anno, meseSelezionato])

  const datiCorrente = vista === 'mensile' ? datiMensili : datiAnnuali
  const totCosti = datiCorrente.reduce((s, d) => s + (d.costi || 0), 0)
  const totRicavi = datiCorrente.reduce((s, d) => s + (d.ricavi || 0), 0)
  const totSpese = datiCorrente.reduce((s, d) => s + (d.spese || 0), 0)
  const totPackaging = datiCorrente.reduce((s, d) => s + (d.packaging || 0), 0)
  const totaleSpese = datiCorrente.reduce((s, d) => s + (d.totale_spese || (d.spese || 0) + (d.packaging || 0)), 0)
  const margine = totRicavi - totCosti - totSpese - totPackaging

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div>
      {/* Selettori rapidi periodo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setVista('mensile'); setAnno(currentYear); setMeseSelezionato(currentMonth) }}
          className={vista === 'mensile' && anno === currentYear && meseSelezionato === currentMonth ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.8125rem' }}
        >
          Questo mese
        </button>
        <button
          onClick={() => { setVista('annuale'); setAnno(currentYear) }}
          className={vista === 'annuale' && anno === currentYear ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.8125rem' }}
        >
          Quest&#39;anno
        </button>
      </div>

      {/* Selettori */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['mensile', 'annuale'].map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={vista === v ? 'btn-primary' : 'btn-secondary'}
              style={{ gap: '6px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {v === 'mensile' ? (
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                ) : (
                  <path d="M4 4h16v16H4zM4 10h16M10 4v16" />
                )}
              </svg>
              {v === 'mensile' ? 'Mensile' : 'Annuale'}
            </button>
          ))}
        </div>
        {vista === 'mensile' && (
          <select
            value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            className="form-input"
            style={{ width: 'auto' }}
          >
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {loading && <p className="text-muted">Caricamento...</p>}
      {errore && <div className="error-banner">{errore}</div>}

      {!loading && (
        <>
          <div className="card mb-6">
            <BarChart
              data={datiCorrente}
              labelKey={vista === 'mensile' ? 'mese' : 'anno'}
              title={vista === 'mensile' ? `Andamento mensile ${anno}` : 'Andamento annuale'}
            />
          </div>

          {/* Riepilogo */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { label: 'Costi merci', value: totCosti, color: 'var(--danger)', borderColor: 'var(--danger)' },
              { label: 'Ricavi', value: totRicavi, color: 'var(--success)', borderColor: 'var(--success)' },
              { label: 'Spese gestione', value: totSpese, color: 'var(--warning)', borderColor: 'var(--warning)' },
              { label: 'Packaging', value: totPackaging, color: '#8b5cf6', borderColor: '#8b5cf6' },
              { label: 'Totale Spese', value: totaleSpese, color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)' },
              { label: 'Margine', value: margine, color: margine >= 0 ? 'var(--success)' : 'var(--danger)', borderColor: margine >= 0 ? 'var(--success)' : 'var(--danger)' },
            ].map((item) => (
              <div key={item.label} className="card" style={{ borderLeft: `3px solid ${item.borderColor}`, textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{item.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: item.color }}>
                  €{item.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Selettore mese per report dettagliati */}
          {vista === 'mensile' && (
            <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Report dettagliati per mese:</label>
              <select
                value={meseSelezionato}
                onChange={(e) => setMeseSelezionato(Number(e.target.value))}
                className="form-input"
                style={{ width: 'auto' }}
              >
                {MESI.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Report Top 5 Prodotti */}
          {vista === 'mensile' && (
            <div className="card mb-6">
              <h3 className="section-title" style={{ color: 'var(--primary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                Top 5 Prodotti - {MESI[meseSelezionato - 1]} {anno}
              </h3>
              {topProdotti.length === 0 ? (
                <p className="text-muted">Nessun prodotto venduto in questo mese.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topProdotti.map((p, i) => {
                    const maxQta = topProdotti[0].quantita_venduta
                    const widthPct = (p.quantita_venduta / maxQta) * 100
                    return (
                      <div key={p.prodotto_id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: '30px', fontWeight: 'bold', color: 'var(--text-muted)' }}>#{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                            {p.nome} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({p.sku})</span>
                          </div>
                          <div style={{
                            height: '28px',
                            background: 'linear-gradient(90deg, var(--success), #34d399)',
                            borderRadius: '6px',
                            width: `${widthPct}%`,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '12px',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            minWidth: '70px',
                            boxSizing: 'border-box',
                          }}>
                            {p.quantita_venduta} pz
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Report Marginalita */}
          {vista === 'mensile' && marginalita && (
            <div className="card">
              <h3 className="section-title" style={{ color: 'var(--primary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
                Marginalita vs Mese Precedente
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* Mese Corrente */}
                <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {MESI[marginalita.mese_corrente.mese - 1]} {marginalita.mese_corrente.anno}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                    €{marginalita.mese_corrente.marginalita.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Marginalita</div>
                </div>

                {/* Variazione */}
                <div style={{ 
                  padding: '20px', 
                  background: marginalita.variazione_assoluta >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  border: `1px solid ${marginalita.variazione_assoluta >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: 'var(--radius-lg)', 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Variazione</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: marginalita.variazione_assoluta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {marginalita.variazione_assoluta >= 0 ? '↑' : '↓'}{' '}
                    {marginalita.variazione_percentuale !== null ? `${marginalita.variazione_percentuale.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    €{Math.abs(marginalita.variazione_assoluta).toFixed(2)}
                  </div>
                </div>

                {/* Mese Precedente */}
                <div style={{ padding: '20px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {MESI[marginalita.mese_precedente.mese - 1]} {marginalita.mese_precedente.anno}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    €{marginalita.mese_precedente.marginalita.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Marginalita</div>
                </div>
              </div>

              {/* Dettaglio breakdown */}
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600' }}>
                  Dettaglio {MESI[meseSelezionato - 1]} {anno}:
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                  <div>Ricavi: <strong style={{ color: 'var(--success)' }}>€{marginalita.mese_corrente.ricavi.toFixed(2)}</strong></div>
                  <div>Costi: <strong style={{ color: 'var(--danger)' }}>€{marginalita.mese_corrente.costi.toFixed(2)}</strong></div>
                  <div>Spese: <strong style={{ color: 'var(--warning)' }}>€{marginalita.mese_corrente.spese.toFixed(2)}</strong></div>
                  <div>Packaging: <strong style={{ color: '#8b5cf6' }}>€{(marginalita.mese_corrente.packaging || 0).toFixed(2)}</strong></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Tab Spese
const formVuoto = {
  descrizione: '',
  importo: '',
  categoria: '',
  ricorrente: false,
  data: new Date().toISOString().slice(0, 10),
}

function TabSpese() {
  const [spese, setSpese] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostraForm, setMostraForm] = useState(false)
  const [form, setForm] = useState(formVuoto)
  const [editId, setEditId] = useState(null)
  const [errore, setErrore] = useState(null)

  const caricaSpese = async () => {
    setLoading(true)
    try {
      const res = await speseGestioneAPI.getAll({ limit: 1000 })
      setSpese(res.data)
    } catch {
      setErrore('Errore nel caricamento delle spese.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { caricaSpese() }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrore(null)
    try {
      const payload = {
        ...form,
        importo: parseFloat(form.importo),
        data: form.data ? new Date(form.data).toISOString() : null,
      }
      if (editId) {
        await speseGestioneAPI.update(editId, payload)
      } else {
        await speseGestioneAPI.create(payload)
      }
      setForm(formVuoto)
      setMostraForm(false)
      setEditId(null)
      await caricaSpese()
    } catch {
      setErrore('Errore nel salvataggio della spesa.')
    }
  }

  const handleEdit = (spesa) => {
    setForm({
      descrizione: spesa.descrizione,
      importo: String(spesa.importo),
      categoria: spesa.categoria || '',
      ricorrente: spesa.ricorrente,
      data: spesa.data ? new Date(spesa.data).toISOString().slice(0, 10) : '',
    })
    setEditId(spesa.id)
    setMostraForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa spesa?')) return
    try {
      await speseGestioneAPI.delete(id)
      await caricaSpese()
    } catch {
      setErrore('Errore nell\'eliminazione della spesa.')
    }
  }

  const totale = spese.reduce((s, sp) => s + parseFloat(sp.importo || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          Spese di Gestione
        </h2>
        <button
          className="btn-primary"
          onClick={() => { setForm(formVuoto); setEditId(null); setMostraForm((v) => !v) }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuova Spesa
        </button>
      </div>

      {errore && <div className="error-banner">{errore}</div>}

      {mostraForm && (
        <div className="card mb-6" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 className="section-title-sm">{editId ? 'Modifica Spesa' : 'Nuova Spesa'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label className="form-label">Descrizione *</label>
                <input className="form-input" name="descrizione" value={form.descrizione} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Importo (€) *</label>
                <input className="form-input" name="importo" type="number" step="0.01" min="0" value={form.importo} onChange={handleChange} required />
              </div>
              <div>
                <label className="form-label">Categoria</label>
                <input className="form-input" name="categoria" value={form.categoria} onChange={handleChange} placeholder="es. Affitto, Utenze..." />
              </div>
              <div>
                <label className="form-label">Data</label>
                <input className="form-input" name="data" type="date" value={form.data} onChange={handleChange} />
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="ricorrente" name="ricorrente" checked={form.ricorrente} onChange={handleChange} />
              <label htmlFor="ricorrente" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Spesa ricorrente (mensile)</label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setMostraForm(false)}>Annulla</button>
              <button type="submit" className="btn-primary">{editId ? 'Salva Modifiche' : 'Aggiungi Spesa'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Totale */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Totale spese</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>€{totale.toFixed(2)}</div>
        </div>
      </div>

      {/* Tabella */}
      <div className="card">
        {loading ? (
          <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>Caricamento...</p>
        ) : spese.length === 0 ? (
          <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>Nessuna spesa registrata.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Importo</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Ricorrente</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {spese.map((sp) => (
                  <tr key={sp.id}>
                    <td className="text-bold">{sp.descrizione}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: '600' }}>€{parseFloat(sp.importo).toFixed(2)}</td>
                    <td>{sp.categoria || '—'}</td>
                    <td>{sp.data ? new Date(sp.data).toLocaleDateString('it-IT') : '—'}</td>
                    <td>
                      {sp.ricorrente ? (
                        <span className="badge badge-success">Si</span>
                      ) : (
                        <span className="badge badge-gray">No</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-icon-blue" onClick={() => handleEdit(sp)} title="Modifica">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon btn-icon-red" onClick={() => handleDelete(sp.id)} title="Elimina">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Tab Storico
function TabStorico() {
  const currentYear = new Date().getFullYear()
  const [anni, setAnni] = useState([])
  const [mensile, setMensile] = useState([])
  const [anno, setAnno] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState(null)
  const isMobile = useIsMobile()

  const MESI_NOMI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
  const fmtEur = (v) => v != null ? `€${Number(v).toFixed(2)}` : '—'

  useEffect(() => {
    const caricaDati = async () => {
      setLoading(true)
      try {
        const [resAnnuale, resMensile] = await Promise.all([
          analisiAPI.getAnnuale(),
          analisiAPI.getMensile(anno),
        ])
        setAnni(resAnnuale.data)
        setMensile(resMensile.data)
      } catch {
        setErrore('Errore nel caricamento dei dati storici.')
      } finally {
        setLoading(false)
      }
    }
    caricaDati()
  }, [anno])

  if (loading) return <p className="text-muted">Caricamento...</p>
  if (errore) return <div className="error-banner">{errore}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Monthly history */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            📅 Storico Mensile
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setAnno(currentYear)}
              className={anno === currentYear ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8125rem' }}
            >
              Anno corrente
            </button>
            <button
              onClick={() => setAnno(currentYear - 1)}
              className={anno === currentYear - 1 ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.8125rem' }}
            >
              Anno precedente
            </button>
            <select
              value={anno}
              onChange={(e) => setAnno(Number(e.target.value))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            >
              {Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {mensile && mensile.length > 0 ? (
          isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mensile.map((m) => {
                const margine = (m.ricavi || 0) - (m.costi || 0) - (m.totale_spese || 0)
                return (
                  <div key={m.mese} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', marginBottom: '10px' }}>
                      {MESI_NOMI[m.mese - 1] || m.mese} {anno}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Ricavi</div>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{fmtEur(m.ricavi)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Costi</div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmtEur(m.costi)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Spese</div>
                        <div style={{ fontWeight: 600, color: 'var(--warning)' }}>{fmtEur(m.totale_spese)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Margine</div>
                        <div style={{ fontWeight: 700, color: margine >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtEur(margine)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th style={{ textAlign: 'right' }}>Ricavi</th>
                    <th style={{ textAlign: 'right' }}>Costi</th>
                    <th style={{ textAlign: 'right' }}>Spese</th>
                    <th style={{ textAlign: 'right' }}>Margine</th>
                  </tr>
                </thead>
                <tbody>
                  {mensile.map((m) => {
                    const margine = (m.ricavi || 0) - (m.costi || 0) - (m.totale_spese || 0)
                    return (
                      <tr key={m.mese}>
                        <td className="text-bold">{MESI_NOMI[m.mese - 1] || m.mese}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmtEur(m.ricavi)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmtEur(m.costi)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--warning)' }}>{fmtEur(m.totale_spese)}</td>
                        <td style={{ textAlign: 'right', color: margine >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                          {margine >= 0 ? '+' : ''}{fmtEur(margine)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="text-muted">Nessun dato disponibile per l&apos;anno selezionato.</p>
        )}
      </div>

      {/* Annual history */}
      {anni.length > 0 && (
        <div className="card">
          <h3 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18 17l-5-5-4 4-5-5" />
            </svg>
            📆 Storico Annuale
          </h3>

          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {anni.map((a) => {
                const margine = (a.ricavi || 0) - (a.costi || 0) - (a.spese || 0) - (a.packaging || 0)
                return (
                  <div key={a.anno} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '10px',
                    padding: '16px',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '12px' }}>
                      {a.anno}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Ricavi</div>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>€{(a.ricavi || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Costi</div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)' }}>€{(a.costi || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Spese</div>
                        <div style={{ fontWeight: 600, color: 'var(--warning)' }}>€{((a.spese || 0) + (a.packaging || 0)).toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Margine</div>
                        <div style={{ fontWeight: 700, color: margine >= 0 ? 'var(--success)' : 'var(--danger)' }}>€{margine.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Marginalità %</div>
                        <div style={{ fontWeight: 700, color: (a.marginalita_percentuale ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {a.marginalita_percentuale !== null && a.marginalita_percentuale !== undefined
                            ? `${a.marginalita_percentuale.toFixed(1)}%`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Anno</th>
                    <th>Costi</th>
                    <th>Ricavi</th>
                    <th>Spese</th>
                    <th>Margine</th>
                    <th>Marginalità %</th>
                  </tr>
                </thead>
                <tbody>
                  {anni.map((a) => {
                    const margine = (a.ricavi || 0) - (a.costi || 0) - (a.spese || 0) - (a.packaging || 0)
                    return (
                      <tr key={a.anno}>
                        <td className="text-bold">{a.anno}</td>
                        <td style={{ color: 'var(--danger)' }}>€{(a.costi || 0).toFixed(2)}</td>
                        <td style={{ color: 'var(--success)' }}>€{(a.ricavi || 0).toFixed(2)}</td>
                        <td style={{ color: 'var(--warning)' }}>€{((a.spese || 0) + (a.packaging || 0)).toFixed(2)}</td>
                        <td style={{ color: margine >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: '700' }}>
                          €{margine.toFixed(2)}
                        </td>
                        <td style={{
                          color: (a.marginalita_percentuale ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                          fontWeight: '700'
                        }}>
                          {a.marginalita_percentuale !== null && a.marginalita_percentuale !== undefined
                            ? `${a.marginalita_percentuale.toFixed(1)}%`
                            : 'N/A'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Main Component
export default function Analisi() {
  const [tab, setTab] = useState('grafici')

  const tabs = [
    { key: 'grafici', label: 'Grafici', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6" /></svg> },
    { key: 'spese', label: 'Spese', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> },
    { key: 'storico', label: 'Storico', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 17l-5-5-4 4-5-5" /></svg> },
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="page-title-section">
          <div className="page-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          </div>
          <div>
            <h1 className="page-title">Analisi</h1>
            <p className="page-subtitle">Analisi finanziaria e report</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: tab === t.key ? '600' : '500',
              color: tab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'grafici' && <TabGrafici />}
      {tab === 'spese' && <TabSpese />}
      {tab === 'storico' && <TabStorico />}
    </div>
  )
}
