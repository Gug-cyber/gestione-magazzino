/**
 * Pagina Registrazione clienti e-commerce.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confermaPassword: '',
    nome: '',
    cognome: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registrazione } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confermaPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    setLoading(true);

    try {
      const { confermaPassword, ...dataToSend } = formData;
      await registrazione(dataToSend);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide">
        <h1>Crea Account</h1>
        <p className="auth-subtitle">Registrati per accedere a ordini e preferiti</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nome">Nome *</label>
              <input
                id="nome"
                name="nome"
                type="text"
                value={formData.nome}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cognome">Cognome *</label>
              <input
                id="cognome"
                name="cognome"
                type="text"
                value={formData.cognome}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
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
            <input
              id="telefono"
              name="telefono"
              type="tel"
              value={formData.telefono}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="indirizzo">Indirizzo</label>
            <input
              id="indirizzo"
              name="indirizzo"
              type="text"
              value={formData.indirizzo}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="citta">Città</label>
              <input
                id="citta"
                name="citta"
                type="text"
                value={formData.citta}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cap">CAP</label>
              <input
                id="cap"
                name="cap"
                type="text"
                value={formData.cap}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="provincia">Provincia</label>
              <input
                id="provincia"
                name="provincia"
                type="text"
                value={formData.provincia}
                onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        <p className="auth-footer">
          Hai già un account? <Link to="/login">Accedi</Link>
        </p>
      </div>
    </div>
  );
}