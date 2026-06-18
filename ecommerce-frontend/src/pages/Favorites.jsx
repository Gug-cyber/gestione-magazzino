/**
 * Pagina Preferiti cliente.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPreferiti, rimuoviPreferito } from '../api/auth';

export default function Favorites() {
  const [preferiti, setPreferiti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPreferiti();
  }, []);

  const loadPreferiti = async () => {
    try {
      const data = await getPreferiti();
      setPreferiti(data);
    } catch (err) {
      setError(err.message || 'Errore nel caricamento preferiti');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (prodottoId) => {
    try {
      await rimuoviPreferito(prodottoId);
      setPreferiti(preferiti.filter((p) => p.prodotto_id !== prodottoId));
    } catch (err) {
      setError(err.message || 'Errore nella rimozione');
    }
  };

  if (loading) return <div className="page-loading">Caricamento preferiti...</div>;

  return (
    <div className="favorites-page">
      <div className="favorites-container">
        <div className="favorites-header">
          <h1>❤️ I miei Preferiti</h1>
          <Link to="/account" className="btn btn-outline btn-sm">← Account</Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {preferiti.length === 0 ? (
          <div className="empty-state">
            <p>Non hai ancora aggiunto prodotti ai preferiti.</p>
            <Link to="/" className="btn btn-primary">Esplora lo Store</Link>
          </div>
        ) : (
          <div className="favorites-grid">
            {preferiti.map((item) => (
              <div key={item.id} className="favorite-card">
                {item.immagine_url && (
                  <img src={item.immagine_url} alt={item.nome_prodotto} className="favorite-img" />
                )}
                <div className="favorite-info">
                  <h3>{item.nome_prodotto}</h3>
                  {item.prezzo && <p className="favorite-price">€ {item.prezzo.toFixed(2)}</p>}
                  <p className="favorite-date">
                    Aggiunto il {new Date(item.added_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(item.prodotto_id)}
                  className="btn btn-outline btn-sm btn-remove"
                  title="Rimuovi dai preferiti"
                >
                  🗑️ Rimuovi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}