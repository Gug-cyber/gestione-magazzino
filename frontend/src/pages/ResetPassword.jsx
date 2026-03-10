import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/client'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    fontFamily: 'Segoe UI, Roboto, sans-serif',
  }

  const cardStyle = {
    backgroundColor: 'white',
    padding: '48px 40px',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    width: '100%',
    maxWidth: '400px',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const btnPrimary = (disabled) => ({
    width: '100%',
    padding: '10px',
    backgroundColor: disabled ? '#9fa8da' : '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: '8px',
  })

  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🔒</div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a237e', margin: 0 }}>
              Link non valido
            </h1>
          </div>
          <div style={{ padding: '14px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '0.95rem', textAlign: 'center' }}>
            ⚠️ Il link di reset non è valido o è scaduto. Richiedi un nuovo link dalla pagina di login.
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{ ...btnPrimary(false), marginTop: '20px' }}
          >
            Torna al login
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg(null)
    setError(null)
    if (nuovaPassword.length < 8) {
      setError('La password deve contenere almeno 8 caratteri.')
      return
    }
    if (nuovaPassword !== confermaPassword) {
      setError('Le password non coincidono.')
      return
    }
    setLoading(true)
    try {
      const res = await resetPassword(token, nuovaPassword)
      setMsg(res.data.message || 'Password reimpostata con successo!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Errore durante il reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🔑</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a237e', margin: 0 }}>
            Reimposta Password
          </h1>
          <p style={{ color: '#666', marginTop: '8px', fontSize: '0.95rem' }}>
            Inserisci la tua nuova password
          </p>
        </div>

        {msg ? (
          <div style={{ padding: '14px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '0.95rem', textAlign: 'center' }}>
            ✅ {msg}
            <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#555' }}>Reindirizzamento al login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
                Nuova password (min. 8 caratteri)
              </label>
              <input
                type="password"
                value={nuovaPassword}
                onChange={e => setNuovaPassword(e.target.value)}
                required
                placeholder="Nuova password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1a237e'}
                onBlur={e => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
                Conferma nuova password
              </label>
              <input
                type="password"
                value={confermaPassword}
                onChange={e => setConfermaPassword(e.target.value)}
                required
                placeholder="Conferma password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1a237e'}
                onBlur={e => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {error && (
              <div style={{ padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem', marginBottom: '8px' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? '⏳ Reset in corso...' : 'Reimposta Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
