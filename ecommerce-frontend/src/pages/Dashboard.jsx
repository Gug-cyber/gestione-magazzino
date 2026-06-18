/**
 * Dashboard - Gestione Magazzino.
 * Questa è la dashboard per la gestione del magazzino, NON lo store.
 * Accessibile su /dashboard senza redirect allo store.
 */
import React from 'react';

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1>📊 Dashboard Magazzino</h1>
      </header>
      <main className="dashboard-main">
        <p>Gestione inventario, prodotti e ordini.</p>
        {/* Il contenuto reale della dashboard magazzino va qui */}
      </main>
    </div>
  );
}