import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClientiAuth } from '../../context/ClientiAuthContext'

export default function StoreLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { cliente, loading, login } = useClientiAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/store/account'

  if (!loading && cliente) {
    return <Navigate to="/store/account" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Errore durante il login')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StoreLayout>
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }}>
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '36px 32px',
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '700', color: 'var(--color-text)' }}>Accedi</h1>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Accedi al tuo account per gestire ordini e preferiti
          </p>

          {error && (
            <div style={{
              color: 'var(--color-danger)',
              fontSize: '13px',
              marginBottom: '12px',
              padding: '10px',
              backgroundColor: 'var(--color-danger-bg, #fef2f2)',
              borderRadius: '6px',
              border: '1px solid var(--color-danger)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="La tua email"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '4px',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '4px',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              style={{
                width: '100%',
                padding: '11px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              {submitting ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Non hai un account?{' '}
            <Link to="/store/registrazione" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </StoreLayout>
  )
}
