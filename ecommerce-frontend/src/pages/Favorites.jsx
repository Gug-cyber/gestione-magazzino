import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { getFavorites, removeFavorite } from '../api/auth';

export function Favorites() {
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated]);

  async function loadFavorites() {
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(prodottoId) {
    try {
      await removeFavorite(prodottoId);
      setFavorites(favorites.filter(f => f.prodotto_id !== prodottoId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Caricamento preferiti...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">I miei preferiti</h1>
          <Link to="/account" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Torna al profilo
          </Link>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">Non hai ancora prodotti preferiti.</p>
            <Link to="/catalogo" className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Scopri il catalogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map(fav => (
              <div key={fav.id} className="bg-white rounded-lg shadow overflow-hidden">
                {fav.immagine_url && (
                  <img src={fav.immagine_url} alt={fav.nome_prodotto} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate">{fav.nome_prodotto}</h3>
                  {fav.prezzo && (
                    <p className="text-lg font-bold text-blue-600 mt-1">€{fav.prezzo.toFixed(2)}</p>
                  )}
                  <div className="flex space-x-2 mt-3">
                    <Link
                      to={`/prodotto/${fav.prodotto_id}`}
                      className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Vedi prodotto
                    </Link>
                    <button
                      onClick={() => handleRemove(fav.prodotto_id)}
                      className="px-3 py-2 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
