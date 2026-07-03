import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { updateProfilo } from '../../api/clientiAuth'
import { useClientiAuth } from '../../context/ClientiAuthContext'

export default function StoreAccountPage() {
  const { cliente, loading, logout, refreshProfilo } = useClientiAuth()
  const location = useLocation()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    cognome: cliente?.cognome || '',
    telefono: cliente?.telefono || '',
    indirizzo: cliente?.indirizzo || '',
    numero_civico: cliente?.numero_civico || '',
    citta: cliente?.citta || '',
    cap: cliente?.cap || '',
    provincia: cliente?.provincia || '',
    paese: cliente?.paese || 'Italia',
    indirizzo_nome_destinatario: cliente?.indirizzo_nome_destinatario || '',
    indirizzo_cognome_destinatario: cliente?.indirizzo_cognome_destinatario || '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <StoreLayout>
        <div className="page-loading">Caricamento account...</div>
      </StoreLayout>
    )
  }

  if (!cliente) {
    return <Navigate to="/store/login" replace state={{ from: location }} />
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await updateProfilo(formData)
      await refreshProfilo()
      setMessage('Profilo aggiornato con successo!')
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  const hasAddress = !!(cliente?.indirizzo && cliente?.citta)

  return (
    <StoreLayout>
      <div className="account-page">
        <div className="account-container">
          <div className="account-header">
            <h1>Il mio Account</h1>
            <button onClick={logout} className="btn btn-outline btn-sm">
              Esci
            </button>
          </div>

          <div className="account-nav">
            <Link to="/store/ordini" className="account-nav-item">📦 I miei Ordini</Link>
          </div>

          {!hasAddress && !editing && (
            <div className="alert alert-warning">
              ⚠️ Aggiungi un <strong>indirizzo di spedizione</strong> al tuo profilo per velocizzare il checkout.
            </div>
          )}

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="account-info">
            <div className="account-info-header">
              <h2>Informazioni Personali</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn btn-sm">
                  ✏️ Modifica
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="auth-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome</label>
                    <input name="nome" value={formData.nome} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Cognome</label>
                    <input name="cognome" value={formData.cognome} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Telefono</label>
                  <input name="telefono" value={formData.telefono} onChange={handleChange} />
                </div>

                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: '#1a237e' }}>
                  📍 Indirizzo di spedizione
                </h3>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 3 }}>
                    <label>Indirizzo (via/piazza)</label>
                    <input name="indirizzo" value={formData.indirizzo} onChange={handleChange} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>N. Civico</label>
                    <input name="numero_civico" value={formData.numero_civico} onChange={handleChange} placeholder="es. 42" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Città</label>
                    <input name="citta" value={formData.citta} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>CAP</label>
                    <input name="cap" value={formData.cap} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Provincia</label>
                    <input name="provincia" value={formData.provincia} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Paese</label>
                  <input name="paese" value={formData.paese} onChange={handleChange} placeholder="Italia" />
                </div>

                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: '#555' }}>
                  👤 Destinatario diverso (opzionale)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
                  Compilare solo se il destinatario è diverso dal titolare dell'account.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome destinatario</label>
                    <input
                      name="indirizzo_nome_destinatario"
                      value={formData.indirizzo_nome_destinatario}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cognome destinatario</label>
                    <input
                      name="indirizzo_cognome_destinatario"
                      value={formData.indirizzo_cognome_destinatario}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">
                    Annulla
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <p><strong>Email:</strong> {cliente?.email}</p>
                <p><strong>Nome:</strong> {cliente?.nome} {cliente?.cognome}</p>
                <p><strong>Telefono:</strong> {cliente?.telefono || '-'}</p>

                <h3 style={{ marginTop: '1rem', marginBottom: '0.25rem', color: '#1a237e' }}>
                  📍 Indirizzo di spedizione
                </h3>
                {hasAddress ? (
                  <>
                    <p>
                      <strong>Via:</strong> {cliente?.indirizzo}
                      {cliente?.numero_civico ? `, ${cliente.numero_civico}` : ''}
                    </p>
                    <p><strong>Città:</strong> {cliente?.citta} {cliente?.cap ? `(${cliente.cap})` : ''}</p>
                    {cliente?.provincia && <p><strong>Provincia:</strong> {cliente.provincia}</p>}
                    {cliente?.paese && cliente.paese !== 'Italia' && (
                      <p><strong>Paese:</strong> {cliente.paese}</p>
                    )}
                    {(cliente?.indirizzo_nome_destinatario || cliente?.indirizzo_cognome_destinatario) && (
                      <p>
                        <strong>Destinatario:</strong>{' '}
                        {cliente.indirizzo_nome_destinatario} {cliente.indirizzo_cognome_destinatario}
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ color: '#888' }}>Nessun indirizzo salvato</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  )
}
