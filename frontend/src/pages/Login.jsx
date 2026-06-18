import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { forgotUsername, forgotPassword, resetPassword } from '../api/client'
import useLogoSettings from '../hooks/useLogoSettings'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [temporaryToken, setTemporaryToken] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, verifyTwoFactorLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
  const [fpStep, setFpStep] = useState(1)
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
      if (!twoFactorRequired) {
        const result = await login(username, password)
        if (result?.requires2FA) {
          setTwoFactorRequired(true)
          setTemporaryToken(result.temporaryToken)
          return
        }
      } else {
        await verifyTwoFactorLogin(temporaryToken, otpCode)
      }
      navigate(location.state?.from || '/dashboard')
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
    padding: '12px 16px',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    transition: 'all 150ms ease',
  }

  const inputFocusStyle = {
    borderColor: 'var(--color-primary)',
    boxShadow: '0 0 0 3px var(--color-primary-glow)',
    backgroundColor: 'var(--color-surface-hover)',
  }

  const btnPrimary = (disabled) => ({
    width: '100%',
    padding: '14px',
    background: disabled 
      ? 'var(--color-surface-active)' 
      : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
    color: disabled ? 'var(--color-text-muted)' : 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: '8px',
    transition: 'all 200ms ease',
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
  })

  // Icons
  const UserIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )

  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )

  const WarningIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  )

  const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )

  const KeyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )

  const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-family)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient effect */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div 
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: '48px 40px',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--color-border)',
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          {logoUrl
            ? <img 
                src={logoUrl} 
                alt={`${portalTitle} logo`} 
                style={{ 
                  height: '56px', 
                  width: 'auto', 
                  objectFit: 'contain', 
                  marginBottom: '16px', 
                  borderRadius: '8px' 
                }} 
              />
            : <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
          }
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: 'var(--color-text)', 
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            {portalTitle}
          </h1>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            marginTop: '8px', 
            fontSize: '14px' 
          }}>
            Accedi al portale di gestione
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500', 
              marginBottom: '8px', 
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}>
              <UserIcon />
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus={!twoFactorRequired}
              disabled={twoFactorRequired}
              placeholder="Inserisci username"
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={e => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.boxShadow = 'none'
                e.target.style.backgroundColor = 'var(--color-surface)'
              }}
            />
          </div>

          {!twoFactorRequired && (
          <div style={{ marginBottom: '28px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500', 
              marginBottom: '8px', 
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}>
              <LockIcon />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Inserisci password"
              style={inputStyle}
              onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={e => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.boxShadow = 'none'
                e.target.style.backgroundColor = 'var(--color-surface)'
              }}
            />
          </div>
          )}

          {twoFactorRequired && (
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--color-text-secondary)',
                fontSize: '14px',
              }}>
                <LockIcon />
                Codice Google Authenticator
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                placeholder="Inserisci codice a 6 cifre"
                inputMode="numeric"
                maxLength={6}
                style={inputStyle}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--color-border)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.backgroundColor = 'var(--color-surface)'
                }}
              />
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: 'var(--color-danger-bg)',
              color: '#f87171',
              padding: '14px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid var(--color-danger-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <WarningIcon />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={btnPrimary(isLoading)}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = isLoading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Accesso in corso...
              </span>
            ) : twoFactorRequired ? 'Verifica codice 2FA' : 'Accedi'}
          </button>
        </form>

        {!twoFactorRequired && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '13px' 
        }}>
          <button
            onClick={() => openModal('username')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-primary-light)', 
              cursor: 'pointer', 
              padding: '4px 0',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
          >
            Username dimenticato?
          </button>
          <button
            onClick={() => openModal('password')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-primary-light)', 
              cursor: 'pointer', 
              padding: '4px 0',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary-light)'}
          >
            Password dimenticata?
          </button>
        </div>
        )}

        {import.meta.env.DEV && (
          <div style={{
            marginTop: '28px',
            padding: '16px',
            backgroundColor: 'var(--color-primary-glow)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--color-primary-light)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}>
            <strong style={{ color: 'var(--color-text)' }}>Primo accesso:</strong>
            <div style={{ marginTop: '8px' }}>
              Username: <code style={{ color: 'var(--color-text)', fontFamily: 'monospace' }}>admin</code>
              <br />
              La password generata automaticamente è visibile nei log del server al primo avvio.
            </div>
          </div>
        )}
      </div>

      {/* Modal overlay */}
      {modal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '440px',
              border: '1px solid var(--color-border)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
              position: 'relative',
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              <CloseIcon />
            </button>

            {modal === 'username' && (
              <>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '24px' 
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-light)',
                  }}>
                    <SearchIcon />
                  </div>
                  <div>
                    <h2 style={{ 
                      color: 'var(--color-text)', 
                      margin: 0, 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                    }}>
                      Recupera Username
                    </h2>
                    <p style={{ 
                      color: 'var(--color-text-secondary)', 
                      margin: '4px 0 0', 
                      fontSize: '13px' 
                    }}>
                      Inserisci la tua email per recuperare lo username
                    </p>
                  </div>
                </div>
                
                <form onSubmit={handleForgotUsername}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '500', 
                    marginBottom: '8px', 
                    color: 'var(--color-text-secondary)',
                    fontSize: '14px',
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={fuEmail}
                    onChange={e => setFuEmail(e.target.value)}
                    required
                    placeholder="nome@esempio.com"
                    style={inputStyle}
                    onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--color-border)'
                      e.target.style.boxShadow = 'none'
                      e.target.style.backgroundColor = 'var(--color-surface)'
                    }}
                  />
                  <button type="submit" disabled={fuLoading} style={btnPrimary(fuLoading)}>
                    {fuLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                        Ricerca...
                      </span>
                    ) : 'Cerca username'}
                  </button>
                </form>
                {fuResult && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '14px 16px', 
                    backgroundColor: 'var(--color-success-bg)', 
                    borderRadius: '10px', 
                    color: '#4ade80', 
                    fontSize: '14px',
                    border: '1px solid var(--color-success-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <CheckIcon />
                    {fuResult.email_sent
                      ? 'Username inviato alla tua email!'
                      : <>Il tuo username e: <strong style={{ color: 'var(--color-text)' }}>{fuResult.username}</strong></>
                    }
                  </div>
                )}
                {fuError && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '14px 16px', 
                    backgroundColor: 'var(--color-danger-bg)', 
                    borderRadius: '10px', 
                    color: '#f87171', 
                    fontSize: '14px',
                    border: '1px solid var(--color-danger-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <WarningIcon />
                    {fuError}
                  </div>
                )}
              </>
            )}

            {modal === 'password' && (
              <>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  marginBottom: '24px' 
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-light)',
                  }}>
                    <KeyIcon />
                  </div>
                  <div>
                    <h2 style={{ 
                      color: 'var(--color-text)', 
                      margin: 0, 
                      fontSize: '1.1rem',
                      fontWeight: '600',
                    }}>
                      Recupera Password
                    </h2>
                    <p style={{ 
                      color: 'var(--color-text-secondary)', 
                      margin: '4px 0 0', 
                      fontSize: '13px' 
                    }}>
                      {fpStep === 1 ? 'Inserisci la tua email per ricevere il link di reset' : 'Inserisci il token e la nuova password'}
                    </p>
                  </div>
                </div>

                {fpStep === 1 && (
                  <form onSubmit={handleRequestToken}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: '500', 
                      marginBottom: '8px', 
                      color: 'var(--color-text-secondary)',
                      fontSize: '14px',
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={fpEmail}
                      onChange={e => setFpEmail(e.target.value)}
                      required
                      placeholder="nome@esempio.com"
                      style={inputStyle}
                      onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={e => {
                        e.target.style.borderColor = 'var(--color-border)'
                        e.target.style.boxShadow = 'none'
                        e.target.style.backgroundColor = 'var(--color-surface)'
                      }}
                    />
                    <button type="submit" disabled={fpLoading} style={btnPrimary(fpLoading)}>
                      {fpLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                          Invio...
                        </span>
                      ) : 'Invia link di reset'}
                    </button>
                    {fpResult?.email_sent && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '14px 16px', 
                        backgroundColor: 'var(--color-success-bg)', 
                        borderRadius: '10px', 
                        color: '#4ade80', 
                        fontSize: '14px',
                        border: '1px solid var(--color-success-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        <CheckIcon />
                        Link di reset inviato alla tua email!
                      </div>
                    )}
                    {fpError && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '14px 16px', 
                        backgroundColor: 'var(--color-danger-bg)', 
                        borderRadius: '10px', 
                        color: '#f87171', 
                        fontSize: '14px',
                        border: '1px solid var(--color-danger-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        <WarningIcon />
                        {fpError}
                      </div>
                    )}
                  </form>
                )}

                {fpStep === 2 && (
                  <form onSubmit={handleResetPassword}>
                    {!fpResult?.email_sent && (
                      <div style={{ 
                        marginBottom: '16px', 
                        padding: '14px 16px', 
                        backgroundColor: 'var(--color-primary-glow)', 
                        borderRadius: '10px', 
                        fontSize: '13px', 
                        color: 'var(--color-primary-light)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                      }}>
                        <strong style={{ color: 'var(--color-text)' }}>Token di reset:</strong>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          wordBreak: 'break-all', 
                          marginTop: '6px',
                          color: 'var(--color-text)',
                          fontSize: '12px',
                        }}>
                          {fpToken}
                        </div>
                        <div style={{ marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                          Scade tra 30 minuti
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: '500', 
                        marginBottom: '8px', 
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px',
                      }}>
                        Token
                      </label>
                      <input
                        type="text"
                        value={fpToken}
                        onChange={e => setFpToken(e.target.value)}
                        required
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => {
                          e.target.style.borderColor = 'var(--color-border)'
                          e.target.style.boxShadow = 'none'
                          e.target.style.backgroundColor = 'var(--color-surface)'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: '500', 
                        marginBottom: '8px', 
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px',
                      }}>
                        Nuova password (min. 8 caratteri)
                      </label>
                      <input
                        type="password"
                        value={fpNewPassword}
                        onChange={e => setFpNewPassword(e.target.value)}
                        required
                        minLength={8}
                        placeholder="Nuova password"
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => {
                          e.target.style.borderColor = 'var(--color-border)'
                          e.target.style.boxShadow = 'none'
                          e.target.style.backgroundColor = 'var(--color-surface)'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: '500', 
                        marginBottom: '8px', 
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px',
                      }}>
                        Conferma password
                      </label>
                      <input
                        type="password"
                        value={fpConfirmPassword}
                        onChange={e => setFpConfirmPassword(e.target.value)}
                        required
                        placeholder="Conferma password"
                        style={inputStyle}
                        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                        onBlur={e => {
                          e.target.style.borderColor = 'var(--color-border)'
                          e.target.style.boxShadow = 'none'
                          e.target.style.backgroundColor = 'var(--color-surface)'
                        }}
                      />
                    </div>

                    <button type="submit" disabled={fpLoading} style={btnPrimary(fpLoading)}>
                      {fpLoading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                          Reset...
                        </span>
                      ) : 'Reimposta password'}
                    </button>

                    {fpResult && typeof fpResult === 'string' && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '14px 16px', 
                        backgroundColor: 'var(--color-success-bg)', 
                        borderRadius: '10px', 
                        color: '#4ade80', 
                        fontSize: '14px',
                        border: '1px solid var(--color-success-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        <CheckIcon />
                        {fpResult}
                      </div>
                    )}
                    {fpError && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '14px 16px', 
                        backgroundColor: 'var(--color-danger-bg)', 
                        borderRadius: '10px', 
                        color: '#f87171', 
                        fontSize: '14px',
                        border: '1px solid var(--color-danger-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}>
                        <WarningIcon />
                        {fpError}
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
