/**
 * Componente per proteggere le rotte che richiedono autenticazione cliente.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { cliente, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!cliente) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}