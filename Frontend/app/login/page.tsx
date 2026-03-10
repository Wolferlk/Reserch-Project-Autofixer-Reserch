'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, LockKeyhole, Mail, LogIn } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { useAuth } from '@/components/auth/AuthProvider'

export default function LoginPage() {
  const { login, user, isReady } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isReady && user) {
      router.replace('/')
    }
  }, [isReady, router, user])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = login(email, password)
    if (!result.ok) {
      setError(result.message)
      return
    }

    router.push('/')
  }

  return (
    <AuthShell
      eyebrow="Member Login"
      title="Sign in and continue fixing faster."
      subtitle="Use your Auto Fixer account or connect with Google. Signed-in users get quick access to saved profiles and a personalized navigation bar."
      alternateHref="/register"
      alternateLabel="Create account"
      alternateText="New to Auto Fixer?"
    >
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-white">Welcome back</h2>
          <p className="text-sm text-slate-400">Manual login and Google sign-in are both enabled here.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
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

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <LockKeyhole className="h-4 w-4 text-cyan-300" />
              <input
                required
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#3b82f6,#ec4899)] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_36px_rgba(34,211,238,0.28)] transition hover:scale-[1.01]"
            type="submit"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </button>
        </form>

        <div className="relative py-2 text-center text-xs uppercase tracking-[0.25em] text-slate-500">
          <span className="relative z-10 bg-[rgba(8,12,24,0.95)] px-3">or continue with</span>
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
        </div>

        <GoogleSignInButton />

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
          Need a test account first?{' '}
          <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/register">
            Register manually
          </Link>
          .
        </div>
      </div>
    </AuthShell>
  )
}
