import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Credenziali errate. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f2f5',
      fontFamily: 'Segoe UI, Roboto, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '48px 40px',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏭</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a237e', margin: 0 }}>
            Gestione Magazzino
          </h1>
          <p style={{ color: '#666', marginTop: '8px', fontSize: '0.95rem' }}>
            Accedi al portale di gestione
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Inserisci username"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#1a237e'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Inserisci password"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#1a237e'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.9rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#9fa8da' : '#1a237e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {isLoading ? '⏳ Accesso in corso...' : '🔐 Accedi'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div style={{
            marginTop: '28px',
            padding: '14px',
            backgroundColor: '#e8eaf6',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#3949ab',
          }}>
            <strong>🔑 Credenziali di default (solo sviluppo):</strong><br />
            Username: <code>admin</code> &nbsp;|&nbsp; Password: <code>admin123</code>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login
