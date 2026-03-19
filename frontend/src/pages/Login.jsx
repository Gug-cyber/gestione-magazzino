import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotUsername, forgotPassword, resetPassword } from '../api/client'
import useLogoSettings from '../hooks/useLogoSettings'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { logoUrl, portalTitle } = useLogoSettings()

  // Modal state
  const [modal, setModal] = useState(null) // 'username' | 'password' | null

  // Forgot username state
  const [fuEmail, setFuEmail] = useState('')
  const [fuResult, setFuResult] = useState(null)
  const [fuError, setFuError] = useState('')
  const [fuLoading, setFuLoading] = useState(false)

  // Forgot password state
  const [fpEmail, setFpEmail] = useState('')
  const [fpStep, setFpStep] = useState(1) // 1 = request token, 2 = reset password
  const [fpToken, setFpToken] = useState('')
  const [fpNewPassword, setFpNewPassword] = useState('')
  const [fpConfirmPassword, setFpConfirmPassword] = useState('')
  const [fpResult, setFpResult] = useState(null)
  const [fpError, setFpError] = useState('')
  const [fpLoading, setFpLoading] = useState(false)

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

  const openModal = (type) => {
    setModal(type)
    setFuEmail(''); setFuResult(null); setFuError('')
    setFpEmail(''); setFpStep(1); setFpToken(''); setFpNewPassword('')
    setFpConfirmPassword(''); setFpResult(null); setFpError('')
  }

  const closeModal = () => setModal(null)

  const handleForgotUsername = async (e) => {
    e.preventDefault()
    setFuError(''); setFuResult(null); setFuLoading(true)
    try {
      const res = await forgotUsername(fuEmail)
      setFuResult(res.data)
    } catch (err) {
      setFuError(err?.response?.data?.detail || 'Errore durante la ricerca.')
    } finally {
      setFuLoading(false)
    }
  }

  const handleRequestToken = async (e) => {
    e.preventDefault()
    setFpError(''); setFpResult(null); setFpLoading(true)
    try {
      const res = await forgotPassword(fpEmail)
      setFpResult(res.data)
      if (!res.data.email_sent) {
        setFpToken(res.data.reset_token || '')
        setFpStep(2)
      }
      // If email sent, stay on step 1 and show success message
    } catch (err) {
      setFpError(err?.response?.data?.detail || 'Errore durante la richiesta.')
    } finally {
      setFpLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setFpError(''); setFpResult(null)
    if (fpNewPassword.length < 8) {
      setFpError('La password deve contenere almeno 8 caratteri.')
      return
    }
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError('Le password non coincidono.')
      return
    }
    setFpLoading(true)
    try {
      const res = await resetPassword(fpToken, fpNewPassword)
      setFpResult(res.data.message)
      setTimeout(() => closeModal(), 2000)
    } catch (err) {
      setFpError(err?.response?.data?.detail || 'Errore durante il reset.')
    } finally {
      setFpLoading(false)
    }
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
          {logoUrl
            ? <img src={logoUrl} alt={`${portalTitle} logo`} style={{ height: '64px', width: 'auto', objectFit: 'contain', marginBottom: '12px', borderRadius: '6px' }} />
            : <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏭</div>
          }
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1a237e', margin: 0 }}>
            {portalTitle}
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

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <button
            onClick={() => openModal('username')}
            style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Hai dimenticato il tuo username?
          </button>
          <button
            onClick={() => openModal('password')}
            style={{ background: 'none', border: 'none', color: '#1a237e', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Hai dimenticato la password?
          </button>
        </div>

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

      {/* Modal overlay */}
      {modal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'white', borderRadius: '12px', padding: '32px',
              width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: '12px', right: '16px',
                background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#666',
              }}
            >×</button>

            {modal === 'username' && (
              <>
                <h2 style={{ color: '#1a237e', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>
                  🔎 Recupera Username
                </h2>
                <form onSubmit={handleForgotUsername}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={fuEmail}
                    onChange={e => setFuEmail(e.target.value)}
                    required
                    placeholder="Inserisci la tua email"
                    style={inputStyle}
                  />
                  <button type="submit" disabled={fuLoading} style={btnPrimary(fuLoading)}>
                    {fuLoading ? '⏳ Ricerca...' : 'Cerca username'}
                  </button>
                </form>
                {fuResult && (
                  <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '0.95rem' }}>
                    {fuResult.email_sent
                      ? '✅ Username inviato alla tua email registrata!'
                      : <>✅ Il tuo username è: <strong>{fuResult.username}</strong></>
                    }
                  </div>
                )}
                {fuError && (
                  <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
                    ⚠️ {fuError}
                  </div>
                )}
              </>
            )}

            {modal === 'password' && (
              <>
                <h2 style={{ color: '#1a237e', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>
                  🔑 Recupera Password
                </h2>

                {fpStep === 1 && (
                  <form onSubmit={handleRequestToken}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      required
                      placeholder="Inserisci la tua email"
                      style={inputStyle}
                    />
                    <button type="submit" disabled={fpLoading} style={btnPrimary(fpLoading)}>
                      {fpLoading ? '⏳ Invio...' : 'Invia link di reset'}
                    </button>
                    {fpResult?.email_sent && (
                      <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '0.95rem' }}>
                        ✅ Link di reset inviato alla tua email! Controlla la casella e clicca il link per reimpostare la password.
                      </div>
                    )}
                    {fpError && (
                      <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
                        ⚠️ {fpError}
                      </div>
                    )}
                  </form>
                )}

                {fpStep === 2 && (
                  <form onSubmit={handleResetPassword}>
                    {fpResult?.email_sent ? (
                      <div style={{ marginBottom: '14px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', fontSize: '0.85rem', color: '#2e7d32' }}>
                        ✅ Token inviato via email! Controlla la tua casella e inseriscilo nel campo qui sotto.
                      </div>
                    ) : (
                      <div style={{ marginBottom: '14px', padding: '12px', backgroundColor: '#e8eaf6', borderRadius: '8px', fontSize: '0.85rem', color: '#3949ab' }}>
                        <strong>Token di reset:</strong>
                        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px' }}>{fpToken}</div>
                        <div style={{ marginTop: '6px', color: '#555' }}>Copia questo token e usalo nel campo sottostante. Scade tra 30 minuti.</div>
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>Token</label>
                      <input
                        type="text"
                        value={fpToken}
                        onChange={e => setFpToken(e.target.value)}
                        required
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>Nuova password (min. 8 caratteri)</label>
                      <input
                        type="password"
                        value={fpNewPassword}
                        onChange={e => setFpNewPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="Nuova password"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ marginBottom: '4px' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', color: '#333' }}>Conferma nuova password</label>
                      <input
                        type="password"
                        value={fpConfirmPassword}
                        onChange={e => setFpConfirmPassword(e.target.value)}
                        required
                        placeholder="Conferma password"
                        style={inputStyle}
                      />
                    </div>

                    <button type="submit" disabled={fpLoading} style={btnPrimary(fpLoading)}>
                      {fpLoading ? '⏳ Reset...' : 'Reimposta password'}
                    </button>

                    {fpResult && (
                      <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', color: '#2e7d32', fontSize: '0.95rem' }}>
                        ✅ {fpResult}
                      </div>
                    )}
                    {fpError && (
                      <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
                        ⚠️ {fpError}
                      </div>
                    )}
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
