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
      <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px' }}>
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '36px 32px',
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '700', color: 'var(--color-text)' }}>Crea Account</h1>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Registrati per accedere a ordini e preferiti
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '0' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Nome *
                </label>
                <input id="nome" name="nome" type="text" value={formData.nome} onChange={handleChange} required
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Cognome *
                </label>
                <input id="cognome" name="cognome" type="text" value={formData.cognome} onChange={handleChange} required
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                Email *
              </label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required
                style={{
                  width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box', marginBottom: '4px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Password *
                </label>
                <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={6}
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Conferma Password *
                </label>
                <input id="confermaPassword" name="confermaPassword" type="password" value={formData.confermaPassword} onChange={handleChange} required
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                Telefono
              </label>
              <input id="telefono" name="telefono" type="tel" value={formData.telefono} onChange={handleChange}
                style={{
                  width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box', marginBottom: '4px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Indirizzo
                </label>
                <input id="indirizzo" name="indirizzo" type="text" value={formData.indirizzo} onChange={handleChange}
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  N. civico
                </label>
                <input id="numero_civico" name="numero_civico" type="text" value={formData.numero_civico} onChange={handleChange}
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Città
                </label>
                <input id="citta" name="citta" type="text" value={formData.citta} onChange={handleChange}
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  CAP
                </label>
                <input id="cap" name="cap" type="text" value={formData.cap} onChange={handleChange}
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                  Provincia
                </label>
                <input id="provincia" name="provincia" type="text" value={formData.provincia} onChange={handleChange}
                  style={{
                    width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '4px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                Paese
              </label>
              <input id="paese" name="paese" type="text" value={formData.paese} onChange={handleChange}
                style={{
                  width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  color: 'var(--color-text)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box', marginBottom: '4px',
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
              {submitting ? 'Registrazione in corso...' : 'Registrati'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Hai già un account?{' '}
            <Link to="/store/login" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </StoreLayout>
  )
}
