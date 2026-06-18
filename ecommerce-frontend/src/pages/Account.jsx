/**
 * Pagina Account - Profilo cliente.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfilo } from '../api/auth';

export default function Account() {
  const { cliente, logout, refreshProfilo } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    cognome: cliente?.cognome || '',
    telefono: cliente?.telefono || '',
    indirizzo: cliente?.indirizzo || '',
    citta: cliente?.citta || '',
    cap: cliente?.cap || '',
    provincia: cliente?.provincia || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateProfilo(formData);
      await refreshProfilo();
      setMessage('Profilo aggiornato con successo!');
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Il mio Account</h1>
          <button onClick={logout} className="btn btn-outline btn-sm">
            Esci
          </button>
        </div>

        <div className="account-nav">
          <Link to="/ordini" className="account-nav-item">📦 I miei Ordini</Link>
          <Link to="/preferiti" className="account-nav-item">❤️ Preferiti</Link>
        </div>

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
              <div className="form-group">
                <label>Indirizzo</label>
                <input name="indirizzo" value={formData.indirizzo} onChange={handleChange} />
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
              <p><strong>Indirizzo:</strong> {cliente?.indirizzo || '-'}</p>
              <p><strong>Città:</strong> {cliente?.citta || '-'} {cliente?.cap || ''}</p>
              <p><strong>Provincia:</strong> {cliente?.provincia || '-'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}