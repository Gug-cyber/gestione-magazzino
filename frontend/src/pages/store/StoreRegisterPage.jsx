import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '14px',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--color-text)',
  marginBottom: '6px',
}

function Field({ label, type = 'text', value, onChange, required, autoComplete }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </div>
  )
}

export default function StoreRegisterPage() {
  const { register } = useClienteAuth()
  const navigate = useNavigate()

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
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confermaPassword) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)
    try {
      const { confermaPassword, ...data } = form
      // Rimuovi campi opzionali vuoti
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '')
      )
      await register(payload)
      navigate('/store/account')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Errore durante la registrazione.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StoreLayout>
      <div style={{
        maxWidth: '520px',
        margin: '48px auto',
        padding: '32px',
        background: 'var(--color-bg-elevated)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-text)' }}>
          Crea il tuo account
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Hai già un account?{' '}
          <Link to="/store/login" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
            Accedi
          </Link>
        </p>

        {error && (
          <div style={{
            background: 'var(--color-danger-bg, #fff0f0)',
            border: '1px solid var(--color-danger-border, #fca5a5)',
            color: 'var(--color-danger, #dc2626)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '14px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Nome" value={form.nome} onChange={set('nome')} required autoComplete="given-name" />
            <Field label="Cognome" value={form.cognome} onChange={set('cognome')} required autoComplete="family-name" />
          </div>

          <Field label="Email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Password" type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" />
            <Field label="Conferma password" type="password" value={form.confermaPassword} onChange={set('confermaPassword')} required autoComplete="new-password" />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            Dati facoltativi
          </p>

          <Field label="Telefono" type="tel" value={form.telefono} onChange={set('telefono')} autoComplete="tel" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
            <Field label="Indirizzo" value={form.indirizzo} onChange={set('indirizzo')} autoComplete="street-address" />
            <div>
              <label style={labelStyle}>N. civico</label>
              <input type="text" value={form.numero_civico} onChange={set('numero_civico')} style={{ ...inputStyle, width: '80px' }} autoComplete="off" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px' }}>
            <div>
              <label style={labelStyle}>CAP</label>
              <input type="text" value={form.cap} onChange={set('cap')} style={{ ...inputStyle, width: '90px' }} autoComplete="postal-code" />
            </div>
            <Field label="Città" value={form.citta} onChange={set('citta')} autoComplete="address-level2" />
            <div>
              <label style={labelStyle}>Provincia</label>
              <input type="text" value={form.provincia} onChange={set('provincia')} maxLength={2} style={{ ...inputStyle, width: '60px', textTransform: 'uppercase' }} autoComplete="address-level1" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {loading ? 'Registrazione in corso…' : 'Registrati'}
          </button>
        </form>
      </div>
    </StoreLayout>
  )
}
