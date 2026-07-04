import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { useClienteAuth } from '../../context/ClienteAuthContext'
import { trackPageView, trackCheckoutStart, trackPurchase } from '../../utils/analytics'

const STEP_KEYS = ['step_personal', 'step_shipping', 'step_payment', 'step_summary', 'step_confirm']

const SPEDIZIONE_OPTIONS = [
  { tipo: 'negozio', label: 'Ritiro in negozio', costo: 0, icona: '🏪', dettaglio: 'Gratuito' },
  { tipo: 'standard', label: 'Spedizione standard', costo: 4.90, icona: '📦', dettaglio: '3-5 giorni lavorativi' },
  { tipo: 'express', label: 'Spedizione express', costo: 9.90, icona: '⚡', dettaglio: '1-2 giorni lavorativi' },
]

const PAGAMENTO_ICON_STYLE = {
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  backgroundColor: '#fff',
  padding: '4px',
  flexShrink: 0,
}

const PAGAMENTO_OPTIONS = [
  {
    tipo: 'carta',
    label: 'Carta di credito/debito',
    icona: (
      <svg width="32" height="22" viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="22" rx="3" fill="#1A1F71"/>
        <rect y="5" width="32" height="5" fill="#F7B600"/>
        <rect x="3" y="14" width="8" height="2" rx="1" fill="white" opacity="0.7"/>
      </svg>
    ),
  },
  {
    tipo: 'paypal',
    label: 'PayPal',
    icona: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
        <path fill="#009cde" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
      </svg>
    ),
  },
  {
    tipo: 'applepay',
    label: 'Apple Pay',
    icona: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    tipo: 'googlepay',
    label: 'Google Pay',
    icona: (
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 10.8v2.6h3.6c-.2 1-1.3 3-3.6 3-2.2 0-4-1.8-4-4s1.8-4 4-4c1.2 0 2 .5 2.5 1l1.8-1.7C15 6.4 13.6 5.8 12 5.8c-3.4 0-6.2 2.8-6.2 6.2s2.8 6.2 6.2 6.2c3.6 0 5.9-2.5 5.9-6 0-.4 0-.7-.1-1H12z" fill="#4285F4"/>
      </svg>
    ),
  },
  { tipo: 'negozio', label: 'Pagamento in negozio', icona: '🏪', dettaglio: 'Paga al momento del ritiro' },
]

function getStepTextColor(isActive, isCompleted) {
  if (isActive) return 'var(--color-primary)'
  if (isCompleted) return 'var(--color-text-secondary)'
  return 'var(--color-text-muted, var(--color-text-secondary))'
}

