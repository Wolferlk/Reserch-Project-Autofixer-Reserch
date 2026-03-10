'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AuthUser = {
  id: string
  name: string
  email: string
  password?: string
  picture?: string
  provider: 'manual' | 'google'
}

type RegisterInput = {
  name: string
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  isReady: boolean
  register: (input: RegisterInput) => { ok: true } | { ok: false; message: string }
  login: (email: string, password: string) => { ok: true } | { ok: false; message: string }
  loginWithGoogle: (user: Omit<AuthUser, 'provider'>) => void
  logout: () => void
}

const USERS_KEY = 'autofixer-auth-users'
const SESSION_KEY = 'autofixer-auth-session'

const AuthContext = createContext<AuthContextValue | null>(null)

function readUsers(): AuthUser[] {
  const stored = window.localStorage.getItem(USERS_KEY)

  if (!stored) {
    return []
  }

  try {
    return JSON.parse(stored) as AuthUser[]
  } catch {
    return []
  }
}

function writeUsers(users: AuthUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function writeSession(user: AuthUser | null) {
  if (!user) {
    window.localStorage.removeItem(SESSION_KEY)
    return
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      const session = window.localStorage.getItem(SESSION_KEY)
      if (session) {
        setUser(JSON.parse(session) as AuthUser)
      }
    } finally {
      setIsReady(true)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      register: ({ name, email, password }) => {
        const normalizedEmail = email.trim().toLowerCase()
        const users = readUsers()

        if (users.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
          return { ok: false, message: 'An account with this email already exists.' }
        }

        const newUser: AuthUser = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          password,
          provider: 'manual',
        }

        const updatedUsers = [...users, newUser]
        writeUsers(updatedUsers)
        writeSession(newUser)
        setUser(newUser)

        return { ok: true }
      },
      login: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase()
        const account = readUsers().find(
          (entry) =>
            entry.email.toLowerCase() === normalizedEmail &&
            entry.password === password &&
            entry.provider === 'manual',
        )

        if (!account) {
          return { ok: false, message: 'Invalid email or password.' }
        }

        writeSession(account)
        setUser(account)

        return { ok: true }
      },
      loginWithGoogle: (googleUser) => {
        const normalizedEmail = googleUser.email.trim().toLowerCase()
        const users = readUsers()
        const existing = users.find(
          (entry) => entry.email.toLowerCase() === normalizedEmail,
        )

        const authenticatedUser: AuthUser = existing
          ? {
              ...existing,
              name: googleUser.name,
              picture: googleUser.picture,
              provider: 'google',
            }
          : {
              ...googleUser,
              email: normalizedEmail,
              provider: 'google',
            }

        const nextUsers = existing
          ? users.map((entry) =>
              entry.email.toLowerCase() === normalizedEmail ? authenticatedUser : entry,
            )
          : [...users, authenticatedUser]

        writeUsers(nextUsers)
        writeSession(authenticatedUser)
        setUser(authenticatedUser)
      },
      logout: () => {
        writeSession(null)
        setUser(null)
      },
    }),
    [isReady, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
