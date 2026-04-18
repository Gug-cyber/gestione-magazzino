import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fornitoriAPI, fornitureAPI, prodottiAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import CreazioneRapidaProdotto from '../components/CreazioneRapidaProdotto'
import useExternalScanner from '../hooks/useExternalScanner'

// ─── Shared styles ───────────────────────────────────────────────────────────

const cardStyle = {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 'clamp(16px, 4vw, 24px)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  marginBottom: 20,
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  border: '1.5px solid #e0e4ef',
  borderRadius: 8,
  fontSize: 16,
  outline: 'none',
  minHeight: 48,
  backgroundColor: 'white',
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 14,
}

const labelText = {
  fontSize: '0.85rem',
  color: '#555',
  fontWeight: 600,
}

const btnPrimary = (disabled = false) => ({
  width: '100%',
  minHeight: 52,
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 10,
  border: 'none',
  background: disabled ? '#ccc' : '#1a237e',
  color: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  marginTop: 4,
})

const btnGreen = (disabled = false) => ({
  minHeight: 52,
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 10,
  border: 'none',
  background: disabled ? '#ccc' : '#2e7d32',
  color: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  padding: '0 20px',
})

const btnSmall = (bg = '#1a237e') => ({
  minHeight: 44,
  minWidth: 44,
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 8,
  border: 'none',
  background: bg,
  color: 'white',
  cursor: 'pointer',
  padding: '0 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

// ─── Step 1: Selezione fornitore ─────────────────────────────────────────────

function StepFornitore({ onNext }) {
  const [fornitori, setFornitori] = useState([])
  const [loading, setLoading] = useState(true)
  const [fornitoreId, setFornitoreId] = useState('')
  const [fornitoreNome, setFornitoreNome] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    fornitoriAPI.getAll()
      .then(r => setFornitori(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleFornitoreChange = (id) => {
    setFornitoreId(id)
    if (id) {
      const f = fornitori.find(f => String(f.id) === String(id))
      setFornitoreNome(f ? f.nome : '')
    } else {
      setFornitoreNome('')
    }
  }

  const canProceed = fornitoreNome.trim().length > 0

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: '2.5rem' }}>📦</div>
        <h1 style={{ color: '#1a237e', margin: '8px 0 4px', fontSize: 'clamp(1.2rem, 4vw, 1.6rem)' }}>
          Carico Fornitura
        </h1>
        <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Passo 1 di 2 — Seleziona fornitore</p>
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>
          <span style={labelText}>Fornitore</span>
          {loading ? (
            <div style={{ color: '#888', fontSize: '0.9rem' }}>⏳ Caricamento fornitori…</div>
          ) : (
            <select
              style={inputStyle}
              value={fornitoreId}
              onChange={e => handleFornitoreChange(e.target.value)}
            >
              <option value="">— Seleziona un fornitore —</option>
              {fornitori.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          )}
        </label>

        <label style={labelStyle}>
          <span style={labelText}>
            {fornitoreId ? 'Nome fornitore (modificabile)' : 'Oppure inserisci nome manualmente'}
          </span>
          <input
            style={inputStyle}
            placeholder="Es. Mario Rossi Srl"
            value={fornitoreNome}
            onChange={e => setFornitoreNome(e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Note (opzionale)</span>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical', padding: '12px 14px' }}
            placeholder="Note sulla fornitura…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </label>

        <button
          style={btnPrimary(!canProceed)}
          disabled={!canProceed}
          onClick={() => onNext({ fornitoreId: fornitoreId || null, fornitoreNome: fornitoreNome.trim(), note })}
        >
          Avvia Carico →
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Scansione prodotti ───────────────────────────────────────────────

function StepScansione({ fornitoreNome, onBack, onConferma }) {
  const [righe, setRighe] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanStatus, setScanStatus] = useState(null) // null | { ok: true, nome } | { ok: false }
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState('')
  const [showConfermaModal, setShowConfermaModal] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const statusTimerRef = useRef(null)

  useEffect(() => () => { if (statusTimerRef.current) clearTimeout(statusTimerRef.current) }, [])

  const showScanFeedback = (status) => {
    setScanStatus(status)
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => setScanStatus(null), 3000)
  }

  const addOrIncrementProdotto = (prodotto) => {
    setRighe(prev => {
      const idx = prev.findIndex(r => r.prodotto_id === prodotto.id)
      if (idx >= 0) {
        return prev.map((r, i) => i === idx ? { ...r, quantita: r.quantita + 1 } : r)
      }
      return [...prev, {
        prodotto_id: prodotto.id,
        nome: prodotto.nome,
        sku: prodotto.sku || prodotto.barcode || '',
        quantita: 1,
        prezzo_unitario: prodotto.prezzo_acquisto ?? '',
      }]
    })
    showScanFeedback({ ok: true, nome: prodotto.nome })
  }

  const handleScan = async (value) => {
    setShowScanner(false)
    await lookupAndAdd(value)
  }

  const lookupAndAdd = async (value) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setLookingUp(true)
    setScanStatus(null)

    try {
      // QR format "prodotto:ID" → direct lookup by ID
      if (trimmed.startsWith('prodotto:')) {
        const id = trimmed.slice('prodotto:'.length)
        const res = await prodottiAPI.getById(id)
        addOrIncrementProdotto(res.data)
        return
      }

      // Lookup by barcode/SKU
      const res = await prodottiAPI.lookupByBarcode(trimmed)
      addOrIncrementProdotto(res.data)
    } catch (err) {
      if (err.response?.status === 404) {
        setPendingBarcode(trimmed)
        setShowCreateModal(true)
      } else {
        showScanFeedback({ ok: false, message: 'Errore di ricerca. Riprova.' })
      }
    } finally {
      setLookingUp(false)
    }
  }

  const handleManualSearch = () => {
    if (barcodeInput.trim()) {
      lookupAndAdd(barcodeInput.trim())
      setBarcodeInput('')
    }
  }

  const handleProductCreated = (prodotto) => {
    setShowCreateModal(false)
    addOrIncrementProdotto(prodotto)
  }

  const updateQuantita = (idx, delta) => {
    setRighe(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const nuova = r.quantita + delta
      return nuova > 0 ? { ...r, quantita: nuova } : r
    }))
  }

  const setQuantita = (idx, val) => {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 1) {
      // Reset to previous valid value
      setRighe(prev => [...prev])
      return
    }
    setRighe(prev => prev.map((r, i) => i === idx ? { ...r, quantita: n } : r))
  }

  const removeRiga = (idx) => {
    setRighe(prev => prev.filter((_, i) => i !== idx))
  }

  const totalePezzi = righe.reduce((s, r) => s + r.quantita, 0)

  useExternalScanner({
    onScan: (value) => {
      if (!showScanner && !lookingUp) {
        lookupAndAdd(value)
      }
    },
    enabled: !showScanner && !lookingUp,
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        backgroundColor: '#1a237e',
        padding: '10px clamp(12px, 3vw, 20px)',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
            borderRadius: 8, minHeight: 44, minWidth: 44, fontSize: 16,
            cursor: 'pointer', fontWeight: 700, padding: '0 12px',
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fornitoreNome}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>
            Passo 2 di 2 — Scansione
          </div>
        </div>
        <button
          onClick={() => righe.length > 0 && setShowConfermaModal(true)}
          disabled={righe.length === 0}
          style={{
            background: righe.length > 0 ? '#2e7d32' : 'rgba(255,255,255,0.15)',
            border: 'none', color: 'white', borderRadius: 8,
            minHeight: 44, fontSize: 15, cursor: righe.length > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 700, padding: '0 14px', whiteSpace: 'nowrap',
          }}
        >
          ✅ Conferma ({righe.length})
        </button>
      </div>

      <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
        {/* Scanner area */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h3 style={{ color: '#1a237e', margin: '0 0 14px', fontSize: '1rem' }}>📷 Scansione prodotto</h3>

          <button
            onClick={() => setShowScanner(true)}
            style={{
              width: '100%', minHeight: 60, fontSize: 18, fontWeight: 700,
              borderRadius: 10, border: 'none', background: '#1a237e', color: 'white',
              cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10,
            }}
          >
            📷 Scansiona
          </button>

          {/* Manual input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Inserisci barcode manualmente"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
            />
            <button
              onClick={handleManualSearch}
              disabled={!barcodeInput.trim() || lookingUp}
              style={{
                ...btnSmall('#1565c0'),
                minWidth: 80,
                opacity: !barcodeInput.trim() || lookingUp ? 0.5 : 1,
              }}
            >
              {lookingUp ? '⏳' : 'Cerca'}
            </button>
          </div>

          {/* Scan status feedback */}
          {lookingUp && (
            <div style={{ marginTop: 10, padding: '10px 14px', backgroundColor: '#e3f2fd', borderRadius: 8, fontSize: '0.9rem', color: '#1565c0' }}>
              ⏳ Ricerca in corso…
            </div>
          )}
          {!lookingUp && scanStatus && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
              backgroundColor: scanStatus.ok ? '#e8f5e9' : '#ffebee',
              color: scanStatus.ok ? '#2e7d32' : '#c62828',
            }}>
              {scanStatus.ok
                ? `✅ Aggiunto: ${scanStatus.nome}`
                : `❌ ${scanStatus.message || 'Prodotto non trovato'}`}
            </div>
          )}
          {!lookingUp && !scanStatus && (
            <div style={{ marginTop: 10, padding: '10px 14px', backgroundColor: '#e8f5e9', borderRadius: 8, fontSize: '0.85rem', color: '#2e7d32', fontWeight: 600 }}>
              <span style={{ marginRight: 6 }}>●</span>
              🔌 Scanner hardware attivo — oppure scansiona con webcam
            </div>
          )}
        </div>

        {/* Product list */}
        <div style={cardStyle}>
          <h3 style={{ color: '#1a237e', margin: '0 0 14px', fontSize: '1rem' }}>
            📋 Prodotti caricati {righe.length > 0 && <span style={{ color: '#666', fontWeight: 400 }}>({totalePezzi} pezzi)</span>}
          </h3>

          {righe.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: '#aaa' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
              <div>Nessun prodotto ancora scansionato</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {righe.map((r, idx) => (
                <div key={idx} style={{
                  backgroundColor: '#f8f9ff',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a237e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.nome}
                    </div>
                    {r.sku && <div style={{ fontSize: '0.78rem', color: '#888' }}>{r.sku}</div>}
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => updateQuantita(idx, -1)}
                      style={{ ...btnSmall('#455a64'), minWidth: 44, minHeight: 44 }}
                    >−</button>
                    <input
                      type="number"
                      min="1"
                      value={r.quantita}
                      onChange={e => setQuantita(idx, e.target.value)}
                      style={{
                        width: 52, textAlign: 'center', fontSize: 16, fontWeight: 700,
                        border: '1.5px solid #e0e4ef', borderRadius: 8, padding: '8px 4px',
                        minHeight: 44,
                      }}
                    />
                    <button
                      onClick={() => updateQuantita(idx, +1)}
                      style={{ ...btnSmall('#2e7d32'), minWidth: 44, minHeight: 44 }}
                    >+</button>
                  </div>

                  <button
                    onClick={() => removeRiga(idx)}
                    style={{ ...btnSmall('#c62828'), minWidth: 44, minHeight: 44, flexShrink: 0 }}
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {righe.length > 0 && (
          <button
            style={{ ...btnGreen(), width: '100%' }}
            onClick={() => setShowConfermaModal(true)}
          >
            ✅ Conferma Carico ({righe.length} prod., {totalePezzi} pz)
          </button>
        )}
      </div>

      {/* BarcodeScanner overlay */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* CreazioneRapidaProdotto modal */}
      {showCreateModal && (
        <CreazioneRapidaProdotto
          barcode={pendingBarcode}
          onSuccess={handleProductCreated}
          onClose={() => { setShowCreateModal(false); showScanFeedback({ ok: false, message: 'Creazione annullata.' }) }}
        />
      )}

      {/* Conferma modal */}
      {showConfermaModal && (
        <ModalConferma
          righe={righe}
          totalePezzi={totalePezzi}
          onClose={() => setShowConfermaModal(false)}
          onConferma={(noteFinali) => {
            setShowConfermaModal(false)
            onConferma(righe, noteFinali)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal conferma ───────────────────────────────────────────────────────────

function ModalConferma({ righe, totalePezzi, onClose, onConferma }) {
  const [note, setNote] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 1500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        backgroundColor: 'white', borderRadius: '16px 16px 0 0',
        padding: 'clamp(16px, 4vw, 28px)', width: '100%', maxWidth: 560,
        maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box',
      }}>
        <h2 style={{ color: '#1a237e', margin: '0 0 16px', fontSize: '1.15rem' }}>
          📦 Conferma Carico
        </h2>

        <div style={{ backgroundColor: '#e8eaf6', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: 4 }}>
            <strong>{righe.length}</strong> prodotti · <strong>{totalePezzi}</strong> pezzi totali
          </div>
          {righe.map((r, i) => (
            <div key={i} style={{ fontSize: '0.85rem', color: '#555', padding: '2px 0' }}>
              • {r.nome} × {r.quantita}
            </div>
          ))}
        </div>

        <label style={{ ...labelStyle, marginBottom: 16 }}>
          <span style={labelText}>Note finali (opzionale)</span>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical', padding: '12px 14px' }}
            placeholder="Note aggiuntive per questa fornitura…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, minHeight: 52, fontSize: 16, borderRadius: 10,
            border: '1.5px solid #ccc', background: 'white', color: '#555',
            cursor: 'pointer', fontWeight: 600,
          }}>
            Annulla
          </button>
          <button onClick={() => onConferma(note)} style={{
            flex: 2, minHeight: 52, fontSize: 16, borderRadius: 10,
            border: 'none', background: '#2e7d32', color: 'white',
            cursor: 'pointer', fontWeight: 700,
          }}>
            📦 Conferma Carico
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Esito ────────────────────────────────────────────────────────────

function StepEsito({ risultato, onNuovoCarico }) {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 12 }}>✅</div>
      <h1 style={{ color: '#2e7d32', margin: '0 0 8px', fontSize: 'clamp(1.2rem, 4vw, 1.6rem)' }}>
        Carico Confermato!
      </h1>
      <p style={{ color: '#555', marginBottom: 24, fontSize: '0.95rem' }}>
        La fornitura è stata creata e lo stock aggiornato.
      </p>

      <div style={{
        backgroundColor: '#e8f5e9', borderRadius: 12, padding: 20,
        marginBottom: 28, textAlign: 'left',
      }}>
        <div style={{ fontWeight: 700, color: '#1b5e20', marginBottom: 8, fontSize: '0.95rem' }}>
          📋 Riepilogo fornitura #{risultato.id}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#2e7d32' }}>
          • <strong>{risultato.nProdotti}</strong> prodotti caricati
        </div>
        <div style={{ fontSize: '0.9rem', color: '#2e7d32' }}>
          • <strong>{risultato.nPezzi}</strong> pezzi totali
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => navigate(`/forniture/${risultato.id}`)}
          style={{ ...btnPrimary(), margin: 0 }}
        >
          Visualizza Fornitura
        </button>
        <button
          onClick={onNuovoCarico}
          style={{
            width: '100%', minHeight: 52, fontSize: 16, fontWeight: 700,
            borderRadius: 10, border: '2px solid #1a237e', background: 'white',
            color: '#1a237e', cursor: 'pointer',
          }}
        >
          + Nuovo Carico
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CaricoFornitura() {
  const [step, setStep] = useState(1) // 1 | 2 | 3
  const [fornitureData, setFornitureData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [risultato, setRisultato] = useState(null)

  const handleFornitoreNext = (data) => {
    setFornitureData(data)
    setStep(2)
  }

  const handleConferma = async (righe, noteFinali) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      // 1. Crea la fornitura
      const payload = {
        fornitore_id: fornitureData.fornitoreId || null,
        fornitore_nome: fornitureData.fornitoreNome,
        note: [fornitureData.note, noteFinali].filter(Boolean).join('\n') || null,
        righe: righe.map(r => ({
          tipo_voce: 'prodotto',
          prodotto_id: r.prodotto_id,
          quantita: r.quantita,
          prezzo_unitario: parseFloat(r.prezzo_unitario) || 0,
        })),
      }
      const res = await fornitureAPI.create(payload)
      const fornituraId = res.data.id

      // 2. Aggiorna stato → "ricevuto" per innescare il carico automatico stock
      await fornitureAPI.update(fornituraId, { stato: 'ricevuto' })

      const nPezzi = righe.reduce((s, r) => s + r.quantita, 0)
      setRisultato({ id: fornituraId, nProdotti: righe.length, nPezzi })
      setStep(3)
    } catch (err) {
      const msg = err.response?.data?.detail
      if (Array.isArray(msg)) {
        setSubmitError(msg.map(e => e.msg || JSON.stringify(e)).join(', '))
      } else {
        setSubmitError(msg || 'Errore durante il salvataggio della fornitura.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep(1)
    setFornitureData(null)
    setRisultato(null)
    setSubmitError('')
  }

  if (submitting) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</div>
        <h2 style={{ color: '#1a237e' }}>Salvataggio in corso…</h2>
        <p style={{ color: '#666' }}>Aggiornamento stock e registrazione movimenti</p>
      </div>
    )
  }

  if (submitError) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
        <div style={{
          backgroundColor: '#ffebee', color: '#c62828', borderRadius: 12,
          padding: 20, marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>❌</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Errore durante il salvataggio</div>
          <div style={{ fontSize: '0.9rem' }}>{submitError}</div>
        </div>
        <button onClick={() => setSubmitError('')} style={btnPrimary()}>
          ← Riprova
        </button>
      </div>
    )
  }

  if (step === 3 && risultato) {
    return <StepEsito risultato={risultato} onNuovoCarico={reset} />
  }

  if (step === 2 && fornitureData) {
    return (
      <StepScansione
        fornitoreNome={fornitureData.fornitoreNome}
        onBack={() => setStep(1)}
        onConferma={handleConferma}
      />
    )
  }

  return <StepFornitore onNext={handleFornitoreNext} />
}
