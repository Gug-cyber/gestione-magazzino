/**
 * StorePage - Homepage dello store e-commerce.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StorePage() {
  const { cliente, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="store-page">
      <header className="store-header">
        <h1>🛒 Store</h1>
        <nav className="store-nav">
          <Link to="/">Home</Link>
          {cliente ? (
            <>
              <Link to="/account">👤 {cliente.nome || 'Il mio Account'}</Link>
              <Link to="/preferiti">❤️ Preferiti</Link>
              <Link to="/ordini">📦 Ordini</Link>
              <button onClick={handleLogout} className="btn-logout">Esci</button>
            </>
          ) : (
            <>
              <Link to="/login">Accedi</Link>
              <Link to="/registrazione">Registrati</Link>
            </>
          )}
        </nav>
      </header>
      <main className="store-main">
        <h2>
          {cliente
            ? `Bentornato, ${cliente.nome}!`
            : 'Benvenuto nel nostro Store'}
        </h2>
        <p>Esplora i nostri prodotti e aggiungi i tuoi preferiti!</p>
        {!cliente && (
          <div className="store-cta">
            <Link to="/registrazione" className="btn btn-primary">
              Crea un account
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Accedi
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
