import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from './api'

interface AuthState {
  token: string | null
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!!token) // loading if we have a token to verify

  // Verify token on mount
  useEffect(() => {
    if (!token) return
    authApi.me()
      .then((data) => setUsername(data.username))
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [token])

  const login = async (user: string, password: string) => {
    const data = await authApi.login(user, password)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUsername(data.username)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