function ProgressStepper({ currentStep, t }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0',
      marginBottom: '36px',
    }}>
      {STEP_KEYS.map((key, idx) => {
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
                {t(key)}
              </span>
            </div>
            {idx < STEP_KEYS.length - 1 && (
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
  const { t } = useLanguage()
  const { cliente } = useClienteAuth()
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

  const [spedizione, setSpedizione] = useState({ tipo: 'standard', costo: 4.90, label: 'Spedizione standard' })
  const [pagamento, setPagamento] = useState('negozio')
  const [datiCarta, setDatiCarta] = useState({ numero: '', titolare: '', scadenza: '', cvv: '' })

  const [storeSettings, setStoreSettings] = useState(null)

  useEffect(() => {
    trackPageView('/store/checkout')
    trackCheckoutStart()
  }, [])

  useEffect(() => {
    storeAPI.getFlagsPublici()
      .then(res => {
        if (res.data.checkout_enabled === false) setCheckoutEnabled(false)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    storeAPI.getStoreSettings()
      .then(res => {
        const s = res.data
        setStoreSettings(s)
        // Pick the first enabled shipping option as the default
        const enabledOptions = [
          s.spedizione_ritiro_abilitato && { tipo: 'negozio', costo: s.spedizione_ritiro_costo, label: 'Ritiro in negozio' },
          s.spedizione_standard_abilitato && { tipo: 'standard', costo: s.spedizione_standard_costo, label: 'Spedizione standard' },
          s.spedizione_express_abilitato && { tipo: 'express', costo: s.spedizione_express_costo, label: 'Spedizione express' },
        ].filter(Boolean)
        const first = enabledOptions[0] ?? { tipo: 'negozio', costo: 0, label: 'Ritiro in negozio' }
        setSpedizione({ tipo: first.tipo, costo: first.costo, label: first.label })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (cliente) {
      setForm(prev => ({
        ...prev,
        nome: prev.nome || `${cliente.nome || ''} ${cliente.cognome || ''}`.trim(),
        email: prev.email || cliente.email || '',
        telefono: prev.telefono || cliente.telefono || '',
        indirizzo: prev.indirizzo || (cliente.indirizzo ? `${cliente.indirizzo}${cliente.numero_civico ? ', ' + cliente.numero_civico : ''}` : ''),
        citta: prev.citta || cliente.citta || '',
        cap: prev.cap || cliente.cap || '',
      }))
    }
  }, [cliente])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  // Derive shipping options dynamically from backend settings (with fallback to hardcoded)
  const spedizioneOptions = storeSettings ? [
    storeSettings.spedizione_ritiro_abilitato && {
      tipo: 'negozio',
      label: 'Ritiro in negozio',
      costo: storeSettings.spedizione_ritiro_costo,
      icona: '🏪',
      dettaglio: storeSettings.spedizione_ritiro_giorni,
    },
    storeSettings.spedizione_standard_abilitato && {
      tipo: 'standard',
      label: 'Spedizione standard',
      costo: storeSettings.spedizione_standard_costo,
      icona: '📦',
      dettaglio: storeSettings.spedizione_standard_giorni,
    },
    storeSettings.spedizione_express_abilitato && {
      tipo: 'express',
      label: 'Spedizione express',
      costo: storeSettings.spedizione_express_costo,
      icona: '⚡',
      dettaglio: storeSettings.spedizione_express_giorni,
    },
  ].filter(Boolean) : SPEDIZIONE_OPTIONS

  // Ensure at least one option is shown even if all are disabled
  const spedizioneOptionsEffectiveRaw = spedizioneOptions.length > 0
    ? spedizioneOptions
    : [{ tipo: 'negozio', label: 'Ritiro in negozio', costo: 0, icona: '🏪', dettaglio: 'Gratuito' }]

  // Translate shipping option labels
  const spedizioneOptionsEffective = spedizioneOptionsEffectiveRaw.map(opt => {
    const labelMap = {
      'negozio': t('shipping_pickup'),
      'standard': t('shipping_standard'),
      'express': t('shipping_express'),
    }
    const dettaglioMap = {
      'Gratuito': t('shipping_free'),
      '3-5 giorni lavorativi': t('shipping_standard_days'),
      '1-2 giorni lavorativi': t('shipping_express_days'),
    }
    return {
      ...opt,
      label: labelMap[opt.tipo] || opt.label,
      dettaglio: opt.dettaglio ? (dettaglioMap[opt.dettaglio] || opt.dettaglio) : opt.dettaglio,
    }
  })

  // Derive payment options dynamically from backend settings (with fallback to hardcoded)
  const pagamentoOptions = storeSettings ? PAGAMENTO_OPTIONS.filter(opt => {
    switch (opt.tipo) {
      case 'carta': return storeSettings.pagamento_carta_abilitato
      case 'paypal': return storeSettings.pagamento_paypal_abilitato
      case 'applepay': return storeSettings.pagamento_apple_pay_abilitato
      case 'googlepay': return storeSettings.pagamento_google_pay_abilitato
      case 'negozio': return storeSettings.pagamento_negozio_abilitato
      default: return true
    }
  }) : PAGAMENTO_OPTIONS

  // Translate labels for payment options that have localizable labels
  const pagamentoOptionsTranslated = pagamentoOptions.map(opt => {
    if (opt.tipo === 'carta') return { ...opt, label: t('payment_card') }
    if (opt.tipo === 'negozio') return { ...opt, label: t('payment_store'), dettaglio: t('payment_store_detail') }
    return opt
  })

  function validateStep1() {
    const errors = {}
    if (!form.nome.trim()) errors.nome = t('validation_name_required')
    if (!form.email.trim()) {
      errors.email = t('validation_email_required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = t('validation_email_invalid')
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
      if (cliente) {
        // Cliente loggato: usa route autenticata che invia email
        const payload = {
          items: items.map(i => ({
            prodotto_id: i.id,
            nome_prodotto: i.nome,
            quantita: i.quantita,
            prezzo_unitario: i.prezzo_unitario ?? i.prezzo_vendita ?? 0,
            immagine_url: i.immagini?.[0] || i.foto_url || null,
          })),
          spese_spedizione: spedizione.costo,
          metodo_pagamento: pagamento,
          note: [form.note, `Spedizione: ${spedizione.label}`].filter(Boolean).join(' | ') || undefined,
          shipping_nome: form.nome.split(' ')[0] || '',
          shipping_cognome: form.nome.split(' ').slice(1).join(' ') || '',
          shipping_indirizzo: form.indirizzo || undefined,
          shipping_citta: form.citta || undefined,
          shipping_cap: form.cap || undefined,
          shipping_telefono: form.telefono || undefined,
          indirizzo_spedizione: form.indirizzo
            ? `${form.nome} — ${form.indirizzo}${form.citta ? ', ' + form.citta : ''}${form.cap ? ' ' + form.cap : ''}`
            : undefined,
        }
        const res = await storeAPI.creaOrdine(payload)
        clearCart()
        setSuccess({
          messaggio: `Ordine confermato! Riceverai una email di conferma a ${cliente.email}.`,
          ordine: { numero_ordine: res.data.numero_ordine }
        })
        trackPurchase(
          res.data?.numero_ordine,
          res.data?.totale || 0,
          payload.items?.map(r => ({ id: String(r.prodotto_id), quantity: r.quantita, price: r.prezzo_unitario })) || []
        )
      } else {
        // Guest: usa route pubblica (comportamento attuale)
        const noteParts = [
          form.note,
          `Metodo pagamento: ${pagamento}`,
          `Spedizione: ${spedizione.label} (€${spedizione.costo.toFixed(2)})`,
        ].filter(Boolean)
        const payload = {
          nome: form.nome,
          email: form.email,
          telefono: form.telefono || undefined,
          indirizzo: form.indirizzo || undefined,
          citta: form.citta || undefined,
          cap: form.cap || undefined,
          note: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
          righe: items.map(i => ({
            prodotto_id: i.id,
            quantita: i.quantita,
            prezzo_unitario: i.prezzo_unitario ?? i.prezzo_vendita ?? 0,
          })),
        }
        const res = await storeAPI.checkout(payload)
        clearCart()
        setSuccess(res.data)
        trackPurchase(
          res.data?.ordine?.numero_ordine || payload.righe?.length,
          payload.righe?.reduce((sum, r) => sum + r.prezzo_unitario * r.quantita, 0) || 0,
          payload.righe?.map(r => ({ id: String(r.prodotto_id), quantity: r.quantita, price: r.prezzo_unitario })) || []
        )
      }
      setCurrentStep(5)
    } catch (err) {
      const detail = err.response?.data?.detail
      setSubmitError(detail || 'Si è verificato un errore durante il checkout. Riprova.')
      setCurrentStep(5)
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
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>{t('checkout_unavailable_title')}</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>{t('checkout_unavailable_msg')}</p>
          <Link to="/store" className="gm-btn gm-btn-secondary">{t('back_to_store_plain')}</Link>
        </div>
      </StoreLayout>
    )
  }

  // Empty cart redirect prompt (guard all pre-confirmation steps)
  if (items.length === 0 && currentStep !== 5) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }} className="animate-fade-in">
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🛒</p>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text)' }}>{t('cart_empty_checkout')}</h2>
          <Link to="/store" className="gm-btn gm-btn-primary" style={{ marginTop: '16px' }}>
            {t('back_to_store_plain')}
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
          {t('back_to_cart')}
        </Link>

        <h1 style={{ margin: '0 0 28px', color: 'var(--color-text)', fontSize: '24px', fontWeight: '700' }}>
          {t('checkout_title')}
        </h1>

        <ProgressStepper currentStep={currentStep} t={t} />

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
                {t('personal_and_shipping')}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>{t('field_full_name')}</label>
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
                  <label style={labelStyle}>{t('field_email')}</label>
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
                  <label style={labelStyle}>{t('field_phone')}</label>
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="+39 333 1234567"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>{t('field_address')}</label>
                  <input
                    name="indirizzo"
                    value={form.indirizzo}
                    onChange={handleChange}
                    placeholder="Via Roma 1"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t('field_city')}</label>
                  <input
                    name="citta"
                    value={form.citta}
                    onChange={handleChange}
                    placeholder="Milano"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t('field_zip')}</label>
                  <input
                    name="cap"
                    value={form.cap}
                    onChange={handleChange}
                    placeholder="20100"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>{t('field_notes')}</label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder={t('field_notes_placeholder')}
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
                {t('next_btn')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Shipping method */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                {t('choose_shipping')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {spedizioneOptionsEffective.map(opt => {
                  const isSelected = spedizione.tipo === opt.tipo
                  return (
                    <div
                      key={opt.tipo}
                      onClick={() => setSpedizione({ tipo: opt.tipo, costo: opt.costo, label: opt.label })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '22px' }}>{opt.icona}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: 'var(--color-text)' }}>{opt.label}</p>
                        {opt.dettaglio && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{opt.dettaglio}</p>
                        )}
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)', flexShrink: 0 }}>
                        {opt.costo === 0 ? t('shipping_free') : `€${opt.costo.toFixed(2)}`}
                      </span>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isSelected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="gm-btn gm-btn-ghost"
                style={{ padding: '12px 20px', fontSize: '14px' }}
              >
                {t('back_btn')}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="gm-btn gm-btn-primary"
                style={{ padding: '12px 28px', fontSize: '15px', fontWeight: '600' }}
              >
                {t('next_btn')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Payment method */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                {t('choose_payment')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pagamentoOptionsTranslated.map(opt => {
                  const isSelected = pagamento === opt.tipo
                  return (
                    <div
                      key={opt.tipo}
                      onClick={() => setPagamento(opt.tipo)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: 'var(--color-surface)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={PAGAMENTO_ICON_STYLE}>{opt.icona}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: 'var(--color-text)' }}>{opt.label}</p>
                        {opt.dettaglio && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>{opt.dettaglio}</p>
                        )}
                      </div>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isSelected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                      </div>
                    </div>
                  )
                })}
                {pagamentoOptions.length === 0 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-warning, var(--color-border))',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px',
                    textAlign: 'center',
                  }}>
                    ⚠️ {t('no_payment_methods')}
                  </div>
                )}
              </div>

              {/* Credit card form */}
              {pagamento === 'carta' && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                      {t('card_number')}
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="**** **** **** ****"
                      value={datiCarta.numero}
                      onChange={e => setDatiCarta(prev => ({ ...prev, numero: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                      {t('card_holder')}
                    </label>
                    <input
                      type="text"
                      placeholder="Mario Rossi"
                      value={datiCarta.titolare}
                      onChange={e => setDatiCarta(prev => ({ ...prev, titolare: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                        {t('card_expiry')}
                      </label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={datiCarta.scadenza}
                        onChange={e => setDatiCarta(prev => ({ ...prev, scadenza: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="***"
                        value={datiCarta.cvv}
                        onChange={e => setDatiCarta(prev => ({ ...prev, cvv: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    {t('card_data_notice')}
                  </p>
                </div>
              )}

              {/* Info banners for other methods */}
              {['paypal', 'applepay', 'googlepay'].includes(pagamento) && (
                <div style={{
                  marginTop: '16px',
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
                  <span>
                    {t('redirect_notice', pagamentoOptionsTranslated.find(o => o.tipo === pagamento)?.label)}
                  </span>
                </div>
              )}

              {pagamento === 'negozio' && (
                <div style={{
                  marginTop: '16px',
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
                  <span>{t('negozio_payment_notice')}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="gm-btn gm-btn-ghost"
                style={{ padding: '12px 20px', fontSize: '14px' }}
              >
                {t('back_btn')}
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                disabled={pagamentoOptions.length === 0}
                className="gm-btn gm-btn-primary"
                style={{ 
                  padding: '12px 28px', 
                  fontSize: '15px', 
                  fontWeight: '600',
                  opacity: pagamentoOptions.length === 0 ? 0.5 : 1,
                  cursor: pagamentoOptions.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {t('next_btn')}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Order summary */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Products list */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                {t('summary_products', items.length, t('cart_item_one'), t('cart_item_many'))}
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

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{t('subtotal_products')}</span>
                  <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>€{totalPrice.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    {spedizioneOptionsEffective.find(o => o.tipo === spedizione.tipo)?.label || spedizione.label}
                  </span>
                  <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                    {spedizione.costo === 0 ? t('shipping_free') : `€${spedizione.costo.toFixed(2)}`}
                  </span>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>{t('final_total')}</span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                    €{(totalPrice + spedizione.costo).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping & payment summary */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 12px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                {t('shipping_label_row')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('shipping_method_label')}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: '500' }}>
                    {spedizioneOptionsEffective.find(o => o.tipo === spedizione.tipo)?.icona} {spedizioneOptionsEffective.find(o => o.tipo === spedizione.tipo)?.label || spedizione.label}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('payment_method_label')}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: '500' }}>
                    {(() => { const opt = pagamentoOptionsTranslated.find(o => o.tipo === pagamento); return opt ? `${opt.icona} ${opt.label}` : pagamento })()} 
                  </span>
                </div>
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
                {t('shipping_details')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{t('field_name_label')}</span>
                  <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.nome}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{t('field_email_label')}</span>
                  <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.email}</p>
                </div>
                {form.telefono && (
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{t('field_phone_label')}</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.telefono}</p>
                  </div>
                )}
                {form.indirizzo && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{t('field_address_label')}</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>
                      {form.indirizzo}{form.citta ? `, ${form.citta}` : ''}{form.cap ? ` ${form.cap}` : ''}
                    </p>
                  </div>
                )}
                {form.note && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{t('field_notes_label')}</span>
                    <p style={{ margin: '2px 0 0', color: 'var(--color-text)', fontWeight: '500' }}>{form.note}</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="gm-btn gm-btn-ghost"
                style={{ padding: '12px 20px', fontSize: '14px' }}
              >
                {t('edit_btn')}
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
                {loading ? t('sending') : t('confirm_order')}
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — Confirmation */}
        {currentStep === 5 && (
          <div className="animate-fade-in">
            {success ? (
              <div style={{ textAlign: 'center', padding: '40px 0', maxWidth: '480px', margin: '0 auto' }}>
                <p style={{ fontSize: '56px', margin: '0 0 16px' }}>✅</p>
                <h2 style={{ margin: '0 0 12px', color: 'var(--color-success)', fontSize: '24px', fontWeight: '700' }}>
                  {t('order_confirmed')}
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
                  {t('order_number', success.ordine.numero_ordine)}
                </p>
                <Link to="/store" className="gm-btn gm-btn-primary">
                  {t('back_to_store')}
                </Link>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', maxWidth: '480px', margin: '0 auto' }}>
                <p style={{ fontSize: '56px', margin: '0 0 16px' }}>❌</p>
                <h2 style={{ margin: '0 0 12px', color: 'var(--color-danger)', fontSize: '22px', fontWeight: '700' }}>
                  {t('order_error_title')}
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
                  onClick={() => { setSubmitError(null); setCurrentStep(4) }}
                  className="gm-btn gm-btn-secondary"
                  style={{ marginRight: '12px' }}
                >
                  {t('retry_btn')}
                </button>
                <Link to="/store" className="gm-btn gm-btn-ghost">
                  {t('store_back_btn')}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
