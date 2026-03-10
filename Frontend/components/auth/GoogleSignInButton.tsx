'use client'

import { useEffect, useId, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { Chrome, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

type GoogleJwtPayload = {
  sub: string
  name: string
  email: string
  picture?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>,
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

function parseJwt(token: string): GoogleJwtPayload {
  const base64Payload = token.split('.')[1]
  const normalized = base64Payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const json = window.atob(padded)

  return JSON.parse(json) as GoogleJwtPayload
}

export function GoogleSignInButton() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const { loginWithGoogle } = useAuth()
  const router = useRouter()
  const buttonId = useId()
  const [sdkReady, setSdkReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sdkReady || !clientId || !window.google) {
      return
    }

    const mountNode = document.getElementById(buttonId)
    if (!mountNode) {
      return
    }

    mountNode.innerHTML = ''

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        try {
          const payload = parseJwt(credential)
          loginWithGoogle({
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
          })
          router.push('/')
        } catch {
          setError('Google sign-in completed, but the profile could not be read.')
        }
      },
    })

    window.google.accounts.id.renderButton(mountNode, {
      type: 'standard',
      theme: 'outline',
      text: 'continue_with',
      shape: 'pill',
      size: 'large',
      width: 320,
    })
  }, [buttonId, clientId, loginWithGoogle, router, sdkReady])

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div className="space-y-3">
        <div
          className="flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4"
          id={buttonId}
        >
          {!sdkReady && (
            <span className="flex items-center gap-2 text-sm text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Google sign-in
            </span>
          )}

          {sdkReady && !clientId && (
            <span className="flex items-center gap-2 text-sm text-amber-300">
              <Chrome className="h-4 w-4" />
              Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable Google sign-in.
            </span>
          )}
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </>
  )
}
