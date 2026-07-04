import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'

export default function StoreLoginPage() {
  const { login } = useClienteAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from || '/store/account'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Email o password non validi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StoreLayout>
      <div style={{
        maxWidth: '440px',
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
          <h1 style={{
            margin: '0 0 8px',
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--color-text)',
          }}>
            Accedi al tuo account
          </h1>
          <p style={{
            margin: '0 0 28px',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
          }}>
            Non hai un account?{' '}
            <Link to="/store/registrati" style={{ color: 'var(--store-primary, var(--color-primary))', fontWeight: '600', textDecoration: 'none' }}>
              Registrati
            </Link>
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="la-tua@email.it"
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

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
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

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'default' }}>
                Password dimenticata?
              </span>
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
              }}
            >
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </StoreLayout>
  )
}
