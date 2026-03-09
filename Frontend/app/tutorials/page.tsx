'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react'

type TutorialChatApiResponse = {
  answer?: string
}

type SoftwareListApiResponse = {
  softwares?: string[]
}

type GenerationResult = {
  software: string
  prompt: string
  rawAnswer: string
  steps: string[]
  generatedAt: Date
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_RECO_API_URL ||
  'http://localhost:8001'
).replace(/\/+$/, '')

const QUICK_PROMPTS = [
  'Fix startup crash after update',
  'Generate steps to export project correctly',
  'Fix high memory usage issue',
  'Resolve this error and prevent it again',
]

const MODEL_STAGES = [
  'Connecting to AI model',
  'Understanding your software context',
  'Analyzing issue details',
  'Building step-by-step fix plan',
  'Final validation of generated steps',
]

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function fetchSoftwareList(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/software-instruction/softwares`)
  if (!response.ok) {
    throw new Error(`Software list API error ${response.status}`)
  }

  const data = (await response.json()) as SoftwareListApiResponse
  return Array.isArray(data.softwares) ? data.softwares : []
}

async function getAIResponse(message: string, software: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/software-instruction/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      software,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Tutorial API error ${response.status}: ${detail}`)
  }

  const data = (await response.json()) as TutorialChatApiResponse
  if (!data.answer?.trim()) {
    return 'No response from the tutorial service. Please retry.'
  }

  return data.answer
}

function formatSoftwareLabel(software: string): string {
  return software
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function isNoiseLine(line: string): boolean {
  const normalized = line.trim().toLowerCase()

  if (!normalized) return true
  if (/^=+$/.test(normalized)) return true
  if (/^[-_]{3,}$/.test(normalized)) return true
  if (/^step\s*\d+\s*$/i.test(line.trim())) return true
  if (/^recommended troubleshooting steps:?$/i.test(line.trim())) return true
  if (/^software scope:/i.test(line.trim())) return true
  if (/^detected issue type:/i.test(line.trim())) return true
  if (/^evidence snippets:?$/i.test(line.trim())) return true
  if (/^end of response\.?$/i.test(line.trim())) return true

  return false
}

function extractSteps(answer: string): string[] {
  const lines = answer
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const startIndex = lines.findIndex((line) => /^recommended troubleshooting steps:?$/i.test(line))
  const parseLines = startIndex >= 0 ? lines.slice(startIndex + 1) : lines
  const candidates: string[] = []

  for (const line of parseLines) {
    if (/^evidence snippets:?$/i.test(line) || /^end of response\.?$/i.test(line)) {
      break
    }

    if (isNoiseLine(line)) {
      continue
    }

    const stepMatch = line.match(/^step\s*\d+\s*[:.)-]\s*(.+)$/i)
    if (stepMatch && stepMatch[1].trim().length > 8) {
      candidates.push(stepMatch[1].trim())
      continue
    }

    const numberedMatch = line.match(/^\d+[.)-]\s*(.+)$/)
    if (numberedMatch && numberedMatch[1].trim().length > 8) {
      candidates.push(numberedMatch[1].trim())
      continue
    }

    const bulletMatch = line.match(/^[-*]\s*(.+)$/)
    if (bulletMatch && bulletMatch[1].trim().length > 8) {
      candidates.push(bulletMatch[1].trim())
      continue
    }

    if (line.length > 15) {
      candidates.push(line)
    }
  }

  if (candidates.length >= 2) return candidates.slice(0, 10)

  const sentenceSteps = answer
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && !isNoiseLine(s))

  return sentenceSteps.slice(0, 8)
}

