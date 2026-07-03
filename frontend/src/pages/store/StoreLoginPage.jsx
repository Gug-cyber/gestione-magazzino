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
      <div className="auth-page">
        <div className="auth-container">
          <h1>Accedi</h1>
          <p className="auth-subtitle">Accedi al tuo account per gestire ordini e preferiti</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="La tua email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting || loading}>
              {submitting ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <p className="auth-footer">
            Non hai un account? <Link to="/store/registrazione">Registrati</Link>
          </p>
        </div>
      </div>
    </StoreLayout>
  )
}
