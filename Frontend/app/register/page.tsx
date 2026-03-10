'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/components/auth/AuthProvider'

export default function RegisterPage() {
  const { register, user, isReady } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isReady && user) {
      router.replace('/')
    }
  }, [isReady, router, user])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Use at least 6 characters for the password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const result = register({ name, email, password })
    if (!result.ok) {
      setError(result.message)
      return
    }

    router.push('/')
  }

  return (
    <AuthShell
      eyebrow="Manual Registration"
      title="Create an Auto Fixer account."
      subtitle="This page adds a manual registration flow for the current frontend. New accounts are stored in the browser so you can test the UI and session flow immediately."
      alternateHref="/login"
      alternateLabel="Sign in"
      alternateText="Already registered?"
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-white">Build your profile</h2>
          <p className="text-sm text-slate-400">After registration, your name will appear in the navigation bar.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Full name</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <UserRound className="h-4 w-4 text-cyan-300" />
              <input
                required
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setName(event.target.value)}
                placeholder="Sasi Perera"
                type="text"
                value={name}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Email address</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <Mail className="h-4 w-4 text-cyan-300" />
              <input
                required
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                <LockKeyhole className="h-4 w-4 text-cyan-300" />
                <input
                  required
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  type="password"
                  value={password}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Confirm password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                <LockKeyhole className="h-4 w-4 text-cyan-300" />
                <input
                  required
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                  type="password"
                  value={confirmPassword}
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#34d399,#22d3ee,#3b82f6)] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_36px_rgba(34,211,238,0.28)] transition hover:scale-[1.01]"
            type="submit"
          >
            <Sparkles className="h-4 w-4" />
            Create account
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
