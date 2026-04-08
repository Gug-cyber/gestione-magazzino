import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'

export default function StoreCheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [checkoutEnabled, setCheckoutEnabled] = useState(true)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    cap: '',
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

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
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (items.length === 0) {
      setError('Il carrello è vuoto.')
      return
    }
    setLoading(true)
    setError(null)
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
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Si è verificato un errore durante il checkout. Riprova.')
    } finally {
      setLoading(false)
    }
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

  // Empty cart redirect prompt
  if (items.length === 0 && !success) {
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

  // Success state
  if (success) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 0', maxWidth: '480px', margin: '0 auto' }} className="animate-fade-in">
          <p style={{ fontSize: '56px', margin: '0 0 16px' }}>✅</p>
          <h2 style={{ margin: '0 0 12px', color: 'var(--color-success)', fontSize: '24px', fontWeight: '700' }}>
            Ordine confermato!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 8px', fontSize: '15px' }}>
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
      </StoreLayout>
    )
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

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text-secondary)',
  }

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        <Link
          to="/store/cart"
          style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
        >
          ← Torna al carrello
        </Link>

        <h1 style={{ margin: '0 0 28px', color: 'var(--color-text)', fontSize: '24px', fontWeight: '700' }}>
          Checkout
        </h1>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
                Dati personali
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nome e Cognome *</label>
                  <input
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    required
                    placeholder="Mario Rossi"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="mario@esempio.it"
                    style={inputStyle}
                  />
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

            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger)',
                borderRadius: '8px',
                color: 'var(--color-danger)',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gm-btn gm-btn-primary"
              style={{
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Invio in corso...' : 'Conferma ordine ✓'}
            </button>
          </form>

          {/* Order summary */}
          <div style={{
            flex: '0 0 auto',
            width: 'min(320px, 100%)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '20px',
            position: 'sticky',
            top: '72px',
          }}>
            <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: '15px', fontWeight: '600' }}>
              Riepilogo ({items.length} {items.length === 1 ? 'prodotto' : 'prodotti'})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nome}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      × {item.quantita}
                    </p>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)', flexShrink: 0 }}>
                    €{(Number(item.prezzo_unitario ?? item.prezzo_vendita ?? 0) * item.quantita).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Totale</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                €{totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
