'use client'

import { useEffect, useMemo, useState } from 'react'

type AdminSubmissionFormProps = {
  page: 'error-fixer' | 'screenshot-scanner' | 'tutorials'
  defaultErrorName?: string
  generatedOutput?: string
}

type SuccessStatus = 'success' | 'not_fixed' | ''

type DetectedEnvironment = {
  platform?: string
  userAgent?: string
  cpuCores?: number | null
  deviceMemoryGb?: number | null
}

function parseWindowsVersion(userAgent: string): string {
  const match = userAgent.match(/Windows NT ([\d.]+)/i)
  if (!match) return ''

  const nt = match[1]
  if (nt === '10.0') return 'Windows 10/11 (NT 10.0)'
  if (nt === '6.3') return 'Windows 8.1 (NT 6.3)'
  if (nt === '6.2') return 'Windows 8 (NT 6.2)'
  if (nt === '6.1') return 'Windows 7 (NT 6.1)'

  return `Windows NT ${nt}`
}

export default function AdminSubmissionForm({
  page,
  defaultErrorName = '',
  generatedOutput = '',
}: AdminSubmissionFormProps) {
  const [successStatus, setSuccessStatus] = useState<SuccessStatus>('')
  const [errorName, setErrorName] = useState(defaultErrorName)
  const [windowsVersion, setWindowsVersion] = useState('')
  const [processorType, setProcessorType] = useState('')
  const [ramCapacity, setRamCapacity] = useState('')
  const [errorFixedNote, setErrorFixedNote] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const [detectedEnvironment, setDetectedEnvironment] = useState<DetectedEnvironment>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  useEffect(() => {
    setErrorName(defaultErrorName)
  }, [defaultErrorName])

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const ua = navigator.userAgent || ''
    const platform = navigator.platform || ''
    const cpuCores = navigator.hardwareConcurrency || null
    const deviceMemoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null

    setDetectedEnvironment({
      platform,
      userAgent: ua,
      cpuCores,
      deviceMemoryGb,
    })

    if (!windowsVersion) {
      setWindowsVersion(parseWindowsVersion(ua))
    }

    if (!processorType && cpuCores) {
      setProcessorType(`${cpuCores} logical cores (${platform || 'unknown platform'})`)
    }

    if (!ramCapacity && deviceMemoryGb) {
      setRamCapacity(`~${deviceMemoryGb} GB (browser detected)`)
    }
  }, [])

  const canSubmit = useMemo(() => {
    return (
      successStatus !== ''
      && errorFixedNote.trim().length >= 5
      && userName.trim().length >= 2
      && userEmail.trim().length >= 5
    )
  }, [successStatus, errorFixedNote, userName, userEmail])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const response = await fetch('/api/admin-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          successStatus,
          errorName,
          windowsVersion,
          processorType,
          ramCapacity,
          errorFixedNote,
          userName,
          userEmail,
          generatedOutput,
          detectedEnvironment,
        }),
      })

      const data = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Submit failed')
      }

      setSubmitSuccess('Thank you. Your report was submitted to admin.')
      setErrorFixedNote('')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
      <h3 className="text-lg font-bold text-cyan-300">Contribute for us kindly</h3>
      <p className="mt-1 text-sm text-gray-400">
        After generating output, tell us if this way was successful and share fix details.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Was this way successful?</label>
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name={`success-status-${page}`}
                value="success"
                checked={successStatus === 'success'}
                onChange={() => setSuccessStatus('success')}
              />
              Yes, fixed
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name={`success-status-${page}`}
                value="not_fixed"
                checked={successStatus === 'not_fixed'}
                onChange={() => setSuccessStatus('not_fixed')}
              />
              No, not fixed
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Error name (editable)</label>
          <input
            value={errorName}
            onChange={(e) => setErrorName(e.target.value)}
            placeholder="Example: Blue Screen / App crash"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Windows version</label>
            <input
              value={windowsVersion}
              onChange={(e) => setWindowsVersion(e.target.value)}
              placeholder="Windows 10 / 11"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Processor type</label>
            <input
              value={processorType}
              onChange={(e) => setProcessorType(e.target.value)}
              placeholder="Intel i5 / Ryzen 5"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">RAM capacity</label>
            <input
              value={ramCapacity}
              onChange={(e) => setRamCapacity(e.target.value)}
              placeholder="8GB / 16GB"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Error fixed note</label>
          <textarea
            value={errorFixedNote}
            onChange={(e) => setErrorFixedNote(e.target.value)}
            rows={4}
            placeholder="What happened after following the output?"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">User name</label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="name@email.com"
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
              required
            />
          </div>
        </div>

        {submitError && <p className="text-sm text-red-400">{submitError}</p>}
        {submitSuccess && <p className="text-sm text-green-400">{submitSuccess}</p>}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="inline-flex items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit to admin'}
        </button>
      </form>
    </div>
  )
}
