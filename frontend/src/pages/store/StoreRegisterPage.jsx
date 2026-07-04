import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'

function Field({ label, type = 'text', value, onChange, required, placeholder, autoComplete }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
        {label}{required && <span style={{ color: 'var(--color-danger, #d32f2f)', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--store-border, var(--color-border))',
          borderRadius: '8px',
          fontSize: '14px',
          color: 'var(--color-text)',
          background: 'var(--color-bg)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export default function StoreRegisterPage() {
  const { register } = useClienteAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    confermaPassword: '',
    telefono: '',
    indirizzo: '',
    numero_civico: '',
    cap: '',
    citta: '',
    provincia: '',
    paese: 'Italia',
  })

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confermaPassword) {
      setError('Le password non corrispondono')
      return
    }
    setLoading(true)
    try {
      const { confermaPassword, ...data } = form
      // rimuovi campi vuoti opzionali
      const payload = Object.fromEntries(
        Object.entries(data).filter(([k, v]) => v !== '' || ['nome', 'cognome', 'email', 'password'].includes(k))
      )
      await register(payload)
      navigate('/store/account', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StoreLayout>
      <div style={{
        maxWidth: '560px',
        margin: '48px auto',
        padding: '0 16px',
      }}>
        <div style={{
          background: 'var(--store-surface, var(--color-bg-elevated))',
          border: '1px solid var(--store-border, var(--color-border))',
          borderRadius: '16px',
          padding: '40px 36px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '700', color: 'var(--color-text)' }}>
            Crea il tuo account
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Hai già un account?{' '}
            <a href="/store/login" style={{ color: 'var(--store-primary, var(--color-primary))', fontWeight: '600', textDecoration: 'none' }}>
              Accedi
            </a>
          </p>

          {error && (
            <div style={{
              background: 'var(--color-danger-bg, #fff0f0)',
              border: '1px solid var(--color-danger-border, #ffcccc)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '14px',
              color: 'var(--color-danger, #d32f2f)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Nome" value={form.nome} onChange={set('nome')} required placeholder="Mario" autoComplete="given-name" />
              <Field label="Cognome" value={form.cognome} onChange={set('cognome')} required placeholder="Rossi" autoComplete="family-name" />
            </div>

            <Field label="Email" type="email" value={form.email} onChange={set('email')} required placeholder="mario@email.it" autoComplete="email" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <Field label="Password" type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" autoComplete="new-password" />
              <Field label="Conferma password" type="password" value={form.confermaPassword} onChange={set('confermaPassword')} required placeholder="••••••••" autoComplete="new-password" />
            </div>

            <Field label="Telefono" type="tel" value={form.telefono} onChange={set('telefono')} placeholder="+39 333 123 4567" autoComplete="tel" />

            <div style={{
              margin: '8px 0 16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--store-border, var(--color-border))',
            }}>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                Indirizzo di spedizione (opzionale — per velocizzare il checkout)
              </p>
              <Field label="Indirizzo" value={form.indirizzo} onChange={set('indirizzo')} placeholder="Via Roma" autoComplete="street-address" />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 14px' }}>
                <Field label="Città" value={form.citta} onChange={set('citta')} placeholder="Milano" autoComplete="address-level2" />
                <Field label="N. civico" value={form.numero_civico} onChange={set('numero_civico')} placeholder="1" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
                <Field label="CAP" value={form.cap} onChange={set('cap')} placeholder="20100" autoComplete="postal-code" />
                <Field label="Provincia" value={form.provincia} onChange={set('provincia')} placeholder="MI" autoComplete="address-level1" />
                <Field label="Paese" value={form.paese} onChange={set('paese')} placeholder="Italia" autoComplete="country-name" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'var(--color-border)' : 'var(--store-primary, var(--color-primary))',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 150ms ease',
                marginTop: '4px',
              }}
            >
              {loading ? 'Registrazione in corso…' : 'Crea account'}
            </button>
          </form>
        </div>
      </div>
    </StoreLayout>
  )
}
