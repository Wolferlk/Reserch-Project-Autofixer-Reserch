'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Upload, Image as ImageIcon, Sparkles, Zap, CheckCircle, XCircle, RotateCcw, ChevronRight, Eye, AlertTriangle, BookOpen } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

function GridBg() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.12 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.18) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 25%, #000 78%)' }} />
    </div>
  )
}

function GlowOrbs() {
  return (
    <>
      <motion.div className="fixed top-16 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.1) 0%,transparent 70%)', filter: 'blur(40px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="fixed bottom-32 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)', filter: 'blur(40px)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
    </>
  )
}

function ConfidenceBar({ value, color = '#22d3ee' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <motion.div className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
    </div>
  )
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
      style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6)' }}>{n}</span>
  )
}

export default function ScreenshotScanner() {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<any>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  const ALLOWED = ['image/png','image/jpeg','image/jpg','image/webp']

  const handleFile = (f: File) => {
    setError(null); setResult(null)
    if (!ALLOWED.includes(f.type)) { setError('Only PNG, JPG, JPEG, and WEBP images are allowed.'); return }
    if (f.size > 10 * 1024 * 1024) { setError('Image must be smaller than 10 MB.'); return }
    setFile(f)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }, [])

  const analyze = async () => {
    if (!file) return
    setLoading(true); setError(null)
    const form = new FormData()
    form.append('image', file)
    try {
      const res  = await fetch('http://127.0.0.1:8001/analyze', { method: 'POST', body: form })
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Failed to analyze image. Make sure the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null) }

  const cls        = result?.image_classification
  const steps      = result?.matched_articles?.[0]?.steps?.split('|').map((s: string) => s.trim()).filter(Boolean) ?? []
  const topArticle = result?.matched_articles?.[0]

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <GridBg /><GlowOrbs />

      {/* NAV */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group text-sm font-medium">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 text-xs font-semibold tracking-wide uppercase">AI Vision Active</span>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-16">

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
            <Eye size={13} className="text-blue-400" />
            <span className="text-blue-300 text-sm font-semibold tracking-wide">Vision AI · Error Scanner</span>
            <Sparkles size={13} className="text-blue-400" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-5">
            <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Screenshot</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 36px rgba(34,211,238,0.35))' }}>Scanner</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Upload any error screenshot — Vision AI instantly reads, classifies, and generates a precise fix.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── UPLOAD PANEL ── */}
          {!result && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>

              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !file && inputRef.current?.click()}
                className="relative rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer mb-6"
                style={{
                  borderColor: dragging ? 'rgba(34,211,238,0.7)' : file ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.1)',
                  background:  dragging ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.03)',
                  boxShadow:   dragging ? '0 0 40px rgba(34,211,238,0.15)' : file ? '0 0 24px rgba(34,211,238,0.08)' : 'none',
                  minHeight: preview ? 'auto' : '280px',
                }}>

                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-12 h-12 rounded-br-full pointer-events-none"
                  style={{ background: 'linear-gradient(135deg,rgba(34,211,238,0.25),transparent)' }} />
                <div className="absolute bottom-0 right-0 w-12 h-12 rounded-tl-full pointer-events-none"
                  style={{ background: 'linear-gradient(315deg,rgba(168,85,247,0.25),transparent)' }} />

                {preview ? (
                  <div className="p-6">
                    <div className="relative group">
                      <img src={preview} alt="Preview" className="w-full max-h-96 object-contain rounded-xl border border-white/10" />
                      <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/20 transition-all">
                          <Upload size={14} /> Change Image
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3 px-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <ImageIcon size={14} className="text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file?.name}</p>
                        <p className="text-gray-500 text-xs">{file ? (file.size / 1024).toFixed(0) + ' KB' : ''} · Ready to analyze</p>
                      </div>
                      <CheckCircle size={16} className="text-cyan-400 flex-shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-8">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,rgba(34,211,238,0.2),rgba(59,130,246,0.2))', border: '1px solid rgba(34,211,238,0.3)' }}>
                      <Upload size={32} className="text-cyan-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Drop your screenshot here</h3>
                    <p className="text-gray-500 text-sm mb-4">or click to browse files</p>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      {['PNG','JPG','JPEG','WEBP'].map(f => (
                        <span key={f} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-400 font-mono">{f}</span>
                      ))}
                      <span className="text-gray-600 text-xs">· Max 10MB</span>
                    </div>
                  </div>
                )}
              </div>

              <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onInput} className="hidden" />

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 mb-6">
                    <XCircle size={16} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Analyze button */}
              {file && !loading && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={analyze}
                    className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg text-white"
                    style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', boxShadow: '0 0 40px rgba(34,211,238,0.35)' }}>
                    <Eye size={20} /> Analyze Screenshot <Sparkles size={16} />
                  </motion.button>
                </motion.div>
              )}

              {/* Loading */}
              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-5 py-10">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-white/5" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" />
                      <div className="absolute inset-3 rounded-full flex items-center justify-center"
                        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.15),transparent)' }}>
                        <Eye size={20} className="text-cyan-400" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-lg mb-1">Scanning your screenshot…</p>
                      <p className="text-gray-500 text-sm">Vision AI is extracting and classifying the error</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-2 h-2 rounded-full bg-cyan-400"
                          animate={{ scale: [1,1.5,1], opacity: [0.5,1,0.5] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* How it works — shown when no file selected */}
              {!file && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: Upload,  step: '01', title: 'Upload Screenshot',     desc: 'Drag & drop or click to upload any error screenshot from your screen.' },
                    { icon: Eye,     step: '02', title: 'AI Reads & Classifies', desc: 'Vision AI extracts text via OCR and classifies the error type with confidence.' },
                    { icon: Zap,     step: '03', title: 'Get Instant Fix',       desc: 'Receive step-by-step AI-generated fix instructions within seconds.' },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="p-5 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm">
                        <div className="text-xs font-black text-cyan-500/50 font-mono mb-3">{item.step}</div>
                        <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,rgba(34,211,238,0.2),rgba(59,130,246,0.2))', border: '1px solid rgba(34,211,238,0.2)' }}>
                          <Icon size={18} className="text-cyan-400" />
                        </div>
                        <h4 className="font-bold text-white mb-1.5 text-sm">{item.title}</h4>
                        <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── RESULTS PANEL ── */}
          {result && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

              {/* Success banner */}
              <div className="flex items-center justify-between mb-8 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <CheckCircle size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Analysis Complete</p>
                    <p className="text-gray-500 text-xs">Screenshot scanned and classified successfully</p>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                  <RotateCcw size={13} /> New Scan
                </motion.button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left column */}
                <div className="lg:col-span-1 flex flex-col gap-5">

                  {preview && (
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                      <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-white/5">
                        <ImageIcon size={13} className="text-cyan-400" />
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Uploaded Screenshot</span>
                      </div>
                      <div className="p-3">
                        <img src={preview} alt="Uploaded" className="w-full rounded-xl object-contain max-h-64 border border-white/5" />
                      </div>
                    </motion.div>
                  )}

                  {cls && (
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                      className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5"
                      style={{ boxShadow: '0 8px 32px rgba(59,130,246,0.12)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <AlertTriangle size={13} className="text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Classification</span>
                      </div>
                      <p className="text-white font-bold text-base mb-1">{cls.category}</p>
                      <p className="text-gray-500 text-xs mb-4">Confidence score</p>
                      <div className="flex items-center gap-3">
                        <ConfidenceBar value={cls.confidence} color="#3b82f6" />
                        <span className="text-blue-400 font-bold text-sm flex-shrink-0">{(cls.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </motion.div>
                  )}

                  {result.clean_text && (
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <BookOpen size={13} className="text-purple-400" />
                        </div>
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">OCR Text</span>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                        {result.clean_text}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                  {topArticle && (
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                      className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6"
                      style={{ boxShadow: '0 8px 32px rgba(234,179,8,0.08)' }}>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <Zap size={13} className="text-yellow-400" />
                          </div>
                          <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Best Match</span>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                          {(topArticle.score * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <p className="text-white font-bold text-base mb-3">{topArticle.title}</p>
                      <ConfidenceBar value={topArticle.score} color="#eab308" />
                    </motion.div>
                  )}

                  {steps.length > 0 && (
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                      className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
                      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2"
                        style={{ background: 'linear-gradient(90deg,rgba(34,211,238,0.08),transparent)' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6)' }}>
                          <ChevronRight size={13} className="text-white" />
                        </div>
                        <span className="text-sm font-bold text-white">Recommended Fix Steps</span>
                        <span className="ml-auto text-xs text-gray-500">{steps.length} steps</span>
                      </div>
                      <div className="p-6">
                        <ol className="space-y-4">
                          {steps.map((step: string, i: number) => (
                            <motion.li key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.07 }}
                              className="flex items-start gap-4 group">
                              <StepBadge n={i + 1} />
                              <p className="text-gray-300 text-sm leading-relaxed pt-0.5 group-hover:text-white transition-colors">{step}</p>
                            </motion.li>
                          ))}
                        </ol>
                      </div>
                    </motion.div>
                  )}

                  {result.generated_fix && (
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                      className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6"
                      style={{ boxShadow: '0 8px 32px rgba(34,211,238,0.08)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)' }}>
                          <Sparkles size={13} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AI Generated Fix</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{result.generated_fix}</p>
                    </motion.div>
                  )}

                  {result.matched_articles?.length > 1 && (
                    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                          <BookOpen size={13} className="text-gray-400" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Other Matches</span>
                      </div>
                      <div className="space-y-3">
                        {result.matched_articles.slice(1).map((a: any, i: number) => (
                          <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                            <p className="text-gray-300 text-sm font-medium">{a.title}</p>
                            <span className="text-xs text-gray-500 flex-shrink-0">{(a.score * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Bottom CTAs */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={reset}
                  className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', boxShadow: '0 0 32px rgba(34,211,238,0.3)' }}>
                  <RotateCcw size={17} /> Scan Another Screenshot
                </motion.button>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/error-fixer"
                    className="inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-bold text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                    Try Error Text Fixer <ChevronRight size={17} />
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}