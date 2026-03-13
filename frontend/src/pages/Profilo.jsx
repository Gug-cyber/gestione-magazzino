import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfilo } from '../api/client'
import { useIsMobile } from '../hooks/useIsMobile'

function Profilo() {
  const { user, setUser } = useAuth()
  const isMobile = useIsMobile()

  const [nuovoUsername, setNuovoUsername] = useState(user?.username || '')
  const [usernameMsg, setUsernameMsg] = useState(null)
  const [usernameError, setUsernameError] = useState(null)

  const [nuovaEmail, setNuovaEmail] = useState(user?.email || '')
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailError, setEmailError] = useState(null)

  const [passwordAttuale, setPasswordAttuale] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  const handleSalvaUsername = async (e) => {
    e.preventDefault()
    setUsernameMsg(null)
    setUsernameError(null)
    try {
      const res = await updateProfilo({ username: nuovoUsername })
      setUser(res.data)
      setUsernameMsg('Username aggiornato con successo!')
    } catch (err) {
      setUsernameError(err.response?.data?.detail || 'Errore durante l\'aggiornamento del username')
    }
  }

  const handleSalvaEmail = async (e) => {
    e.preventDefault()
    setEmailMsg(null)
    setEmailError(null)
    try {
      const res = await updateProfilo({ email: nuovaEmail })
      setUser(res.data)
      setEmailMsg('Email aggiornata con successo!')
    } catch (err) {
      setEmailError(err.response?.data?.detail || 'Errore durante l\'aggiornamento dell\'email')
    }
  }

  const handleCambiaPassword = async (e) => {
    e.preventDefault()
    setPasswordMsg(null)
    setPasswordError(null)
    if (nuovaPassword.length < 8) {
      setPasswordError('La nuova password deve contenere almeno 8 caratteri')
      return
    }
    if (nuovaPassword !== confermaPassword) {
      setPasswordError('Le password non corrispondono')
      return
    }
    try {
      await updateProfilo({
        current_password: passwordAttuale,
        new_password: nuovaPassword,
      })
      setPasswordMsg('Password cambiata con successo!')
      setPasswordAttuale('')
      setNuovaPassword('')
      setConfermaPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Errore durante il cambio password')
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px', color: '#1a237e' }}>👤 Profilo</h1>

      {/* Sezione cambio username */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: isMobile ? '16px' : '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        maxWidth: isMobile ? '100%' : '480px',
      }}>
        <h2 style={{ marginBottom: '16px', color: '#333' }}>✏️ Cambia Username</h2>
        <form onSubmit={handleSalvaUsername}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#555', fontWeight: 600 }}>
              Nuovo username
            </label>
            <input
              type="text"
              value={nuovoUsername}
              onChange={(e) => setNuovoUsername(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          {usernameMsg && <p style={successStyle}>{usernameMsg}</p>}
          {usernameError && <p style={errorStyle}>{usernameError}</p>}
          <button type="submit" style={btnStyle}>
            💾 Salva username
          </button>
        </form>
      </div>

      {/* Sezione cambio email */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: isMobile ? '16px' : '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        maxWidth: isMobile ? '100%' : '480px',
      }}>
        <h2 style={{ marginBottom: '16px', color: '#333' }}>📧 Cambia Email</h2>
        <form onSubmit={handleSalvaEmail}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#555', fontWeight: 600 }}>
              Nuova email
            </label>
            <input
              type="email"
              value={nuovaEmail}
              onChange={(e) => setNuovaEmail(e.target.value)}
              required
              placeholder="Inserisci nuova email"
              style={inputStyle}
            />
          </div>
          {emailMsg && <p style={successStyle}>{emailMsg}</p>}
          {emailError && <p style={errorStyle}>{emailError}</p>}
          <button type="submit" style={btnStyle}>
            💾 Salva email
          </button>
        </form>
      </div>

      {/* Sezione cambio password */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: isMobile ? '16px' : '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: isMobile ? '100%' : '480px',
      }}>
        <h2 style={{ marginBottom: '16px', color: '#333' }}>🔒 Cambia Password</h2>
        <form onSubmit={handleCambiaPassword}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#555', fontWeight: 600 }}>
              Password attuale
            </label>
            <input
              type="password"
              value={passwordAttuale}
              onChange={(e) => setPasswordAttuale(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#555', fontWeight: 600 }}>
              Nuova password
            </label>
            <input
              type="password"
              value={nuovaPassword}
              onChange={(e) => setNuovaPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#555', fontWeight: 600 }}>
              Conferma nuova password
            </label>
            <input
              type="password"
              value={confermaPassword}
              onChange={(e) => setConfermaPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          {passwordMsg && <p style={successStyle}>{passwordMsg}</p>}
          {passwordError && <p style={errorStyle}>{passwordError}</p>}
          <button type="submit" style={btnStyle}>
            🔑 Cambia password
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '1rem',
  boxSizing: 'border-box',
}

const btnStyle = {
  backgroundColor: '#1a237e',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 20px',
  cursor: 'pointer',
  fontSize: '0.95rem',
  fontWeight: 600,
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

