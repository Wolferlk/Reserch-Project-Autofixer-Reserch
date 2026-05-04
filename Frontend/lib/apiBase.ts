export function resolveApiBaseUrl(...candidates: Array<string | undefined>): string {
  const configured = candidates.find((value) => value && value.trim().length > 0)
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://localhost:8001'
  }

  return ''
}

export function recommendationApiBaseUrl(rawBaseUrl: string): string {
  if (!rawBaseUrl) return ''
  return rawBaseUrl.endsWith('/recommendation') ? rawBaseUrl : `${rawBaseUrl}/recommendation`
}

export function requireApiBaseUrl(baseUrl: string, serviceName = 'Backend API'): string {
  if (!baseUrl) {
    throw new Error(`${serviceName} URL is not configured. Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_RECO_API_URL in Vercel and redeploy.`)
  }

  return baseUrl
}
