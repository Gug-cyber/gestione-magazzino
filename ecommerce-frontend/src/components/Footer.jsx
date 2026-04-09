import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        {/* Brand */}
        <div className="footer-brand">
          <span className="footer-brand-logo">TCG Store</span>
          <p className="footer-brand-desc">
            Il tuo negozio di fiducia per carte collezionabili. 
            Pokemon, Magic, Yu-Gi-Oh e molto altro.
          </p>
          <div className="footer-social">
            <a href="#" className="footer-social-link" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a href="#" className="footer-social-link" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="#" className="footer-social-link" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="#" className="footer-social-link" aria-label="YouTube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="footer-section">
          <h4>Negozio</h4>
          <div className="footer-links">
            <Link to="/catalogo">Catalogo completo</Link>
            <Link to="/catalogo?categoria=pokemon">Pokemon</Link>
            <Link to="/catalogo?categoria=magic">Magic: The Gathering</Link>
            <Link to="/catalogo?categoria=yugioh">Yu-Gi-Oh!</Link>
            <Link to="/catalogo?categoria=one-piece">One Piece TCG</Link>
          </div>
        </div>

        <div className="footer-section">
          <h4>Informazioni</h4>
          <div className="footer-links">
            <Link to="/pagina/chi-siamo">Chi siamo</Link>
            <Link to="/pagina/spedizioni">Spedizioni</Link>
            <Link to="/pagina/resi">Resi e rimborsi</Link>
            <Link to="/pagina/contatti">Contattaci</Link>
            <Link to="/pagina/faq">FAQ</Link>
          </div>
        </div>

        <div className="footer-section">
          <h4>Legale</h4>
          <div className="footer-links">
            <Link to="/pagina/termini-e-condizioni">Termini e condizioni</Link>
            <Link to="/pagina/privacy-policy">Privacy Policy</Link>
            <Link to="/pagina/cookie-policy">Cookie Policy</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">
          {new Date().getFullYear()} TCG Store. Tutti i diritti riservati. P.IVA 00000000000
        </p>
        <div className="footer-payments">
          <span className="footer-payment-icon">VISA</span>
          <span className="footer-payment-icon">MC</span>
          <span className="footer-payment-icon">AMEX</span>
          <span className="footer-payment-icon">PP</span>
        </div>
      </div>
    </footer>
  );
}
