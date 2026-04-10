import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let nextId = 1;

// Use timestamp-based ID to avoid collisions during HMR
function generateId() {
  return `${Date.now()}-${nextId++}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = generateId();
    setToasts((prev) => {
      // Max 3 toasts visible; drop oldest if needed (FIFO)
      const updated = prev.length >= 3 ? prev.slice(1) : prev;
      return [...updated, { id, message, type, duration }];
    });
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
