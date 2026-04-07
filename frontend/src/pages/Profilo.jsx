import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfilo, activityLogAPI } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'
import useLogoSettings from '../hooks/useLogoSettings'
import { getAzioneBadge } from '../utils/formatters'
import '../styles/shared.css'

function getPasswordStrength(password) {
  if (!password) return null
  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSymbols = /[^a-zA-Z0-9]/.test(password)
  const len = password.length
  if (len >= 10 && hasLetters && hasNumbers && hasSymbols) {
    return { label: 'Forte', color: 'var(--success)', width: '100%' }
  }
  if (len >= 6 && ((hasLetters && hasNumbers) || (hasLetters && hasSymbols) || (hasNumbers && hasSymbols))) {
    return { label: 'Media', color: 'var(--warning)', width: '66%' }
  }
  return { label: 'Debole', color: 'var(--danger)', width: '33%' }
}

// Icons
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

const PaletteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="0.5"/>
    <circle cx="17.5" cy="10.5" r="0.5"/>
    <circle cx="8.5" cy="7.5" r="0.5"/>
    <circle cx="6.5" cy="12.5" r="0.5"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
  </svg>
)

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)

function Profilo() {
  const { user, setUser } = useAuth()
  const isMobile = useIsMobile()
  const { logoUrl, portalTitle, setLogo, setPortalTitle, resetToDefault, DEFAULT_TITLE } = useLogoSettings()
  const fileInputRef = useRef(null)

  const isAdmin = user?.is_admin
  const mustChangePassword = user?.must_change_password === true

  const tabs = isAdmin ? ['account', 'sicurezza', 'attivita', 'portale'] : ['account', 'sicurezza', 'attivita']
  const [activeTab, setActiveTab] = useState(mustChangePassword ? 'sicurezza' : 'account')

  const [nuovoUsername, setNuovoUsername] = useState(user?.username || '')
  const [nuovaEmail, setNuovaEmail] = useState(user?.email || '')
  const [accountMsg, setAccountMsg] = useState(null)

  const [passwordAttuale, setPasswordAttuale] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)

  const [logoMsg, setLogoMsg] = useState(null)
  const [customTitle, setCustomTitle] = useState(portalTitle === DEFAULT_TITLE ? '' : portalTitle)

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [attivita, setAttivita] = useState([])
  const [attivitaLoading, setAttivitaLoading] = useState(false)
  const [attivitaError, setAttivitaError] = useState(null)

  useEffect(() => {
    if (activeTab !== 'attivita') return
    setAttivitaLoading(true)
    setAttivitaError(null)
    activityLogAPI.getMine({ limit: 20 })
      .then(res => setAttivita(res.data || []))
      .catch(err => setAttivitaError(err.response?.data?.detail || 'Errore nel caricamento'))
      .finally(() => setAttivitaLoading(false))
  }, [activeTab])

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
      const res = await updateProfilo({
        current_password: passwordAttuale,
        new_password: nuovaPassword,
      })
      setUser(res.data)
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
      setLogoMsg({ type: 'error', text: 'Il file e troppo grande. Dimensione massima: 2 MB.' })
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
    account: { icon: <UserIcon />, label: 'Account' },
    sicurezza: { icon: <LockIcon />, label: 'Sicurezza' },
    attivita: { icon: <ActivityIcon />, label: 'Attivita' },
    portale: { icon: <PaletteIcon />, label: 'Portale' },
  }

  return (
    <div style={{ maxWidth: isMobile ? '100%' : '600px' }}>
      {/* Forced password change warning */}
      {mustChangePassword && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          color: '#856404',
          fontSize: '14px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
          <div>
            <strong>Cambio password obbligatorio</strong>
            <div style={{ marginTop: '4px' }}>
              Per motivi di sicurezza devi impostare una nuova password prima di poter utilizzare il sistema.
            </div>
          </div>
        </div>
      )}

      {/* Identity Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)',
        padding: isMobile ? '20px 16px' : '24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        color: 'white',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '1px',
          flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.3)',
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
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 600 : 500,
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: 'inherit',
              marginBottom: '-1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {tabLabels[tab].icon}
            {tabLabels[tab].label}
          </button>
        ))}
      </div>

      {/* Tab content panel */}
      <div className="card" style={{
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        padding: isMobile ? '20px 16px' : '28px 24px',
      }}>
        {/* Account tab */}
        {activeTab === 'account' && (
          <form onSubmit={handleSalvaAccount}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Username</label>
              <input
                type="text"
                value={nuovoUsername}
                onChange={(e) => setNuovoUsername(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={nuovaEmail}
                onChange={(e) => setNuovaEmail(e.target.value)}
                required
                placeholder="Inserisci email"
                className="form-input"
              />
            </div>
            {accountMsg && (
              <div className={accountMsg.type === 'success' ? 'success-msg' : 'error-banner'} style={{ marginBottom: '16px' }}>
                {accountMsg.text}
              </div>
            )}
            <button type="submit" className="btn-primary">
              <SaveIcon /> Salva modifiche
            </button>
          </form>
        )}

        {/* Sicurezza tab */}
        {activeTab === 'sicurezza' && (
          <form onSubmit={handleCambiaPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Password attuale</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={passwordAttuale}
                  onChange={(e) => setPasswordAttuale(e.target.value)}
                  required
                  className="form-input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px',
                  }}
                >
                  {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label className="form-label">Nuova password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={nuovaPassword}
                  onChange={(e) => setNuovaPassword(e.target.value)}
                  required
                  className="form-input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px',
                  }}
                >
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {nuovaPassword && passwordStrength && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ height: '4px', borderRadius: '4px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
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
              <label className="form-label">Conferma nuova password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confermaPassword}
                  onChange={(e) => setConfermaPassword(e.target.value)}
                  required
                  className="form-input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px',
                  }}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {passwordMsg && (
              <div className={passwordMsg.type === 'success' ? 'success-msg' : 'error-banner'} style={{ marginBottom: '16px' }}>
                {passwordMsg.text}
              </div>
            )}
            <button type="submit" className="btn-primary">
              <LockIcon /> Cambia password
            </button>
          </form>
        )}

        {/* Attivita tab */}
        {activeTab === 'attivita' && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Le ultime 20 attivita del tuo account.
            </p>
            {attivitaLoading && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Caricamento...</div>
            )}
            {attivitaError && (
              <div className="error-banner">{attivitaError}</div>
            )}
            {!attivitaLoading && !attivitaError && attivita.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Nessuna attivita registrata.</div>
            )}
            {attivita.map(log => {
              const badge = getAzioneBadge(log.azione)
              return (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-primary)',
                }}>
                  <div style={{ minWidth: '130px', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '2px' }}>
                    {new Date(log.eseguito_il).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    <span className="badge" style={{
                      background: badge.bg,
                      color: badge.color,
                      marginRight: '8px',
                    }}>
                      {log.azione}
                    </span>
                    {log.entita && (
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {log.entita}{log.entita_id ? ` #${log.entita_id}` : ''}{log.dettagli ? ` - ${log.dettagli}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Portale tab (admin only) */}
        {activeTab === 'portale' && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Carica un logo personalizzato e imposta il nome del portale. Le modifiche sono salvate nel browser.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Logo attuale</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {logoUrl
                  ? <img src={logoUrl} alt="Logo corrente" style={{ height: '48px', width: 'auto', maxWidth: '180px', objectFit: 'contain', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '4px', background: 'var(--bg-tertiary)' }} />
                  : <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nessun logo caricato (viene mostrato il testo del portale)</span>
                }
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Carica nuovo logo</label>
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
                  className="btn-primary"
                >
                  <UploadIcon /> Scegli immagine
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => { setLogo(null); setMsgWithAutoDismiss(setLogoMsg, { type: 'success', text: 'Logo rimosso.' }) }}
                    className="btn-danger"
                  >
                    <TrashIcon /> Rimuovi
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Formati supportati: PNG, JPG, SVG. Max 2 MB.</p>
            </div>

            <form onSubmit={handleSaveTitolo}>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Titolo del portale</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={DEFAULT_TITLE}
                  maxLength={60}
                  className="form-input"
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Lascia vuoto per usare il titolo predefinito: <em>{DEFAULT_TITLE}</em>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary">
                  <SaveIcon /> Salva titolo
                </button>
                <button type="button" onClick={handleReset} className="btn-secondary">
                  <RefreshIcon /> Ripristina predefiniti
                </button>
              </div>
            </form>

            {logoMsg && (
              <div className={logoMsg.type === 'success' ? 'success-msg' : 'error-banner'} style={{ marginTop: '16px' }}>
                {logoMsg.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profilo