export default function TutorialsPage() {
  const [softwareOptions, setSoftwareOptions] = useState<string[]>([])
  const [softwareLoading, setSoftwareLoading] = useState(true)
  const [softwareError, setSoftwareError] = useState<string | null>(null)

  const [selectedSoftware, setSelectedSoftware] = useState('')
  const [prompt, setPrompt] = useState('')

  const [generating, setGenerating] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const stageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setSoftwareLoading(true)
      setSoftwareError(null)
      try {
        const list = await fetchSoftwareList()
        if (!mounted) return
        setSoftwareOptions(list)
      } catch {
        if (!mounted) return
        setSoftwareError('Could not load software list from backend.')
      } finally {
        if (mounted) setSoftwareLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  const canGenerate = selectedSoftware.trim().length > 0 && prompt.trim().length > 0 && !generating

  const scheduleStageTransitions = (current: number) => {
    if (current >= MODEL_STAGES.length - 1) return

    const randomDelay = 650 + Math.floor(Math.random() * 1200)
    stageTimeoutRef.current = setTimeout(() => {
      setStageIndex((prev) => {
        const next = Math.min(prev + 1, MODEL_STAGES.length - 1)
        scheduleStageTransitions(next)
        return next
      })
    }, randomDelay)
  }

  const startModelAnimation = () => {
    setStageIndex(0)
    setProgress(6)

    if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

    scheduleStageTransitions(0)

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 93) return prev
        const bump = 2 + Math.floor(Math.random() * 7)
        return Math.min(prev + bump, 93)
      })
    }, 320)
  }

  const stopModelAnimation = () => {
    if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    setStageIndex(MODEL_STAGES.length - 1)
    setProgress(100)
  }

  const generateSteps = async () => {
    if (!canGenerate) return

    const query = prompt.trim()

    setGenerating(true)
    setGenerationError(null)
    setResult(null)
    startModelAnimation()

    const randomModelDelay = 1800 + Math.floor(Math.random() * 3600)

    try {
      const [answer] = await Promise.all([
        getAIResponse(query, selectedSoftware),
        wait(randomModelDelay),
      ])

      const steps = extractSteps(answer)
      setResult({
        software: selectedSoftware,
        prompt: query,
        rawAnswer: answer,
        steps,
        generatedAt: new Date(),
      })
    } catch {
      setGenerationError('Failed to generate steps. Please try again and confirm backend is running.')
    } finally {
      stopModelAnimation()
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_20%,rgba(14,165,233,0.15),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.15),transparent_35%),linear-gradient(to_bottom,rgba(15,23,42,0.95),rgba(2,6,23,1))]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            <Sparkles size={13} /> AI Tutorial & Fix Generator
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Generate Guided Steps</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            This section now generates AI fix/tutorial steps directly. Select software first, describe the problem or task, then generate a professional step-by-step plan.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {['Select software', 'Write issue or task', 'Generate AI step plan'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-cyan-400" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Step 1</p>
            <label className="mb-2 block text-sm font-medium text-white">Select Software</label>
            <select
              value={selectedSoftware}
              onChange={(e) => setSelectedSoftware(e.target.value)}
              disabled={softwareLoading || generating}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 disabled:opacity-60"
            >
              <option value="">Choose software</option>
              {softwareOptions.map((software) => (
                <option key={software} value={software}>
                  {formatSoftwareLabel(software)}
                </option>
              ))}
            </select>

            {softwareLoading && <p className="mt-2 text-xs text-slate-400">Loading software list...</p>}
            {softwareError && <p className="mt-2 text-xs text-rose-300">{softwareError}</p>}

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Step 2</p>
              <p className="mb-2 text-sm text-slate-300">Describe error, issue, or any task you need to complete.</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!selectedSoftware || generating}
                rows={5}
                placeholder={
                  selectedSoftware
                    ? 'Example: After latest update, app crashes at startup. I need clear fix steps...'
                    : 'Select software first'
                }
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Quick starters</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item}
                  onClick={() => setPrompt(item)}
                  disabled={generating}
                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-500/50 hover:text-white disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={generateSteps}
                disabled={!canGenerate}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />} Generate Steps
              </button>

              <button
                onClick={() => {
                  setPrompt('')
                  setResult(null)
                  setGenerationError(null)
                }}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 transition hover:border-cyan-500/50 hover:text-white disabled:opacity-60"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Generated Steps</p>
                <p className="text-xs text-slate-400">
                  {selectedSoftware ? `Target software: ${formatSoftwareLabel(selectedSoftware)}` : 'Select software to enable generation'}
                </p>
              </div>
              {!selectedSoftware && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                  <AlertCircle size={12} /> Software required
                </span>
              )}
            </div>

            {generating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative h-10 w-10">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                    <div className="absolute inset-0 grid place-items-center rounded-full bg-cyan-500/20 text-cyan-300">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Generating through AI model...</p>
                    <p className="text-xs text-slate-400">Dynamic staged processing with random load timing</p>
                  </div>
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.25 }}
                  />
                </div>

                <div className="space-y-2">
                  {MODEL_STAGES.map((stage, idx) => {
                    const done = idx < stageIndex
                    const active = idx === stageIndex
                    return (
                      <div
                        key={stage}
                        className={`rounded-lg border px-3 py-2 text-xs ${done
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : active
                            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                            : 'border-slate-700 bg-slate-900 text-slate-500'}`}
                      >
                        {done ? 'Done' : active ? 'Running' : 'Pending'} - {stage}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {!generating && generationError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {generationError}
              </div>
            )}

            {!generating && !generationError && !result && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center">
                <p className="text-slate-300">No generated steps yet.</p>
                <p className="mt-1 text-xs text-slate-500">Complete Step 1 and Step 2, then click Generate Steps.</p>
              </div>
            )}

            {!generating && result && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400">Request</p>
                  <p className="mt-1 text-sm text-white">{result.prompt}</p>
                  <p className="mt-1 text-xs text-slate-500">Generated at {result.generatedAt.toLocaleTimeString()}</p>
                </div>

                <div className="space-y-2">
                  {result.steps.map((step, idx) => (
                    <div key={`${idx}-${step.slice(0, 20)}`} className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">Step {idx + 1}</p>
                      <p className="text-sm text-slate-200">{step}</p>
                    </div>
                  ))}
                </div>

                <details className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Raw model output
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">{result.rawAnswer}</pre>
                </details>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
