/**
 * StorePage - Homepage dello store e-commerce.
 * Placeholder: sostituire con il componente reale dello store.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function StorePage() {
  return (
    <div className="store-page">
      <header className="store-header">
        <h1>🛒 Store</h1>
        <nav className="store-nav">
          <Link to="/">Home</Link>
          <Link to="/account">Il mio Account</Link>
          <Link to="/preferiti">❤️ Preferiti</Link>
          <Link to="/ordini">📦 Ordini</Link>
          <Link to="/login">Accedi</Link>
        </nav>
      </header>
      <main className="store-main">
        <h2>Benvenuto nel nostro Store</h2>
        <p>Esplora i nostri prodotti e aggiungi i tuoi preferiti!</p>
      </main>
    </div>
  );
}