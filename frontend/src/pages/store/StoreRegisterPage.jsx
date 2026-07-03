import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClientiAuth } from '../../context/ClientiAuthContext'

export default function StoreRegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confermaPassword: '',
    nome: '',
    cognome: '',
    telefono: '',
    indirizzo: '',
    numero_civico: '',
    citta: '',
    cap: '',
    provincia: '',
    paese: 'Italia',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { cliente, loading, registrazione } = useClientiAuth()
  const navigate = useNavigate()

  if (!loading && cliente) {
    return <Navigate to="/store/account" replace />
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confermaPassword) {
      setError('Le password non coincidono')
      return
    }

    if (formData.password.length < 6) {
      setError('La password deve avere almeno 6 caratteri')
      return
    }

    setSubmitting(true)
    try {
      const { confermaPassword, ...dataToSend } = formData
      await registrazione(dataToSend)
      navigate('/store/account', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Errore durante la registrazione')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StoreLayout>
      <div className="auth-page">
        <div className="auth-container auth-container-wide">
          <h1>Crea Account</h1>
          <p className="auth-subtitle">Registrati per accedere a ordini e preferiti</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nome">Nome *</label>
                <input id="nome" name="nome" type="text" value={formData.nome} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="cognome">Cognome *</label>
                <input id="cognome" name="cognome" type="text" value={formData.cognome} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confermaPassword">Conferma Password *</label>
                <input
                  id="confermaPassword"
                  name="confermaPassword"
                  type="password"
                  value={formData.confermaPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="telefono">Telefono</label>
              <input id="telefono" name="telefono" type="tel" value={formData.telefono} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 3 }}>
                <label htmlFor="indirizzo">Indirizzo</label>
                <input id="indirizzo" name="indirizzo" type="text" value={formData.indirizzo} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="numero_civico">N. civico</label>
                <input id="numero_civico" name="numero_civico" type="text" value={formData.numero_civico} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="citta">Città</label>
                <input id="citta" name="citta" type="text" value={formData.citta} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="cap">CAP</label>
                <input id="cap" name="cap" type="text" value={formData.cap} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="provincia">Provincia</label>
                <input id="provincia" name="provincia" type="text" value={formData.provincia} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="paese">Paese</label>
              <input id="paese" name="paese" type="text" value={formData.paese} onChange={handleChange} />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting || loading}>
              {submitting ? 'Registrazione in corso...' : 'Registrati'}
            </button>
          </form>

          <p className="auth-footer">
            Hai già un account? <Link to="/store/login">Accedi</Link>
          </p>
        </div>
      </div>
    </StoreLayout>
  )
}
