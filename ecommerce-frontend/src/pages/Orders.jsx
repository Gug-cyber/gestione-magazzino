/**
 * Pagina Lista Ordini cliente con CTA download fattura.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrdini } from '../api/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

const STATO_LABELS = {
  in_attesa: { label: 'In attesa', color: '#f59e0b' },
  confermato: { label: 'Confermato', color: '#3b82f6' },
  spedito: { label: 'Spedito', color: '#8b5cf6' },
  consegnato: { label: 'Consegnato', color: '#10b981' },
  reso_richiesto: { label: 'Reso richiesto', color: '#ef4444' },
  reso_approvato: { label: 'Reso approvato', color: '#6b7280' },
  annullato: { label: 'Annullato', color: '#6b7280' },
};

// Stati per cui la fattura è disponibile
const STATI_CON_FATTURA = ['consegnato', 'spedito', 'in_attesa', 'confermato'];

export default function Orders() {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadOrdini();
  }, []);

  const loadOrdini = async () => {
    try {
      const data = await getOrdini();
      setOrdini(data);
    } catch (err) {
      setError(err.message || 'Errore nel caricamento ordini');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFattura = async (e, ordineId, numeroOrdine) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingId(ordineId);
    try {
      const token = localStorage.getItem('clienteToken');
      const res = await fetch(`${API_BASE}/api/clienti/ordini/${ordineId}/fattura/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fattura non disponibile');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fattura_${numeroOrdine}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Errore nel download della fattura');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="page-loading">Caricamento ordini...</div>;

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <Link to="/account" className="btn btn-outline btn-sm">← Torna all&apos;account</Link>
          <h1>📦 I miei ordini</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {ordini.length === 0 ? (
          <div className="empty-state">
            <p>📦 Non hai ancora effettuato ordini.</p>
            <Link to="/" className="btn btn-primary">Vai allo Store</Link>
          </div>
        ) : (
          <div className="orders-list">
            {ordini.map((ordine) => {
              const stato = STATO_LABELS[ordine.stato] || { label: ordine.stato, color: '#6b7280' };
              const speseSpedizione = ordine.spese_spedizione ?? 0;
              const subtotale = ordine.subtotale ?? (ordine.totale - speseSpedizione);
              const mostraFattura = STATI_CON_FATTURA.includes(ordine.stato);

              return (
                <div key={ordine.id} className="order-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                  {/* Header */}
                  <div className="order-card-header">
                    <span className="order-number">{ordine.numero_ordine}</span>
                    <span className="order-status" style={{ backgroundColor: stato.color }}>
                      {stato.label}
                    </span>
                  </div>

                  {/* Data e articoli */}
                  <div className="order-card-body">
                    <p className="order-date">
                      {new Date(ordine.data_ordine).toLocaleDateString('it-IT', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>

                    {/* Righe prodotti */}
                    {(ordine.items || []).map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span>{item.nome_prodotto} <span style={{ color: '#888' }}>x{item.quantita}</span></span>
                        <span>€{(item.prezzo_unitario * item.quantita).toFixed(2)}</span>
                      </div>
                    ))}

                    {/* Riepilogo costi */}
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem', color: '#6b7280' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotale</span>
                        <span>€{subtotale.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Spedizione</span>
                        <span>{speseSpedizione > 0 ? `€${speseSpedizione.toFixed(2)}` : 'Gratuita'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#111', marginTop: '6px' }}>
                        <span>Totale</span>
                        <span>€{ordine.totale.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Metodo pagamento + Indirizzo */}
                    {ordine.metodo_pagamento && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                        Metodo di pagamento: <strong style={{ textTransform: 'capitalize' }}>{ordine.metodo_pagamento.replace(/_/g, ' ')}</strong>
                      </p>
                    )}
                    {ordine.indirizzo_spedizione && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0' }}>
                        Indirizzo spedizione: <strong>{ordine.indirizzo_spedizione}</strong>
                      </p>
                    )}
                  </div>

                  {/* Footer azioni */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                    <Link
                      to={`/ordini/${ordine.id}`}
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      Dettaglio ordine
                    </Link>
                    {mostraFattura && (
                      <button
                        onClick={(e) => handleDownloadFattura(e, ordine.id, ordine.numero_ordine)}
                        disabled={downloadingId === ordine.id}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                      >
                        {downloadingId === ordine.id ? 'Download...' : '📄 Scarica fattura'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
