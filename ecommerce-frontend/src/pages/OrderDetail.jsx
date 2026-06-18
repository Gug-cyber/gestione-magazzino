/**
 * Pagina Dettaglio Ordine con CTA "Fai il reso" (attiva solo entro 14 giorni dalla consegna).
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrdine, richiediReso } from '../api/auth';

export default function OrderDetail() {
  const { id } = useParams();
  const [ordine, setOrdine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showResoForm, setShowResoForm] = useState(false);
  const [motivoReso, setMotivoReso] = useState('');
  const [resoLoading, setResoLoading] = useState(false);
  const [resoMessage, setResoMessage] = useState('');

  useEffect(() => {
    loadOrdine();
  }, [id]);

  const loadOrdine = async () => {
    try {
      const data = await getOrdine(id);
      setOrdine(data);
    } catch (err) {
      setError(err.message || 'Errore nel caricamento ordine');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica se il reso è ancora possibile:
   * - L'ordine deve essere nello stato "consegnato"
   * - Devono essere passati massimo 14 giorni dalla data di consegna
   */
  const isResoDisponibile = () => {
    if (!ordine || ordine.stato !== 'consegnato' || !ordine.data_consegna) {
      return false;
    }
    const dataConsegna = new Date(ordine.data_consegna);
    const oggi = new Date();
    const diffGiorni = Math.floor((oggi - dataConsegna) / (1000 * 60 * 60 * 24));
    return diffGiorni <= 14;
  };

  const giorniRimanentiReso = () => {
    if (!ordine?.data_consegna) return 0;
    const dataConsegna = new Date(ordine.data_consegna);
    const oggi = new Date();
    const diffGiorni = Math.floor((oggi - dataConsegna) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - diffGiorni);
  };

  const handleReso = async (e) => {
    e.preventDefault();
    if (!motivoReso.trim()) return;

    setResoLoading(true);
    setError('');

    try {
      await richiediReso(ordine.id, motivoReso);
      setResoMessage('Richiesta di reso inviata con successo! Ti contatteremo presto.');
      setShowResoForm(false);
      // Ricarica ordine per aggiornare stato
      await loadOrdine();
    } catch (err) {
      setError(err.message || 'Errore nella richiesta di reso');
    } finally {
      setResoLoading(false);
    }
  };

  if (loading) return <div className="page-loading">Caricamento ordine...</div>;
  if (error && !ordine) return <div className="alert alert-error">{error}</div>;
  if (!ordine) return <div className="alert alert-error">Ordine non trovato</div>;

  return (
    <div className="order-detail-page">
      <div className="order-detail-container">
        <div className="order-detail-header">
          <Link to="/ordini" className="btn btn-outline btn-sm">← Torna agli ordini</Link>
          <h1>Ordine {ordine.numero_ordine}</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {resoMessage && <div className="alert alert-success">{resoMessage}</div>}

        <div className="order-detail-info">
          <div className="info-row">
            <span>Stato:</span>
            <span className="order-status-badge">{ordine.stato.replace(/_/g, ' ').toUpperCase()}</span>
          </div>
          <div className="info-row">
            <span>Data ordine:</span>
            <span>{new Date(ordine.data_ordine).toLocaleDateString('it-IT')}</span>
          </div>
          {ordine.data_spedizione && (
            <div className="info-row">
              <span>Data spedizione:</span>
              <span>{new Date(ordine.data_spedizione).toLocaleDateString('it-IT')}</span>
            </div>
          )}
          {ordine.data_consegna && (
            <div className="info-row">
              <span>Data consegna:</span>
              <span>{new Date(ordine.data_consegna).toLocaleDateString('it-IT')}</span>
            </div>
          )}
          {ordine.indirizzo_spedizione && (
            <div className="info-row">
              <span>Indirizzo:</span>
              <span>{ordine.indirizzo_spedizione}</span>
            </div>
          )}
          <div className="info-row info-row-total">
            <span>Totale:</span>
            <span>€ {ordine.totale.toFixed(2)}</span>
          </div>
        </div>

        {/* Lista articoli */}
        <div className="order-items-section">
          <h2>Articoli</h2>
          <div className="order-items-list">
            {ordine.items.map((item) => (
              <div key={item.id} className="order-item">
                {item.immagine_url && (
                  <img src={item.immagine_url} alt={item.nome_prodotto} className="order-item-img" />
                )}
                <div className="order-item-info">
                  <p className="order-item-name">{item.nome_prodotto}</p>
                  <p className="order-item-qty">Quantità: {item.quantita}</p>
                  <p className="order-item-price">€ {item.prezzo_unitario.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA RESO - visibile SOLO entro 14 giorni dalla consegna */}
        {ordine.stato === 'consegnato' && (
          <div className="reso-section">
            {isResoDisponibile() ? (
              <>
                <div className="reso-info">
                  <p>⏰ Hai ancora <strong>{giorniRimanentiReso()} giorni</strong> per richiedere il reso.</p>
                </div>
                {!showResoForm ? (
                  <button
                    onClick={() => setShowResoForm(true)}
                    className="btn btn-danger"
                  >
                    🔄 Fai il reso
                  </button>
                ) : (
                  <form onSubmit={handleReso} className="reso-form">
                    <div className="form-group">
                      <label htmlFor="motivo">Motivo del reso *</label>
                      <textarea
                        id="motivo"
                        value={motivoReso}
                        onChange={(e) => setMotivoReso(e.target.value)}
                        placeholder="Descrivi il motivo per cui vuoi restituire il prodotto..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-danger" disabled={resoLoading}>
                        {resoLoading ? 'Invio in corso...' : 'Conferma reso'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResoForm(false)}
                        className="btn btn-outline"
                      >
                        Annulla
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="reso-expired">
                <p>⚠️ Il periodo per il reso è scaduto (14 giorni dalla consegna).</p>
              </div>
            )}
          </div>
        )}

        {ordine.stato === 'reso_richiesto' && (
          <div className="reso-section reso-pending">
            <p>📋 Richiesta di reso inviata il {new Date(ordine.data_richiesta_reso).toLocaleDateString('it-IT')}</p>
            {ordine.motivo_reso && <p><strong>Motivo:</strong> {ordine.motivo_reso}</p>}
          </div>
        )}
      </div>
    </div>
  );
}