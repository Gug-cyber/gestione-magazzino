import { createContext, useContext, useState, useEffect } from 'react'
import { storeAPI } from '../api/store'

const ClienteAuthContext = createContext(null)

export function ClienteAuthProvider({ children }) {
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cliente_token')
    if (token) {
      storeAPI.clienteMe()
        .then(res => setCliente(res.data))
        .catch(() => localStorage.removeItem('cliente_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    const res = await storeAPI.clienteLogin({ email, password })
    localStorage.setItem('cliente_token', res.data.access_token)
    setCliente(res.data.cliente)
    return res.data
  }

  async function register(data) {
    const res = await storeAPI.clienteRegistrazione(data)
    localStorage.setItem('cliente_token', res.data.access_token)
    setCliente(res.data.cliente)
    return res.data
  }

  function logout() {
    localStorage.removeItem('cliente_token')
    setCliente(null)
  }

  return (
    <ClienteAuthContext.Provider value={{ cliente, loading, login, register, logout }}>
      {children}
    </ClienteAuthContext.Provider>
  )
}

export function useClienteAuth() {
  return useContext(ClienteAuthContext)
}
