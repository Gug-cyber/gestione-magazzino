import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { getOrders } from '../api/auth';

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

export function Orders() {
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  async function loadOrders() {
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Caricamento ordini...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">I miei ordini</h1>
          <Link to="/account" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Torna al profilo
          </Link>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">Non hai ancora effettuato ordini.</p>
            <Link to="/catalogo" className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Vai al catalogo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const stato = STATO_LABELS[order.stato] || { label: order.stato, color: 'bg-gray-100 text-gray-800' };
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        Ordine #{order.numero_ordine}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(order.data_ordine).toLocaleDateString('it-IT', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${stato.color}`}>
                        {stato.label}
                      </span>
                      <p className="text-lg font-bold text-gray-900 mt-2">
                        €{order.totale?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {order.tracking_number && (
                    <p className="mt-2 text-sm text-gray-600">
                      Tracking: {order.corriere} - {order.tracking_number}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;
