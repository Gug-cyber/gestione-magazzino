import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { getOrderDetail, requestReturn } from '../api/auth';

const STATO_LABELS = {
  in_attesa: { label: 'In attesa', color: 'bg-yellow-100 text-yellow-800' },
  confermato: { label: 'Confermato', color: 'bg-blue-100 text-blue-800' },
  in_lavorazione: { label: 'In lavorazione', color: 'bg-indigo-100 text-indigo-800' },
  spedito: { label: 'Spedito', color: 'bg-purple-100 text-purple-800' },
  consegnato: { label: 'Consegnato', color: 'bg-green-100 text-green-800' },
  annullato: { label: 'Annullato', color: 'bg-red-100 text-red-800' },
  reso_richiesto: { label: 'Reso richiesto', color: 'bg-orange-100 text-orange-800' },
  reso_approvato: { label: 'Reso approvato', color: 'bg-orange-100 text-orange-800' },
  reso_completato: { label: 'Reso completato', color: 'bg-gray-100 text-gray-800' },
  rimborsato: { label: 'Rimborsato', color: 'bg-gray-100 text-gray-800' },
};

export function OrderDetail() {
  const { id } = useParams();
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResoForm, setShowResoForm] = useState(false);
  const [resoMotivo, setResoMotivo] = useState('');
  const [resoLoading, setResoLoading] = useState(false);
  const [resoSuccess, setResoSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && id) {
      loadOrder();
    }
  }, [isAuthenticated, id]);

  async function loadOrder() {
    try {
      const data = await getOrderDetail(id);
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReturn(e) {
    e.preventDefault();
    if (!resoMotivo.trim()) return;
    setResoLoading(true);
    try {
      await requestReturn(id, resoMotivo);
      setResoSuccess(true);
      setShowResoForm(false);
      // Reload order to get updated status
      await loadOrder();
    } catch (err) {
      setError(err.message);
    } finally {
      setResoLoading(false);
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Caricamento ordine...</p></div>;
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
          <Link to="/orders" className="mt-4 inline-block text-blue-600 hover:text-blue-800">← Torna agli ordini</Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const stato = STATO_LABELS[order.stato] || { label: order.stato, color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/orders" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block">
          ← Torna agli ordini
        </Link>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Ordine #{order.numero_ordine}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Effettuato il {new Date(order.data_ordine).toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${stato.color}`}>
              {stato.label}
            </span>
          </div>

          {/* Tracking info */}
          {order.tracking_number && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Spedizione</p>
              <p className="text-sm text-blue-700">
                {order.corriere} - Tracking: <span className="font-mono">{order.tracking_number}</span>
              </p>
              {order.data_spedizione && (
                <p className="text-xs text-blue-600 mt-1">
                  Spedito il {new Date(order.data_spedizione).toLocaleDateString('it-IT')}
                </p>
              )}
              {order.data_consegna && (
                <p className="text-xs text-blue-600">
                  Consegnato il {new Date(order.data_consegna).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          )}

          {/* Order items */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Prodotti</h3>
            <div className="space-y-3">
              {order.righe?.map((riga, idx) => (
                <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  {riga.immagine_url && (
                    <img src={riga.immagine_url} alt={riga.nome_prodotto} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{riga.nome_prodotto}</p>
                    <p className="text-sm text-gray-500">Quantità: {riga.quantita}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">€{riga.prezzo_unitario?.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Tot: €{riga.subtotale?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order totals */}
          <div className="border-t mt-6 pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Subtotale</span>
              <span>€{order.subtotale?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Spese di spedizione</span>
              <span>€{order.spese_spedizione?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
              <span>Totale</span>
              <span>€{order.totale?.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping address */}
          {order.indirizzo_spedizione && (
            <div className="border-t mt-6 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Indirizzo di spedizione</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{order.indirizzo_spedizione}</p>
            </div>
          )}
        </div>

        {/* RETURN CTA - Active only within 14 days of delivery */}
        {order.reso_disponibile && !resoSuccess && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Hai bisogno di fare un reso?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Puoi richiedere il reso entro 14 giorni dalla consegna.
                  {order.data_consegna && (
                    <span className="block mt-1">
                      Scadenza: {new Date(new Date(order.data_consegna).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </p>
              </div>
              {!showResoForm && (
                <button
                  onClick={() => setShowResoForm(true)}
                  className="px-6 py-3 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 transition-colors"
                >
                  Fai il reso
                </button>
              )}
            </div>

            {showResoForm && (
              <form onSubmit={handleRequestReturn} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo del reso
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder="Descrivi il motivo per cui vuoi restituire il prodotto..."
                    value={resoMotivo}
                    onChange={(e) => setResoMotivo(e.target.value)}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={resoLoading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {resoLoading ? 'Invio in corso...' : 'Conferma richiesta reso'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResoForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Return already requested */}
        {(order.stato === 'reso_richiesto' || order.stato === 'reso_approvato' || resoSuccess) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-800">Reso richiesto</h3>
            <p className="text-sm text-orange-700 mt-1">
              {resoSuccess
                ? 'La tua richiesta di reso è stata inviata con successo. Ti contatteremo presto.'
                : `Motivo: ${order.reso_motivo || 'Non specificato'}`
              }
            </p>
            {order.reso_richiesto_il && (
              <p className="text-xs text-orange-600 mt-2">
                Richiesto il {new Date(order.reso_richiesto_il).toLocaleDateString('it-IT')}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderDetail;
