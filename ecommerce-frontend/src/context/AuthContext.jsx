import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../api/auth';

export const AuthContext = createContext(null);

const STORAGE_KEY = 'ecommerce-auth-token';
const DEFAULT_ERROR_MSG = 'Errore di connessione, riprova';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setToken(savedToken);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function login(email, password) {
    setError(null);
    try {
      const data = await loginUser(email, password);
      localStorage.setItem(STORAGE_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message || DEFAULT_ERROR_MSG);
      throw err;
    }
  }

  async function register(nome, cognome, email, password) {
    setError(null);
    try {
      const data = await registerUser(nome, cognome, email, password);
      localStorage.setItem(STORAGE_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message || DEFAULT_ERROR_MSG);
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
