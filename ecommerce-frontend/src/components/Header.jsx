import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar.jsx';

export default function Header() {
  const navigate = useNavigate();

  const handleSearch = (value) => {
    navigate(`/catalogo?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          🏪 Gestione Magazzino Shop
        </Link>

        <SearchBar onSearch={handleSearch} />

        <nav className="header-nav">
          <Link to="/catalogo">Catalogo</Link>
          <Link to="/pagina/chi-siamo">Chi siamo</Link>
        </nav>
      </div>
    </header>
  );
}
