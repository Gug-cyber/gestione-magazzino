import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link to="/pagina/chi-siamo">Chi siamo</Link>
          <Link to="/pagina/termini-e-condizioni">Termini e condizioni</Link>
          <Link to="/pagina/privacy-policy">Privacy Policy</Link>
        </div>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} Gestione Magazzino Shop. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  );
}
