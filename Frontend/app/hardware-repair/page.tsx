'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, MapPin, Phone, Star, Clock, Award,
  Wrench, Cpu, Monitor, Smartphone, Tablet,
  ChevronRight, Navigation, CheckCircle, Zap,
  HardDrive, MemoryStick, Wifi, AlertTriangle,
  ExternalLink, RefreshCw, X, Sparkles,
} from 'lucide-react'

// ─── Background helpers ────────────────────────────────────────────────────────

function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.12 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.18) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,#000 75%)' }} />
    </div>
  )
}

function GlowOrbs() {
  return (
    <>
      <motion.div className="absolute top-20 left-10 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-20 right-10 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.08) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
    </>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Suggestion {
  icon: any
  title: string
  description: string
  urgency: 'High' | 'Medium' | 'Low'
  estimatedCost: string
}

interface AIAnalysis {
  summary: string
  suggestions: Suggestion[]
  searchQuery: string   // what to pass to your backend shop-search API
}

interface Shop {
  id: number | string
  name: string
  rating: number
  reviews: number
  distance: number
  address: string
  phone: string
  hours: string
  specialties: string[]
  responseTime: string
  isOpen: boolean
  priceRange: '$' | '$$' | '$$$'
}

interface UserLocation {
  lat: number
  lng: number
  city: string
}

// ─── Device types ──────────────────────────────────────────────────────────────

const DEVICE_TYPES = [
  { value: 'laptop',   label: 'Laptop',        icon: Monitor     },
  { value: 'desktop',  label: 'Desktop PC',    icon: Cpu         },
  { value: 'phone',    label: 'Smartphone',    icon: Smartphone  },
  { value: 'tablet',   label: 'Tablet',        icon: Tablet      },
  { value: 'monitor',  label: 'Monitor',       icon: Monitor     },
  { value: 'other',    label: 'Other Device',  icon: HardDrive   },
]

// ─── AI analysis engine (replace body with real API call) ─────────────────────

function analyzeIssue(device: string, description: string): AIAnalysis {
  const t = description.toLowerCase()

  const isSlow    = /slow|lag|freeze|freezing|takes long|loading/i.test(t)
  const isHeat    = /hot|heat|overh|fan|burn|temperature/i.test(t)
  const isDisplay = /screen|display|black|flicker|crack|broken screen|no display/i.test(t)
  const isBattery = /battery|not charging|drain|charge|plugged/i.test(t)
  const isStorage = /storage|disk|full|no space|hdd|ssd/i.test(t)
  const isMemory  = /ram|memory|crash|out of memory/i.test(t)
  const isNetwork = /wifi|internet|network|wireless|connection/i.test(t)
  const isKeyboard= /keyboard|key|type|button|stuck/i.test(t)

  // Build AI suggestions
  const suggestions: Suggestion[] = []

  if (isSlow && !isStorage && !isMemory) {
    suggestions.push({
      icon: HardDrive, urgency: 'High',
      title: 'Upgrade HDD → SSD',
      description: 'Replacing a traditional hard drive with an SSD is the single biggest speed improvement. Boot times drop from minutes to seconds.',
      estimatedCost: '$50–$120',
    })
    suggestions.push({
      icon: MemoryStick, urgency: 'Medium',
      title: 'Upgrade RAM',
      description: 'Adding more RAM (8GB → 16GB) reduces slowdowns when running multiple programs.',
      estimatedCost: '$30–$80',
    })
  }
  if (isStorage) {
    suggestions.push({
      icon: HardDrive, urgency: 'High',
      title: 'SSD Replacement / Upgrade',
      description: 'Your storage drive appears full or failing. A new SSD provides more space and dramatically better performance.',
      estimatedCost: '$60–$150',
    })
  }
  if (isMemory) {
    suggestions.push({
      icon: MemoryStick, urgency: 'High',
      title: 'RAM Upgrade or Replacement',
      description: 'Insufficient or faulty RAM causes crashes and slowdowns. A technician can test and replace/upgrade your RAM modules.',
      estimatedCost: '$30–$90',
    })
  }
  if (isHeat) {
    suggestions.push({
      icon: Cpu, urgency: 'High',
      title: 'Thermal Cleaning & Re-paste',
      description: 'Overheating is usually caused by dust buildup and dried thermal paste. A full internal cleaning and re-paste is needed.',
      estimatedCost: '$40–$80',
    })
  }
  if (isDisplay) {
    suggestions.push({
      icon: Monitor, urgency: 'High',
      title: 'Screen Replacement',
      description: 'A cracked, flickering, or dead display needs professional replacement using OEM or compatible parts.',
      estimatedCost: '$80–$300',
    })
  }
  if (isBattery) {
    suggestions.push({
      icon: Zap, urgency: 'Medium',
      title: 'Battery Replacement',
      description: 'A degraded battery that no longer holds charge or shows swelling must be replaced by a certified technician.',
      estimatedCost: '$50–$150',
    })
  }
  if (isNetwork) {
    suggestions.push({
      icon: Wifi, urgency: 'Medium',
      title: 'WiFi Card Replacement',
      description: 'If software fixes have not worked, the internal wireless adapter may be faulty and need replacing.',
      estimatedCost: '$30–$80',
    })
  }
  if (isKeyboard) {
    suggestions.push({
      icon: Wrench, urgency: 'Medium',
      title: 'Keyboard Repair / Replacement',
      description: 'Stuck keys, unresponsive keys, or liquid damage require keyboard cleaning or a full replacement.',
      estimatedCost: '$40–$120',
    })
  }

  // Default fallback
  if (suggestions.length === 0) {
    suggestions.push({
      icon: Wrench, urgency: 'Medium',
      title: 'Professional Diagnosis',
      description: 'A certified technician should run a full hardware diagnostic to identify the exact cause of your issue.',
      estimatedCost: '$20–$50',
    })
  }

  return {
    summary: isSlow
      ? `Your ${device} is experiencing performance issues. Based on your description, the most likely causes are storage and/or memory bottlenecks.`
      : isHeat
      ? `Your ${device} is overheating, which can permanently damage components if not addressed quickly.`
      : isDisplay
      ? `Your ${device} has a display issue that requires hands-on repair by a professional.`
      : isBattery
      ? `Your ${device} has a battery problem. A replacement is the most reliable fix.`
      : `Your ${device} issue has been analyzed. A nearby technician can run a full diagnosis and fix it quickly.`,
    suggestions,
    searchQuery: `${device} repair ${suggestions[0]?.title ?? 'hardware'} near me`,
  }
}

// ─── Mock shops (REPLACE with real API: fetch('/api/shops?lat=&lng=&q=')) ──────

const MOCK_SHOPS: Shop[] = [
  {
    id: 1, name: 'TechRepair Pro', rating: 4.8, reviews: 342,
    distance: 0.5, address: '123 Tech Street, San Francisco, CA',
    phone: '+1 (555) 123-4567', hours: 'Mon–Sat: 9AM–6PM',
    specialties: ['Laptop', 'Desktop', 'SSD Upgrade'], responseTime: '~15 min',
    isOpen: true, priceRange: '$$',
  },
  {
    id: 2, name: 'QuickFix Electronics', rating: 4.6, reviews: 287,
    distance: 1.2, address: '456 Electronics Ave, San Francisco, CA',
    phone: '+1 (555) 234-5678', hours: 'Daily: 10AM–8PM',
    specialties: ['Smartphone', 'Tablet', 'Screen Repair'], responseTime: '~30 min',
    isOpen: true, priceRange: '$',
  },
  {
    id: 3, name: 'Computer Solutions Hub', rating: 4.9, reviews: 512,
    distance: 2.1, address: '789 Repair Lane, San Francisco, CA',
    phone: '+1 (555) 345-6789', hours: 'Mon–Fri: 9AM–7PM, Sat: 10AM–5PM',
    specialties: ['Laptop', 'Desktop', 'RAM Upgrade'], responseTime: '~20 min',
    isOpen: false, priceRange: '$$$',
  },
]

const priceLabel = { '$': 'Budget', '$$': 'Mid-range', '$$$': 'Premium' }
const priceColor = { '$': 'text-green-400 border-green-500/20 bg-green-500/8', '$$': 'text-yellow-400 border-yellow-500/20 bg-yellow-500/8', '$$$': 'text-red-400 border-red-500/20 bg-red-500/8' }
const urgencyColor = { High: 'text-red-400 border-red-500/20 bg-red-500/8', Medium: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/8', Low: 'text-green-400 border-green-500/20 bg-green-500/8' }

// ─── Main component ────────────────────────────────────────────────────────────

export default function HardwareRepair() {
  const [device, setDevice]         = useState('laptop')
  const [description, setDescription] = useState('')
  const [loading, setLoading]       = useState(false)
  const [locating, setLocating]     = useState(false)
  const [analysis, setAnalysis]     = useState<AIAnalysis | null>(null)
  const [shops, setShops]           = useState<Shop[] | null>(null)
  const [location, setLocation]     = useState<UserLocation | null>(null)
  const [locError, setLocError]     = useState('')
  const [stage, setStage]           = useState<'idle' | 'analyzing' | 'locating' | 'finding' | 'done'>('idle')
  const [progress, setProgress]     = useState(0)

  // ── Get user location ──
  const getLocation = (): Promise<UserLocation> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject('Geolocation not supported'); return }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, city: 'Your Area' }),
        () => reject('Location permission denied'),
      )
    })

  // ── Main submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    setLoading(true)
    setAnalysis(null)
    setShops(null)
    setLocError('')
    setProgress(0)

    try {
      // Step 1: AI analysis
      setStage('analyzing')
      setProgress(20)
      await new Promise(r => setTimeout(r, 600))
      const ai = analyzeIssue(device, description)
      setAnalysis(ai)
      setProgress(45)

      // Step 2: Get location
      setStage('locating')
      await new Promise(r => setTimeout(r, 300))
      let loc: UserLocation
      try {
        setLocating(true)
        loc = await getLocation()
        setLocation(loc)
      } catch {
        // fallback — still show shops without real GPS
        loc = { lat: 37.7749, lng: -122.4194, city: 'San Francisco (default)' }
        setLocation(loc)
        setLocError('Location permission denied — showing default area results')
      } finally {
        setLocating(false)
      }
      setProgress(70)

      // Step 3: Find shops
      // ── REPLACE THIS BLOCK WITH YOUR REAL API ──────────────────────────────
      // const res = await fetch(`/api/shops?lat=${loc.lat}&lng=${loc.lng}&q=${encodeURIComponent(ai.searchQuery)}`)
      // const data = await res.json()
      // setShops(data.shops)
      // ──────────────────────────────────────────────────────────────────────
      setStage('finding')
      await new Promise(r => setTimeout(r, 700))
      setShops(MOCK_SHOPS)
      // ──────────────────────────────────────────────────────────────────────

      setProgress(100)
      setStage('done')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setAnalysis(null); setShops(null); setDescription('')
    setStage('idle'); setProgress(0); setLocError('')
  }

  const stageLabel: Record<typeof stage, string> = {
    idle: '', analyzing: 'Analyzing your issue…',
    locating: 'Getting your location…', finding: 'Finding nearby shops…', done: 'Done!',
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <GridBg /><GlowOrbs />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-orange-500/30 bg-orange-500/10 backdrop-blur-md">
            <motion.span className="w-2 h-2 rounded-full bg-orange-400 inline-block"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <Wrench size={13} className="text-orange-400" />
            <span className="text-orange-300 text-sm font-semibold">AI Hardware Diagnosis + Repair Locator</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
            <span className="block bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Diagnose &</span>
            <span className="block bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 40px rgba(251,146,60,0.35))' }}>
              Fix Hardware
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Describe your hardware problem in plain English. AI diagnoses it, then finds the best repair shops near you.
          </p>
        </motion.div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT: Input panel ── */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-4">

              {/* Main input card */}
              <div className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <Wrench size={13} className="text-white" />
                  </div>
                  <span className="font-bold text-sm text-white">Describe Hardware Issue</span>
                  {(analysis || shops) && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      onClick={handleReset} whileTap={{ scale: 0.9 }}
                      className="ml-auto p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <X size={13} />
                    </motion.button>
                  )}
                </div>

                <div className="p-5 space-y-4">

                  {/* Device type selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Device Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DEVICE_TYPES.map(({ value, label, icon: Icon }) => (
                        <motion.button key={value} onClick={() => setDevice(value)}
                          whileTap={{ scale: 0.95 }}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                            device === value
                              ? 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                              : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/8 hover:text-white'
                          }`}>
                          <Icon size={16} />
                          {label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Problem description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      What's the problem?
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={`e.g. My ${device} is very slow to start up, the fan runs loudly all the time, and opening any app takes forever…`}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all resize-none leading-relaxed"
                    />
                    {description && (
                      <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-gray-600">{description.length} chars</span>
                        <button onClick={() => setDescription('')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Clear</button>
                      </div>
                    )}
                  </div>

                  {/* Location note */}
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20">
                    <Navigation size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300 leading-relaxed">
                      We'll request your location to find repair shops nearby. Nothing is stored.
                    </p>
                  </div>

                  {/* Progress */}
                  <AnimatePresence>
                    {loading && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                <Loader2 size={11} />
                              </motion.div>
                              {stageLabel[stage]}
                            </span>
                            <span className="text-orange-400 font-bold">{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                              animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-600">
                            {['Analyze', 'Locate', 'Find', 'Done'].map((s, i) => (
                              <span key={s} className={progress >= (i + 1) * 25 ? 'text-orange-400' : ''}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <motion.button onClick={handleSubmit} disabled={loading || !description.trim()}
                    whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{
                      background: loading ? 'rgba(251,146,60,0.2)' : 'linear-gradient(135deg,#f97316,#ef4444)',
                      boxShadow: loading ? 'none' : '0 0 24px rgba(249,115,22,0.3)',
                    }}>
                    {loading
                      ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} /></motion.div> {stageLabel[stage]}</>
                      : <><Zap size={16} /> Diagnose & Find Shops</>
                    }
                  </motion.button>
                </div>
              </div>

              {/* Why trust us */}
              <div className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Why Auto Fixer</h3>
                <div className="space-y-3">
                  {[
                    { icon: Award,         color: 'text-yellow-400', text: 'Verified certified technicians' },
                    { icon: Star,          color: 'text-cyan-400',   text: 'Average shop rating 4.7 / 5'   },
                    { icon: Clock,         color: 'text-purple-400', text: 'Average response under 20 min' },
                    { icon: CheckCircle,   color: 'text-green-400',  text: 'Price estimates before you go' },
                  ].map(({ icon: Icon, color, text }, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Icon size={15} className={`${color} flex-shrink-0`} />
                      <span className="text-sm text-gray-400">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Results ── */}
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">

              {/* ── Empty state ── */}
              {!analysis && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-h-[500px] rounded-2xl border border-white/10 bg-gray-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center mb-8">
                    <Wrench size={40} className="text-orange-400" />
                  </motion.div>
                  <h3 className="text-3xl font-black text-white mb-3">Hardware Repair Locator</h3>
                  <p className="text-gray-500 max-w-sm leading-relaxed mb-8">
                    Describe your hardware issue on the left. AI will diagnose it and find the best certified repair shops near you.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-lg">
                    {[
                      { label: 'PC Running Slow',    desc: 'SSD / RAM upgrade' },
                      { label: 'Overheating',         desc: 'Thermal cleaning'  },
                      { label: 'Broken Screen',       desc: 'Display repair'    },
                      { label: 'Battery Draining',    desc: 'Battery replace'   },
                      { label: 'No WiFi',             desc: 'Card replacement'  },
                      { label: 'Won\'t Turn On',     desc: 'Full diagnosis'    },
                    ].map(({ label, desc }) => (
                      <button key={label} onClick={() => setDescription(label)}
                        className="p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-orange-500/30 transition-all text-left group">
                        <div className="font-semibold text-white text-xs group-hover:text-orange-300 transition-colors">{label}</div>
                        <div className="text-gray-600 text-[10px] mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Loading state ── */}
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-h-[500px] rounded-2xl border border-white/10 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <motion.div className="absolute inset-0 rounded-full border-2 border-orange-500/30"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      <motion.div className="absolute inset-0 rounded-full border-2 border-red-500/20"
                        animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                          {stage === 'locating' ? <Navigation size={28} className="text-orange-400" /> : <Wrench size={28} className="text-orange-400" />}
                        </motion.div>
                      </div>
                    </div>
                    <p className="text-white font-bold text-lg">{stageLabel[stage]}</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {stage === 'locating' ? 'Please allow location access when prompted' : 'This only takes a moment…'}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ── Results ── */}
              {analysis && !loading && (
                <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-6">

                  {/* Location error banner */}
                  {locError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
                      <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-yellow-300 text-sm">{locError}</p>
                    </motion.div>
                  )}

                  {/* ── AI Diagnosis card ── */}
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-white text-sm">AI Diagnosis</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <CheckCircle size={10} className="text-green-400" />
                          <span className="text-xs text-green-400 font-semibold">Issue identified</span>
                        </div>
                      </div>
                      <button onClick={handleReset}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all">
                        <RefreshCw size={11} /> New Search
                      </button>
                    </div>

                    <div className="p-6 space-y-5">
                      <p className="text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>

                      {/* Suggestions */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Recommended Repairs</h4>
                        {analysis.suggestions.map((s, i) => {
                          const Icon = s.icon
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/8 hover:bg-white/[0.07] transition-colors">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                <Icon size={18} className="text-orange-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="font-bold text-white text-sm">{s.title}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgencyColor[s.urgency]}`}>
                                    {s.urgency} Priority
                                  </span>
                                </div>
                                <p className="text-gray-400 text-xs leading-relaxed mb-2">{s.description}</p>
                                <span className="text-xs font-semibold text-cyan-400">Est. cost: {s.estimatedCost}</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── Nearby shops ── */}
                  {shops && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-white">
                            {shops.length} Repair Shops Found
                          </h3>
                          {location && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Navigation size={12} className="text-cyan-400" />
                              <span className="text-xs text-gray-500">Near {location.city}</span>
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                          Sorted by distance
                        </span>
                      </div>

                      {shops.map((shop, i) => (
                        <motion.div key={shop.id}
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          whileHover={{ y: -3 }}
                          className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-all"
                          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 16px 48px rgba(249,115,22,0.1)')}
                          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                          style={{ transition: 'box-shadow 0.3s' }}>

                          {/* Shop header */}
                          <div className="flex items-start justify-between p-5 pb-4">
                            <div className="flex items-start gap-4">
                              {/* Avatar */}
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                <Wrench size={20} className="text-orange-400" />
                              </div>
                              <div>
                                <h4 className="font-black text-white text-lg leading-tight">{shop.name}</h4>
                                {/* Stars */}
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex">
                                    {[...Array(5)].map((_, j) => (
                                      <Star key={j} size={13}
                                        className={j < Math.floor(shop.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'} />
                                    ))}
                                  </div>
                                  <span className="text-white font-bold text-sm">{shop.rating}</span>
                                  <span className="text-gray-500 text-xs">({shop.reviews} reviews)</span>
                                </div>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${shop.isOpen ? 'text-green-400 border-green-500/20 bg-green-500/8' : 'text-red-400 border-red-500/20 bg-red-500/8'}`}>
                                {shop.isOpen ? '● Open Now' : '● Closed'}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${priceColor[shop.priceRange]}`}>
                                {shop.priceRange} {priceLabel[shop.priceRange]}
                              </span>
                            </div>
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-5 py-4 border-t border-b border-white/8">
                            <div className="flex items-center gap-2.5">
                              <MapPin size={14} className="text-cyan-400 flex-shrink-0" />
                              <span className="text-gray-300 text-xs">{shop.distance} km away · {shop.address}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Phone size={14} className="text-purple-400 flex-shrink-0" />
                              <span className="text-gray-300 text-xs">{shop.phone}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Clock size={14} className="text-blue-400 flex-shrink-0" />
                              <span className="text-gray-300 text-xs">{shop.hours}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Zap size={14} className="text-orange-400 flex-shrink-0" />
                              <span className="text-gray-300 text-xs">Response: {shop.responseTime}</span>
                            </div>
                          </div>

                          {/* Specialties + actions */}
                          <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-1.5">
                              {shop.specialties.map(s => (
                                <span key={s} className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-purple-500/20 bg-purple-500/8 text-purple-300">
                                  {s}
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              {/* REPLACE href with real call/maps links from your API */}
                              <motion.a href={`tel:${shop.phone}`} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all"
                                style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)' }}>
                                <Phone size={12} /> Call
                              </motion.a>
                              <motion.a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`}
                                target="_blank" rel="noopener noreferrer"
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all">
                                <ExternalLink size={12} /> Directions
                              </motion.a>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── Trust section ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }} viewport={{ once: true }}
          className="mt-20 rounded-2xl border border-white/10 bg-gray-950/60 backdrop-blur-sm p-12">
          <h3 className="text-2xl font-black text-white mb-10 text-center">Why Trust Our Partners</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Award,  grad: 'from-cyan-400 to-blue-500',    title: 'Certified Technicians', desc: 'Every listed shop has verified certified technicians on staff.' },
              { icon: Star,   grad: 'from-purple-500 to-pink-500',  title: 'High Ratings',          desc: 'Average rating 4.7/5 across thousands of verified customer reviews.' },
              { icon: Clock,  grad: 'from-orange-400 to-red-500',   title: 'Quick Response',        desc: 'Average response time under 20 minutes for urgent hardware issues.' },
            ].map(({ icon: Icon, grad, title, desc }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="flex flex-col items-center text-center group">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center mb-4`}
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <Icon size={24} className="text-white" />
                </motion.div>
                <h4 className="font-bold text-white mb-2">{title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}