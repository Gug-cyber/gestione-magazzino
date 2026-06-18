/**
 * App.jsx - Routing principale e-commerce.
 * 
 * ROUTING:
 * - "/" → Store (homepage e-commerce)
 * - "/dashboard" → Dashboard magazzino (SENZA redirect allo store)
 * - "/login" → Login clienti
 * - "/registrazione" → Registrazione clienti
 * - "/account" → Area privata cliente (protetta)
 * - "/ordini" → Lista ordini (protetta)
 * - "/ordini/:id" → Dettaglio ordine (protetta)
 * - "/preferiti" → Preferiti (protetta)
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pagine pubbliche
import StorePage from './pages/StorePage';
import Login from './pages/Login';
import Register from './pages/Register';

// Pagine protette (area privata clienti)
import Account from './pages/Account';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Favorites from './pages/Favorites';

// Dashboard magazzino (accesso separato, NON redirect a store)
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* STORE - Homepage e-commerce */}
          <Route path="/" element={<StorePage />} />

          {/* DASHBOARD MAGAZZINO - Rotta separata, nessun redirect */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/*" element={<Dashboard />} />

          {/* AUTH - Login e Registrazione */}
          <Route path="/login" element={<Login />} />
          <Route path="/registrazione" element={<Register />} />

          {/* AREA PRIVATA CLIENTI - Protetta da autenticazione */}
          <Route path="/account" element={
            <PrivateRoute><Account /></PrivateRoute>
          } />
          <Route path="/ordini" element={
            <PrivateRoute><Orders /></PrivateRoute>
          } />
          <Route path="/ordini/:id" element={
            <PrivateRoute><OrderDetail /></PrivateRoute>
          } />
          <Route path="/preferiti" element={
            <PrivateRoute><Favorites /></PrivateRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;