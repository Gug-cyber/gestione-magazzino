import { createContext, useContext, useState, useEffect } from 'react'
import client from '../api/client'
import { complete2FALogin } from '../api/client'

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
    if (res.data?.requires_2fa) {
      return {
        requires2FA: true,
        temporaryToken: res.data.temporary_token,
      }
    }
    const { access_token } = res.data
    localStorage.setItem('token', access_token)
    client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setToken(access_token)
    const meRes = await client.get('/api/auth/me')
    setUser(meRes.data)
    return { requires2FA: false }
  }

  const verifyTwoFactorLogin = async (temporaryToken, otpCode) => {
    const res = await complete2FALogin(temporaryToken, otpCode)
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

  // isAuthenticated è true se c'è un token valido in localStorage
  // non dipende da user per evitare flash di redirect durante il caricamento
  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{ user, setUser, token, isAuthenticated, isLoading, login, verifyTwoFactorLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
