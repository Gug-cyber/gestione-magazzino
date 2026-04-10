import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'

const STEPS = [
  { label: 'Dati personali' },
  { label: 'Riepilogo ordine' },
  { label: 'Conferma' },
]

function getStepTextColor(isActive, isCompleted) {
  if (isActive) return 'var(--color-primary)'
  if (isCompleted) return 'var(--color-text-secondary)'
  return 'var(--color-text-muted, var(--color-text-secondary))'
}

function ProgressStepper({ currentStep }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      marginBottom: '36px',
    }}>
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        const circleColor = isCompleted || isActive ? 'var(--color-primary)' : 'var(--color-border)'
        const textColor = getStepTextColor(isActive, isCompleted)
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isCompleted || isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                border: `2px solid ${circleColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '700',
                color: isCompleted || isActive ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
              }}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? '600' : '400',
                color: textColor,
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                width: '60px',
                height: '2px',
                backgroundColor: stepNum < currentStep ? 'var(--color-primary)' : 'var(--color-border)',
                marginBottom: '18px',
                transition: 'background-color 0.2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function StoreCheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const [checkoutEnabled, setCheckoutEnabled] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    cap: '',
    note: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    storeAPI.getFlagsPublici()
      .then(res => {
        if (res.data.checkout_enabled === false) setCheckoutEnabled(false)
      })
      .catch(() => {})
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  function validateStep1() {
    const errors = {}
    if (!form.nome.trim()) errors.nome = 'Il nome è obbligatorio.'
    if (!form.email.trim()) {
      errors.email = "L'email è obbligatoria."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Inserisci un indirizzo email valido."
    }
    return errors
  }

  function handleNextStep() {
    const errors = validateStep1()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setCurrentStep(2)
  }

  async function handleConfirmOrder() {
    setLoading(true)
    setSubmitError(null)
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        telefono: form.telefono || undefined,
        indirizzo: form.indirizzo || undefined,
        citta: form.citta || undefined,
        cap: form.cap || undefined,
        note: form.note || undefined,
        righe: items.map(i => ({
          prodotto_id: i.id,
          quantita: i.quantita,
          prezzo_unitario: i.prezzo_unitario ?? i.prezzo_vendita ?? 0,
        })),
      }
      const res = await storeAPI.checkout(payload)
      clearCart()
      setSuccess(res.data)
      setCurrentStep(3)
    } catch (err) {
      const detail = err.response?.data?.detail
      setSubmitError(detail || 'Si è verificato un errore durante il checkout. Riprova.')
      setCurrentStep(3)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const inputErrorStyle = {
    ...inputStyle,
    border: '1px solid var(--color-danger)',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text-secondary)',
  }

  // Checkout disabled
  if (!checkoutEnabled) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }} className="animate-fade-in">
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔒</p>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>Checkout non disponibile al momento</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>Il servizio di acquisto è temporaneamente sospeso.</p>
          <Link to="/store" className="gm-btn gm-btn-secondary">Torna allo store</Link>
        </div>
      </StoreLayout>
    )
  }

  // Empty cart redirect prompt (guard all pre-confirmation steps)
  if (items.length === 0 && currentStep !== 3) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }} className="animate-fade-in">
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🛒</p>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>Il carrello è vuoto</h2>
          <Link to="/store" className="gm-btn gm-btn-primary" style={{ marginTop: '16px' }}>
            Torna allo store
          </Link>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <Link
          to="/store/cart"
          style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
        >
          ← Torna al carrello
        </Link>

        <h1 style={{ margin: '0 0 28px', color: 'var(--color-text)', fontSize: '24px', fontWeight: '700' }}>
          Checkout
        </h1>

        <ProgressStepper currentStep={currentStep} />

        {/* Step 1 — Personal data & shipping */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                Dati personali &amp; spedizione
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nome e Cognome *</label>
                  <input
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    placeholder="Mario Rossi"
                    style={formErrors.nome ? inputErrorStyle : inputStyle}
                  />
                  {formErrors.nome && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{formErrors.nome}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="mario@esempio.it"
                    style={formErrors.email ? inputErrorStyle : inputStyle}
                  />
                  {formErrors.email && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Telefono</label>
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="+39 333 1234567"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Indirizzo</label>
                  <input
                    name="indirizzo"
                    value={form.indirizzo}
                    onChange={handleChange}
                    placeholder="Via Roma 1"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Città</label>
                  <input
                    name="citta"
                    value={form.citta}
                    onChange={handleChange}
                    placeholder="Milano"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>CAP</label>
                  <input
                    name="cap"
                    value={form.cap}
                    onChange={handleChange}
                    placeholder="20100"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Note sull&apos;ordine</label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Eventuali note o istruzioni..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleNextStep}
                className="gm-btn gm-btn-primary"
                style={{ padding: '12px 28px', fontSize: '15px', fontWeight: '600' }}
              >
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Order summary */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Payment info banner */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-primary)',
              borderRadius: '8px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '16px' }}>ℹ️</span>
              <span>Il pagamento verrà concordato separatamente. Nessun addebito immediato.</span>
            </div>

            {/* Products list */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                Prodotti ({items.length} {items.length === 1 ? 'articolo' : 'articoli'})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.nome}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        €{Number(item.prezzo_unitario ?? item.prezzo_vendita ?? 0).toFixed(2)} × {item.quantita}
                      </p>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', flexShrink: 0 }}>
                      €{(Number(item.prezzo_unitario ?? item.prezzo_vendita ?? 0) * item.quantita).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Totale ordine</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                  €{totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Shipping details */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 12px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                Dati di spedizione
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Nome</span>
                  <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.nome}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Email</span>
                  <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.email}</p>
                </div>
                {form.telefono && (
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Telefono</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.telefono}</p>
                  </div>
                )}
                {form.indirizzo && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Indirizzo</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>
                      {form.indirizzo}{form.citta ? `, ${form.citta}` : ''}{form.cap ? ` ${form.cap}` : ''}
                    </p>
                  </div>
                )}
                {form.note && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Note</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.note}</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="gm-btn gm-btn-ghost"
                style={{ padding: '12px 20px', fontSize: '14px' }}
              >
                ← Modifica dati
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={loading}
                className="gm-btn gm-btn-primary"
                style={{
                  padding: '12px 28px',
                  fontSize: '15px',
                  fontWeight: '600',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Invio in corso...' : 'Conferma ordine ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirmation */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 0', maxWidth: '480px', margin: '0 auto' }}>
                <p style={{ fontSize: '56px', margin: '0 0 16px' }}>✅</p>
                <h2 style={{ margin: '0 0 12px', color: 'var(--color-success)', fontSize: '24px', fontWeight: '700' }}>
                  Ordine confermato!
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px', fontSize: '15px' }}>
                  {success.messaggio}
                </p>
                <p style={{
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  color: 'var(--color-success)',
                  fontWeight: '600',
                  fontSize: '18px',
                  marginBottom: '24px',
                }}>
                  Numero ordine: {success.ordine.numero_ordine}
                </p>
                <Link to="/store" className="gm-btn gm-btn-primary">
                  ← Torna allo store
                </Link>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', maxWidth: '480px', margin: '0 auto' }}>
                <p style={{ fontSize: '56px', margin: '0 0 16px' }}>❌</p>
                <h2 style={{ margin: '0 0 12px', color: 'var(--color-danger)', fontSize: '22px', fontWeight: '700' }}>
                  Errore nell&apos;ordine
                </h2>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: '8px',
                  color: 'var(--color-danger)',
                  fontSize: '14px',
                  marginBottom: '24px',
                }}>
                  {submitError}
                </div>
                <button
                  type="button"
                  onClick={() => { setSubmitError(null); setCurrentStep(2) }}
                  className="gm-btn gm-btn-secondary"
                  style={{ marginRight: '12px' }}
                >
                  ← Riprova
                </button>
                <Link to="/store" className="gm-btn gm-btn-ghost">
                  Torna allo store
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
