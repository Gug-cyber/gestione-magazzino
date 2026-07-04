import { createContext, useContext, useState, useEffect } from 'react'
import { storeAPI } from '../api/store'

const ClienteAuthContext = createContext(null)

export function ClienteAuthProvider({ children }) {
  const [cliente, setCliente] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('cliente_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('cliente_token')
    if (savedToken) {
      storeAPI.clienteMe()
        .then(res => {
          setCliente(res.data)
          setToken(savedToken)
        })
        .catch(() => {
          localStorage.removeItem('cliente_token')
          setCliente(null)
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await storeAPI.clienteLogin({ email, password })
    const { access_token, cliente: clienteData } = res.data
    localStorage.setItem('cliente_token', access_token)
    setToken(access_token)
    setCliente(clienteData)
    return res.data
  }

  const register = async (data) => {
    const res = await storeAPI.clienteRegistrazione(data)
    const { access_token, cliente: clienteData } = res.data
    localStorage.setItem('cliente_token', access_token)
    setToken(access_token)
    setCliente(clienteData)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('cliente_token')
    setToken(null)
    setCliente(null)
  }

  const updateCliente = async (data) => {
    const res = await storeAPI.clienteUpdate(data)
    setCliente(res.data)
    return res.data
  }

  return (
    <ClienteAuthContext.Provider value={{ cliente, token, loading, login, register, logout, updateCliente }}>
      {children}
    </ClienteAuthContext.Provider>
  )
}

export function useClienteAuth() {
  return useContext(ClienteAuthContext)
}

export default ClienteAuthContext
