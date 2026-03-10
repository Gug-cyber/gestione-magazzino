import { useState, useEffect } from 'react'
import { speseGestioneAPI, analisiAPI } from '../api/client'

// ─── Stili comuni ────────────────────────────────────────────────────────────

const cardStyle = {
  backgroundColor: 'white',
  borderRadius: '8px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  marginBottom: '24px',
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '0.95rem',
  width: '100%',
  boxSizing: 'border-box',
}

const btnPrimaryStyle = {
  backgroundColor: '#1a237e',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
}

const btnDangerStyle = {
  backgroundColor: '#d32f2f',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '0.85rem',
}

const btnSecondaryStyle = {
  backgroundColor: '#546e7a',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '0.85rem',
}

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  color: '#555',
  fontWeight: '600',
  borderBottom: '2px solid #eee',
}

const tdStyle = {
  padding: '10px 12px',
  color: '#333',
  borderBottom: '1px solid #eee',
}

// ─── Tab 1: Grafici ──────────────────────────────────────────────────────────

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function BarChart({ data, labelKey, title }) {
  if (!data || data.length === 0) {
    return <p style={{ color: '#888' }}>Nessun dato disponibile.</p>
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.costi || 0, d.ricavi || 0, d.spese || 0)),
    1
  )

  const series = [
    { key: 'costi', label: 'Costi', color: '#e53935' },
    { key: 'ricavi', label: 'Ricavi', color: '#43a047' },
    { key: 'spese', label: 'Spese gestione', color: '#fb8c00' },
  ]

  return (
    <div>
      <h3 style={{ marginBottom: '12px', color: '#333' }}>{title}</h3>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        {series.map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: s.color, borderRadius: '3px' }} />
            <span style={{ fontSize: '0.85rem', color: '#555' }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* Grafico */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', minWidth: `${data.length * 72}px`, height: '220px', paddingBottom: '24px', position: 'relative' }}>
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
                        width: '12px',
                        height: `${heightPct}%`,
                        minHeight: val > 0 ? '2px' : '0',
                        backgroundColor: s.color,
                        borderRadius: '2px 2px 0 0',
                        transition: 'height 0.3s',
                      }}
                    />
                  )
                })}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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

