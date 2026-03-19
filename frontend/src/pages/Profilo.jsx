import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfilo } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import useLogoSettings from '../hooks/useLogoSettings'
import { PRIMARY_COLOR } from '../constants/colors'

function getPasswordStrength(password) {
  if (!password) return null
  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSymbols = /[^a-zA-Z0-9]/.test(password)
  const len = password.length
  if (len >= 10 && hasLetters && hasNumbers && hasSymbols) {
    return { label: 'Forte', color: '#43a047', width: '100%' }
  }
  if (len >= 6 && ((hasLetters && hasNumbers) || (hasLetters && hasSymbols) || (hasNumbers && hasSymbols))) {
    return { label: 'Media', color: '#fb8c00', width: '66%' }
  }
  return { label: 'Debole', color: '#e53935', width: '33%' }
}

function Profilo() {
  const { user, setUser } = useAuth()
  const isMobile = useIsMobile()
  const { logoUrl, portalTitle, setLogo, setPortalTitle, resetToDefault, DEFAULT_TITLE } = useLogoSettings()
  const fileInputRef = useRef(null)

  const isAdmin = user?.is_admin

  // Tab state — show Portale only for admins
  const tabs = isAdmin ? ['account', 'sicurezza', 'portale'] : ['account', 'sicurezza']
  const [activeTab, setActiveTab] = useState('account')

  // Account tab state
  const [nuovoUsername, setNuovoUsername] = useState(user?.username || '')
  const [nuovaEmail, setNuovaEmail] = useState(user?.email || '')
  const [accountMsg, setAccountMsg] = useState(null)

  // Sicurezza tab state
  const [passwordAttuale, setPasswordAttuale] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)

  // Portale tab state
  const [logoMsg, setLogoMsg] = useState(null)
  const [customTitle, setCustomTitle] = useState(portalTitle === DEFAULT_TITLE ? '' : portalTitle)

  // Password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Set message with auto-dismiss for success
  const setMsgWithAutoDismiss = (setter, msg) => {
    setter(msg)
    if (msg?.type === 'success') {
      setTimeout(() => setter(null), 4000)
    }
  }

  const handleSalvaAccount = async (e) => {
    e.preventDefault()
    setAccountMsg(null)
    try {
      const res = await updateProfilo({ username: nuovoUsername, email: nuovaEmail })
      setUser(res.data)
      setMsgWithAutoDismiss(setAccountMsg, { type: 'success', text: 'Dati account aggiornati con successo!' })
    } catch (err) {
      setAccountMsg({ type: 'error', text: err.response?.data?.detail || 'Errore durante l\'aggiornamento' })
    }
  }

  const handleCambiaPassword = async (e) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (nuovaPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'La nuova password deve contenere almeno 8 caratteri' })
      return
    }
    if (nuovaPassword !== confermaPassword) {
      setPasswordMsg({ type: 'error', text: 'Le password non corrispondono' })
      return
    }
    try {
      await updateProfilo({
        current_password: passwordAttuale,
        new_password: nuovaPassword,
      })
      setMsgWithAutoDismiss(setPasswordMsg, { type: 'success', text: 'Password cambiata con successo!' })
      setPasswordAttuale('')
      setNuovaPassword('')
      setConfermaPassword('')
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.detail || 'Errore durante il cambio password' })
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoMsg({ type: 'error', text: 'Seleziona un file immagine valido (PNG, JPG, SVG, ecc.)' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg({ type: 'error', text: 'Il file è troppo grande. Dimensione massima: 2 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogo(ev.target.result)
      setMsgWithAutoDismiss(setLogoMsg, { type: 'success', text: 'Logo aggiornato con successo!' })
    }
    reader.onerror = () => {
      setLogoMsg({ type: 'error', text: 'Errore durante la lettura del file. Riprova.' })
    }
    reader.readAsDataURL(file)
    // reset input so the same file can be re-selected
    e.target.value = ''
  }

  const handleSaveTitolo = (e) => {
    e.preventDefault()
    setPortalTitle(customTitle.trim() || DEFAULT_TITLE)
    setMsgWithAutoDismiss(setLogoMsg, { type: 'success', text: 'Titolo del portale aggiornato!' })
  }

  const handleReset = () => {
    resetToDefault()
    setCustomTitle('')
    setMsgWithAutoDismiss(setLogoMsg, { type: 'success', text: 'Impostazioni ripristinate ai valori predefiniti.' })
  }

  const rawName = user?.username || '?'
  const initials = rawName.length >= 2
    ? rawName.slice(0, 2).toUpperCase()
    : rawName.slice(0, 1).toUpperCase()
  const passwordStrength = getPasswordStrength(nuovaPassword)

  const tabLabels = {
    account: '👤 Account',
    sicurezza: '🔐 Sicurezza',
    portale: '🎨 Portale',
  }

  return (
    <div style={{ maxWidth: isMobile ? '100%' : '560px' }}>

      {/* Chi sei — identity banner */}
      <div style={{
        background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #283593 100%)`,
        borderRadius: '12px',
        padding: isMobile ? '20px 16px' : '24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: 'white',
        boxShadow: '0 4px 16px rgba(26,35,126,0.2)',
      }}>
        {/* Avatar with initials */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '1px',
          flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.5)',
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '18px', lineHeight: 1.2 }}>{user?.username}</div>
          <div style={{ opacity: 0.85, fontSize: '14px', marginTop: '2px' }}>{user?.email}</div>
          <div style={{
            display: 'inline-block',
            marginTop: '6px',
            padding: '2px 10px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.2)',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {user?.ruolo || (isAdmin ? 'admin' : 'utente')}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '0',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid #e0e4ef',
        background: 'white',
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 -1px 0 #e0e4ef',
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeTab === tab ? `3px solid ${PRIMARY_COLOR}` : '3px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? PRIMARY_COLOR : '#666',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: 'inherit',
              marginBottom: '-2px',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab content panel */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0 0 12px 12px',
        padding: isMobile ? '20px 16px' : '28px 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>

        {/* ── Account tab ── */}
        {activeTab === 'account' && (
          <form onSubmit={handleSalvaAccount}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={nuovoUsername}
                onChange={(e) => setNuovoUsername(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={nuovaEmail}
                onChange={(e) => setNuovaEmail(e.target.value)}
                required
                placeholder="Inserisci email"
                style={inputStyle}
              />
            </div>
            {accountMsg && (
              <p style={accountMsg.type === 'success' ? successStyle : errorStyle} aria-live="polite">
                {accountMsg.text}
              </p>
            )}
            <button type="submit" style={btnStyle}>💾 Salva modifiche</button>
          </form>
        )}

        {/* ── Sicurezza tab ── */}
        {activeTab === 'sicurezza' && (
          <form onSubmit={handleCambiaPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password attuale</label>
              <div style={pwdWrapStyle}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={passwordAttuale}
                  onChange={(e) => setPasswordAttuale(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  style={eyeBtnStyle}
                  aria-label="Mostra/nascondi password"
                >
                  {showCurrent ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Nuova password</label>
              <div style={pwdWrapStyle}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={nuovaPassword}
                  onChange={(e) => setNuovaPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  style={eyeBtnStyle}
                  aria-label="Mostra/nascondi password"
                >
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {/* Password strength indicator */}
            {nuovaPassword && passwordStrength && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ height: '4px', borderRadius: '4px', background: '#e0e4ef', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: passwordStrength.width,
                    background: passwordStrength.color,
                    transition: 'width 0.3s, background 0.3s',
                    borderRadius: '4px',
                  }} />
                </div>
                <span style={{ fontSize: '12px', color: passwordStrength.color, fontWeight: 600, marginTop: '4px', display: 'block' }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Conferma nuova password</label>
              <div style={pwdWrapStyle}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confermaPassword}
                  onChange={(e) => setConfermaPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={eyeBtnStyle}
                  aria-label="Mostra/nascondi password"
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {passwordMsg && (
              <p style={passwordMsg.type === 'success' ? successStyle : errorStyle} aria-live="polite">
                {passwordMsg.text}
              </p>
            )}
            <button type="submit" style={btnStyle}>🔑 Cambia password</button>
          </form>
        )}

        {/* ── Portale tab (admin only) ── */}
        {activeTab === 'portale' && (
          <div>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              Carica un logo personalizzato e imposta il nome del portale. Le modifiche sono salvate nel browser.
            </p>

            {/* Logo preview */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Logo attuale</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo corrente" style={{ height: '48px', width: 'auto', maxWidth: '180px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '6px', padding: '4px', background: '#f9f9f9' }} />
                  : <span style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>Nessun logo caricato (viene mostrato il testo del portale)</span>
                }
              </div>
            </div>

            {/* Upload logo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Carica nuovo logo</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={btnStyle}
                >
                  📁 Scegli immagine
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => { setLogo(null); setMsgWithAutoDismiss(setLogoMsg, { type: 'success', text: 'Logo rimosso.' }) }}
                    style={{ ...btnStyle, backgroundColor: '#c62828' }}
                  >
                    🗑️ Rimuovi
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '6px' }}>Formati supportati: PNG, JPG, SVG. Max 2 MB.</p>
            </div>

            {/* Portal title */}
            <form onSubmit={handleSaveTitolo}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Titolo del portale</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={DEFAULT_TITLE}
                  maxLength={60}
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                  Lascia vuoto per usare il titolo predefinito: <em>{DEFAULT_TITLE}</em>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="submit" style={btnStyle}>
                  💾 Salva titolo
                </button>
                <button type="button" onClick={handleReset} style={{ ...btnStyle, backgroundColor: '#546e7a' }}>
                  ↩️ Ripristina predefiniti
                </button>
              </div>
            </form>

            {logoMsg && (
              <p style={logoMsg.type === 'success' ? successStyle : errorStyle} aria-live="polite">
                {logoMsg.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  color: '#555',
  fontWeight: 600,
  fontSize: '14px',
}

const inputStyle = {
  width: '100%',
  height: '38px',
  padding: '0 12px',
  borderRadius: '6px',
  border: '1.5px solid #e0e4ef',
  fontSize: '14px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#1a1a2e',
  background: '#fff',
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
}

const pwdWrapStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
}

const eyeBtnStyle = {
  position: 'absolute',
  right: '10px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  lineHeight: 1,
  padding: '0',
  display: 'flex',
  alignItems: 'center',
}

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '36px',
  padding: '0 16px',
  backgroundColor: PRIMARY_COLOR,
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

const successStyle = {
  color: '#2e7d32',
  backgroundColor: '#e8f5e9',
  padding: '8px 12px',
  borderRadius: '6px',
  marginBottom: '12px',
}

const errorStyle = {
  color: '#c62828',
  backgroundColor: '#ffebee',
  padding: '8px 12px',
  borderRadius: '6px',
  marginBottom: '12px',
}

export default Profilo

