import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../api/auth';

export const AuthContext = createContext(null);

const STORAGE_KEY = 'tcg-store-auth-token';
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

  const checkAuth = useCallback(async (savedToken) => {
    try {
      const userData = await getCurrentUser(savedToken);
      setUser(userData);
      setToken(savedToken);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken) {
      checkAuth(savedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [checkAuth]);

  async function login(identifier, password) {
    setError(null);
    try {
      const data = await loginUser(identifier, password);
      localStorage.setItem(STORAGE_KEY, data.jwt);
      setToken(data.jwt);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message || DEFAULT_ERROR_MSG);
      throw err;
    }
  }

  async function register(username, email, password) {
    setError(null);
    try {
      const data = await registerUser(username, email, password);
      localStorage.setItem(STORAGE_KEY, data.jwt);
      setToken(data.jwt);
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

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