function TabGrafici() {
  const [vista, setVista] = useState('mensile')
  const [anno, setAnno] = useState(new Date().getFullYear())
  const [datiMensili, setDatiMensili] = useState([])
  const [datiAnnuali, setDatiAnnuali] = useState([])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    const caricaDati = async () => {
      setLoading(true)
      setErrore(null)
      try {
        const [mensileRes, annualeRes] = await Promise.all([
          analisiAPI.getMensile(anno),
          analisiAPI.getAnnuale(),
        ])
        setDatiMensili(mensileRes.data)
        setDatiAnnuali(annualeRes.data)
      } catch (err) {
        setErrore('Errore nel caricamento dei dati di analisi.')
      } finally {
        setLoading(false)
      }
    }
    caricaDati()
  }, [anno])

  const datiCorrente = vista === 'mensile' ? datiMensili : datiAnnuali
  const totCosti = datiCorrente.reduce((s, d) => s + (d.costi || 0), 0)
  const totRicavi = datiCorrente.reduce((s, d) => s + (d.ricavi || 0), 0)
  const totSpese = datiCorrente.reduce((s, d) => s + (d.spese || 0), 0)
  const margine = totRicavi - totCosti - totSpese

  return (
    <div>
      {/* Selettori */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['mensile', 'annuale'].map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              style={{
                ...btnPrimaryStyle,
                backgroundColor: vista === v ? '#1a237e' : '#90a4ae',
              }}
            >
              {v === 'mensile' ? '📅 Mensile' : '📆 Annuale'}
            </button>
          ))}
        </div>
        {vista === 'mensile' && (
          <select
            value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            style={{ ...inputStyle, width: 'auto' }}
          >
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {loading && <p>Caricamento...</p>}
      {errore && <p style={{ color: '#d32f2f' }}>{errore}</p>}

      {!loading && (
        <>
          <div style={cardStyle}>
            <BarChart
              data={datiCorrente}
              labelKey={vista === 'mensile' ? 'mese' : 'anno'}
              title={vista === 'mensile' ? `Andamento mensile ${anno}` : 'Andamento annuale'}
            />
          </div>

          {/* Riepilogo testuale */}
          <div style={{ ...cardStyle, display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Totale Costi', value: totCosti, color: '#e53935' },
              { label: 'Totale Ricavi', value: totRicavi, color: '#43a047' },
              { label: 'Totale Spese', value: totSpese, color: '#fb8c00' },
              { label: 'Margine', value: margine, color: margine >= 0 ? '#1a237e' : '#d32f2f' },
            ].map((item) => (
              <div key={item.label} style={{ flex: 1, minWidth: '140px', textAlign: 'center', padding: '12px', borderRadius: '8px', backgroundColor: '#f5f5f5' }}>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: item.color }}>
                  €{item.value.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab 2: Spese di Gestione ────────────────────────────────────────────────

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#1a237e' }}>💸 Spese di Gestione</h2>
        <button
          style={btnPrimaryStyle}
          onClick={() => { setForm(formVuoto); setEditId(null); setMostraForm((v) => !v) }}
        >
          ➕ Nuova Spesa
        </button>
      </div>

      {errore && <p style={{ color: '#d32f2f', marginBottom: '12px' }}>{errore}</p>}

      {mostraForm && (
        <div style={{ ...cardStyle, borderLeft: '4px solid #1a237e' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>{editId ? 'Modifica Spesa' : 'Nuova Spesa'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Descrizione *</label>
                <input style={inputStyle} name="descrizione" value={form.descrizione} onChange={handleChange} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Importo (€) *</label>
                <input style={inputStyle} name="importo" type="number" step="0.01" min="0" value={form.importo} onChange={handleChange} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Categoria</label>
                <input style={inputStyle} name="categoria" value={form.categoria} onChange={handleChange} placeholder="es. Affitto, Utenze..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Data</label>
                <input style={inputStyle} name="data" type="date" value={form.data} onChange={handleChange} />
              </div>
            </div>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" name="ricorrente" id="ricorrente" checked={form.ricorrente} onChange={handleChange} />
              <label htmlFor="ricorrente" style={{ fontSize: '0.9rem', color: '#555' }}>Spesa ricorrente (mensile)</label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnPrimaryStyle}>💾 Salva</button>
              <button type="button" style={btnSecondaryStyle} onClick={() => { setMostraForm(false); setEditId(null); setForm(formVuoto) }}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Caricamento...</p>
      ) : (
        <div style={cardStyle}>
          {spese.length === 0 ? (
            <p style={{ color: '#888' }}>Nessuna spesa registrata.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Descrizione</th>
                  <th style={thStyle}>Importo</th>
                  <th style={thStyle}>Categoria</th>
                  <th style={thStyle}>Ricorrente</th>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {spese.map((sp) => (
                  <tr key={sp.id}>
                    <td style={tdStyle}>{sp.descrizione}</td>
                    <td style={tdStyle}>€{parseFloat(sp.importo).toFixed(2)}</td>
                    <td style={tdStyle}>{sp.categoria || '—'}</td>
                    <td style={tdStyle}>{sp.ricorrente ? '✓' : '✗'}</td>
                    <td style={tdStyle}>{sp.data ? new Date(sp.data).toLocaleDateString('it-IT') : '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={btnSecondaryStyle} onClick={() => handleEdit(sp)}>✏️</button>
                        <button style={btnDangerStyle} onClick={() => handleDelete(sp.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 'bold', paddingTop: '12px' }}>Totale</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#d32f2f', paddingTop: '12px' }}>€{totale.toFixed(2)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: Calcolatore Packaging ────────────────────────────────────────────

const TIPI_PACKAGING = [
  'Scatola piccola',
  'Scatola media',
  'Scatola grande',
  'Busta',
  'Tubo',
  'Personalizzato',
]

const calcolatoreVuoto = {
  tipo: 'Scatola piccola',
  costoMateriale: '',
  quantita: '',
  costoManodopera: '',
  costoSpedizione: '',
  marginePercent: '',
}

function TabPackaging() {
  const [form, setForm] = useState(calcolatoreVuoto)
  const [nomePreset, setNomePreset] = useState('')
  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('packagingPresets') || '{}')
    } catch {
      return {}
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const costoMat = parseFloat(form.costoMateriale) || 0
  const qty = parseInt(form.quantita) || 0
  const costoMan = parseFloat(form.costoManodopera) || 0
  const costoSped = parseFloat(form.costoSpedizione) || 0
  const margine = parseFloat(form.marginePercent) || 0

  const costoPackagingTotale = costoMat * qty
  const costoPerPezzo = qty > 0 ? costoMat : 0
  const costoTotaleManodopera = costoPackagingTotale + costoMan * qty
  const costoTotaleSpedizione = costoTotaleManodopera + costoSped * qty
  const prezzoVendita = costoTotaleSpedizione * (1 + margine / 100)

  const salvaPreset = () => {
    if (!nomePreset.trim()) return
    const nuovi = { ...presets, [nomePreset.trim()]: form }
    setPresets(nuovi)
    localStorage.setItem('packagingPresets', JSON.stringify(nuovi))
    setNomePreset('')
  }

  const caricaPreset = (nome) => {
    setForm(presets[nome])
  }

  const eliminaPreset = (nome) => {
    const nuovi = { ...presets }
    delete nuovi[nome]
    setPresets(nuovi)
    localStorage.setItem('packagingPresets', JSON.stringify(nuovi))
  }

  const risultatoStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }

  const rigaRisultatoStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
        {/* Form parametri */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#1a237e' }}>📦 Parametri</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Tipo packaging</label>
              <select style={inputStyle} name="tipo" value={form.tipo} onChange={handleChange}>
                {TIPI_PACKAGING.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Costo unitario materiale (€)</label>
              <input style={inputStyle} name="costoMateriale" type="number" step="0.01" min="0" value={form.costoMateriale} onChange={handleChange} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Quantità pezzi da imballare</label>
              <input style={inputStyle} name="quantita" type="number" min="0" step="1" value={form.quantita} onChange={handleChange} placeholder="0" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Costo manodopera per pezzo (€)</label>
              <input style={inputStyle} name="costoManodopera" type="number" step="0.01" min="0" value={form.costoManodopera} onChange={handleChange} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Costo spedizione per pezzo (€)</label>
              <input style={inputStyle} name="costoSpedizione" type="number" step="0.01" min="0" value={form.costoSpedizione} onChange={handleChange} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#555' }}>Margine aggiuntivo (%)</label>
              <input style={inputStyle} name="marginePercent" type="number" step="0.1" min="0" value={form.marginePercent} onChange={handleChange} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Risultati */}
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#1a237e' }}>📊 Risultati</h3>
          <div style={risultatoStyle}>
            <div style={rigaRisultatoStyle}>
              <span style={{ color: '#555' }}>Costo packaging totale</span>
              <strong>€{costoPackagingTotale.toFixed(2)}</strong>
            </div>
            <div style={rigaRisultatoStyle}>
              <span style={{ color: '#555' }}>Costo materiale per pezzo</span>
              <strong>€{costoPerPezzo.toFixed(2)}</strong>
            </div>
            <div style={rigaRisultatoStyle}>
              <span style={{ color: '#555' }}>Costo totale con manodopera</span>
              <strong>€{costoTotaleManodopera.toFixed(2)}</strong>
            </div>
            <div style={rigaRisultatoStyle}>
              <span style={{ color: '#555' }}>Costo totale con spedizione</span>
              <strong>€{costoTotaleSpedizione.toFixed(2)}</strong>
            </div>
            <div style={{ ...rigaRisultatoStyle, backgroundColor: '#e8f5e9' }}>
              <span style={{ color: '#2e7d32', fontWeight: 600 }}>Prezzo di vendita consigliato</span>
              <strong style={{ color: '#2e7d32', fontSize: '1.1rem' }}>€{prezzoVendita.toFixed(2)}</strong>
            </div>
          </div>

          {/* Salva preset */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 8px', color: '#333' }}>💾 Salva preset</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Nome preset"
                value={nomePreset}
                onChange={(e) => setNomePreset(e.target.value)}
              />
              <button style={btnPrimaryStyle} onClick={salvaPreset}>Salva</button>
            </div>
          </div>
        </div>
      </div>

      {/* Preset salvati */}
      {Object.keys(presets).length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: '#1a237e' }}>📋 Preset salvati</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(presets).map(([nome]) => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#e3f2fd', borderRadius: '20px' }}>
                <span style={{ fontSize: '0.9rem', color: '#1565c0' }}>{nome}</span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1565c0', fontSize: '0.85rem', padding: '0 4px' }}
                  onClick={() => caricaPreset(nome)}
                  title="Carica preset"
                >
                  ↩️
                </button>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: '0.85rem', padding: '0 4px' }}
                  onClick={() => eliminaPreset(nome)}
                  title="Elimina preset"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principale Analisi ──────────────────────────────────────────

const TABS = [
  { id: 'grafici', label: '📈 Grafici' },
  { id: 'spese', label: '💸 Spese di Gestione' },
  { id: 'packaging', label: '📦 Calcolatore Packaging' },
]

function Analisi() {
  const [tabAttiva, setTabAttiva] = useState('grafici')

  return (
    <div>
      <h1 style={{ marginBottom: '24px', color: '#1a237e' }}>📈 Analisi Finanziaria</h1>

      {/* Tab header */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '24px', gap: '4px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabAttiva(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tabAttiva === tab.id ? '2px solid #1a237e' : '2px solid transparent',
              marginBottom: '-2px',
              backgroundColor: 'transparent',
              color: tabAttiva === tab.id ? '#1a237e' : '#666',
              fontWeight: tabAttiva === tab.id ? 700 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabAttiva === 'grafici' && <TabGrafici />}
      {tabAttiva === 'spese' && <TabSpese />}
      {tabAttiva === 'packaging' && <TabPackaging />}
    </div>
  )
}

export default Analisi
