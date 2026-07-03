import { createContext, useContext, useEffect, useState } from 'react'
import {
  getProfilo,
  login as apiLogin,
  registrazione as apiRegistrazione,
  logout as apiLogout,
} from '../api/clientiAuth'

const ClientiAuthContext = createContext(null)

export function ClientiAuthProvider({ children }) {
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cliente_token')
    if (!token) {
      setLoading(false)
      return
    }

    getProfilo()
      .then(setCliente)
      .catch(() => {
        localStorage.removeItem('cliente_token')
        setCliente(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const result = await apiLogin(email, password)
    setCliente(result.cliente)
    return result
  }

  const registrazione = async (data) => {
    const result = await apiRegistrazione(data)
    setCliente(result.cliente)
    return result
  }

  const logout = () => {
    apiLogout()
    setCliente(null)
  }

  const refreshProfilo = async () => {
    const profilo = await getProfilo()
    setCliente(profilo)
    return profilo
  }

  return (
    <ClientiAuthContext.Provider value={{ cliente, loading, login, registrazione, logout, refreshProfilo }}>
      {children}
    </ClientiAuthContext.Provider>
  )
}

export function useClientiAuth() {
  const context = useContext(ClientiAuthContext)
  if (!context) {
    throw new Error('useClientiAuth deve essere usato dentro ClientiAuthProvider')
  }
  return context
}

export default ClientiAuthContext
