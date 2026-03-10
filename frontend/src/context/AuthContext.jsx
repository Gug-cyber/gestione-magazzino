import { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      client.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      client.get('/api/auth/me')
        .then(res => {
          setUser(res.data)
          setToken(savedToken)
        })
        .catch(() => {
          localStorage.removeItem('token')
          delete client.defaults.headers.common['Authorization']
          setUser(null)
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    const res = await client.post('/api/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const { access_token } = res.data
    localStorage.setItem('token', access_token)
    client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setToken(access_token)
    const meRes = await client.get('/api/auth/me')
    setUser(meRes.data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete client.defaults.headers.common['Authorization']
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
