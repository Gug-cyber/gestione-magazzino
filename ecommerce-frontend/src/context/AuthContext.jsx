/**
 * Context per gestione autenticazione clienti.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProfilo, login as apiLogin, registrazione as apiRegistrazione, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica token al mount
    const token = localStorage.getItem('cliente_token');
    if (token) {
      getProfilo()
        .then(setCliente)
        .catch(() => {
          localStorage.removeItem('cliente_token');
          setCliente(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const result = await apiLogin(email, password);
    setCliente(result.cliente);
    return result;
  };

  const registrazione = async (data) => {
    const result = await apiRegistrazione(data);
    setCliente(result.cliente);
    return result;
  };

  const logout = () => {
    apiLogout();
    setCliente(null);
  };

  const refreshProfilo = async () => {
    const profilo = await getProfilo();
    setCliente(profilo);
    return profilo;
  };

  return (
    <AuthContext.Provider value={{ cliente, loading, login, registrazione, logout, refreshProfilo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
}

export default AuthContext;