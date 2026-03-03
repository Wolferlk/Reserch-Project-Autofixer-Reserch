'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Image, BookOpen, Wrench, Check, Star, Sparkles, Shield, Clock, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (!started) return
    let t0: number
    const tick = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setCount(Math.floor(p * end))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, end, duration])
  return { count, setStarted }
}

function ParticleField() {
  const particles = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    x: `${(i * 1.81) % 100}%`,
    y: `${(i * 2.37) % 100}%`,
    size: (i % 3) + 1,
    color: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#3b82f6',
    delay: (i % 30) * 0.1,
    dur: 3 + (i % 4),
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ width: p.size, height: p.size, left: p.x, top: p.y, background: p.color, opacity: 0.3 }}
          animate={{ y: [0, -28, 0], opacity: [0.2, 0.7, 0.2], scale: [1, 1.6, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
      ))}
    </div>
  )
}

function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.18 }}>
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
      <motion.div className="absolute top-16 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.13) 0%,transparent 70%)', filter: 'blur(40px)' }}
        animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-32 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.13) 0%,transparent 70%)', filter: 'blur(40px)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.8, 0.5, 0.8] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-1/2 right-12 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)', filter: 'blur(30px)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }} />
    </>
  )
}

function Typewriter({ phrases }: { phrases: string[] }) {
  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const full = phrases[idx]
    const id = setTimeout(() => {
      if (!deleting) {
        if (text.length < full.length) setText(full.slice(0, text.length + 1))
        else setTimeout(() => setDeleting(true), 1400)
      } else {
        if (text.length > 0) setText(text.slice(0, -1))
        else { setDeleting(false); setIdx((idx + 1) % phrases.length) }
      }
    }, deleting ? 38 : 78)
    return () => clearTimeout(id)
  }, [text, deleting, idx, phrases])
  return (
    <span>
      {text}
      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-10 md:h-14 bg-cyan-400 ml-1 align-middle" />
    </span>
  )
}

function AnimStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { count, setStarted } = useCounter(value)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [setStarted])
  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl md:text-6xl font-black mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-400 text-sm uppercase tracking-widest font-medium">{label}</div>
    </div>
  )
}

export default function Home() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const features = [
    { icon: Zap,      title: 'Fix Error Text',      desc: 'Paste any error and get an instant AI diagnosis with clear, step-by-step resolution guides.',               href: '/error-fixer',        grad: 'from-cyan-400 to-blue-500',   glow: 'rgba(34,211,238,0.28)',  tag: 'Most Popular' },
    { icon: Image,    title: 'Screenshot Scanner',  desc: 'Upload an error screenshot — vision AI instantly identifies the issue and hands you an exact fix.',          href: '/screenshot-scanner', grad: 'from-blue-500 to-purple-500', glow: 'rgba(59,130,246,0.28)',  tag: 'AI Vision'    },
    { icon: BookOpen, title: 'Learn Tutorials',     desc: 'Master Photoshop, VS Code, Windows & 500+ other apps with guided, AI-generated fix tutorials.',              href: '/tutorials',          grad: 'from-purple-500 to-pink-500', glow: 'rgba(168,85,247,0.28)', tag: '500+ Apps'    },
    { icon: Wrench,   title: 'Hardware & Repair',   desc: 'Run hardware diagnostics and surface verified local repair shops near you in seconds.',                       href: '/hardware-repair',    grad: 'from-pink-500 to-red-500',    glow: 'rgba(236,72,153,0.28)', tag: 'Near You'     },
  ]

  const plans = [
    {
      name: 'Free', monthly: 0, yearly: 0, blurb: 'Perfect for occasional fixes',
      grad: 'from-gray-500 to-gray-400', popular: false, cta: 'Get Started Free', href: '/error-fixer',
      perks: ['5 error fixes / month', '3 screenshot scans', 'Basic tutorial access', 'Community support'],
    },
    {
      name: 'Pro', monthly: 19, yearly: 15, blurb: 'For developers & power users',
      grad: 'from-cyan-400 to-blue-500', popular: true, cta: 'Start Pro Trial', href: '/error-fixer',
      perks: ['Unlimited error fixes', 'Unlimited screenshot scans', 'Full tutorial library', 'Priority AI responses', 'Hardware diagnostics', 'Email support'],
    },
    {
      name: 'Team', monthly: 49, yearly: 39, blurb: 'Built for engineering teams',
      grad: 'from-purple-500 to-pink-500', popular: false, cta: 'Start Team Trial', href: '/error-fixer',
      perks: ['Everything in Pro', 'Up to 10 members', 'Shared error history', 'API access', 'Custom integrations', 'Dedicated support'],
    },
  ]

  const reviews = [
    { name: 'Sarah K.',  role: 'Senior Developer', text: 'Auto Fixer saved me 3 hours debugging a Webpack config. Absolutely wild how fast it diagnosed the issue.', stars: 5, av: 'S' },
    { name: 'James T.',  role: 'CS Student',        text: 'Used to spend days on Stack Overflow. Now I screenshot the error and get a fix in 10 seconds.',            stars: 5, av: 'J' },
    { name: 'Priya M.',  role: 'DevOps Engineer',   text: 'The hardware diagnostics spotted a failing SSD before it caused data loss. A literal lifesaver.',           stars: 5, av: 'P' },
  ]

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center py-20 overflow-hidden">
        <GridBg /><GlowOrbs /><ParticleField />
        <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40"
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500">Scroll</span>
          <ChevronDown size={14} className="text-gray-500" />
        </motion.div>

        <div className="container-custom relative z-10 text-center px-4 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md">
            <motion.span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <span className="text-cyan-300 text-sm font-semibold tracking-wide">Powered by Next-Gen AI</span>
            <Sparkles size={13} className="text-cyan-400" />
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.15 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-6">
            <span className="block bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Fix Any</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent min-h-[1.15em]"
              style={{ filter: 'drop-shadow(0 0 48px rgba(34,211,238,0.35))' }}>
              <Typewriter phrases={['Error Instantly', 'Bug in Seconds', 'Crash Fast', 'Issue with AI']} />
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.3 }}
            className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            The world's most advanced AI error-resolution platform. Paste, scan, or describe — and watch bugs disappear.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
              <Link href="/error-fixer"
                className="group inline-flex items-center gap-3 px-9 py-4 rounded-2xl font-bold text-lg text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', boxShadow: '0 0 32px rgba(34,211,238,0.4)' }}>
                <span className="relative">Start Fixing Free</span>
                <ArrowRight size={20} className="relative group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
              <button className="inline-flex items-center gap-3 px-9 py-4 rounded-2xl font-bold text-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all">
                Watch Demo
                <motion.div className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
                  animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-black ml-0.5" />
                </motion.div>
              </button>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
            {['No credit card required', 'Free forever plan', 'Cancel anytime'].map((t, i) => (
              <div key={i} className="flex items-center gap-2"><Check size={13} className="text-cyan-400" />{t}</div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── DEMO VIDEO ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">Live Demo</span>
            <h2 className="text-4xl md:text-5xl font-black">See the Magic Happen</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.85 }} viewport={{ once: true }} className="relative">
            <div className="absolute -inset-1.5 rounded-3xl opacity-55" style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', filter: 'blur(10px)' }} />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gray-950">
              <div className="h-9 bg-[#1a1a1a] flex items-center px-4 gap-2">
                {['#ff5f57','#febc2e','#28c840'].map((c,i) => <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                <div className="flex-1 mx-4 h-5 rounded-full bg-white/10 flex items-center px-3">
                  <span className="text-gray-500 text-xs">autofixer.ai/error-fixer</span>
                </div>
              </div>
              <div className="relative w-full pt-[56.25%]">
                <iframe className="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/FIfblTG9R5k"
                  title="Auto Fixer Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-32 relative overflow-hidden">
        <GlowOrbs />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-purple-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">Features</span>
            <h2 className="text-4xl md:text-6xl font-black mb-4">Powerful AI Tools</h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto">Everything you need to diagnose, fix, and learn — all in one place.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: i * 0.1 }} viewport={{ once: true }} whileHover={{ y: -7, scale: 1.01 }}>
                  <Link href={f.href}>
                    <div className="relative p-8 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm cursor-pointer group overflow-hidden h-full"
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 24px 64px ${f.glow}`)}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      style={{ transition: 'box-shadow 0.35s' }}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: `radial-gradient(circle at 28% 28%, ${f.glow} 0%, transparent 58%)` }} />
                      <span className="absolute top-5 right-5 text-xs font-semibold px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400">{f.tag}</span>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.grad} p-3 mb-6 group-hover:scale-110 transition-transform duration-300 relative`}
                        style={{ boxShadow: `0 8px 28px ${f.glow}` }}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">{f.title}</h3>
                      <p className="text-gray-400 mb-6 leading-relaxed text-[0.95rem]">{f.desc}</p>
                      <div className={`inline-flex items-center gap-2 font-semibold bg-gradient-to-r ${f.grad} bg-clip-text text-transparent group-hover:gap-3 transition-all`}>
                        Explore <ArrowRight size={17} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(90deg,rgba(34,211,238,0.05),rgba(59,130,246,0.05),rgba(168,85,247,0.05))',
          borderTop: '1px solid rgba(34,211,238,0.1)', borderBottom: '1px solid rgba(168,85,247,0.1)',
        }} />
        <div className="max-w-5xl mx-auto px-4 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-12">
          <AnimStat value={10000} label="Errors Fixed"  suffix="+" />
          <AnimStat value={5000}  label="Happy Users"   suffix="+" />
          <AnimStat value={500}   label="Tutorials"     suffix="+" />
          <AnimStat value={100}   label="Repair Shops"  suffix="+" />
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-32 relative overflow-hidden">
        <ParticleField /><GlowOrbs />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">Pricing</span>
            <h2 className="text-4xl md:text-6xl font-black mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">Start free. Scale as you grow. No hidden fees.</p>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              {(['monthly','yearly'] as const).map(b => (
                <motion.button key={b} onClick={() => setBilling(b)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize relative transition-colors ${billing === b ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                  {billing === b && (
                    <motion.div layoutId="btoggle" className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600"
                      style={{ zIndex: -1 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />
                  )}
                  {b}
                  {b === 'yearly' && <span className="ml-1.5 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/20">−20%</span>}
                </motion.button>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {plans.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: i * 0.14 }} viewport={{ once: true }}
                whileHover={{ y: -9 }} className={`relative rounded-2xl overflow-hidden ${p.popular ? 'md:scale-105 z-10' : ''}`}>
                {p.popular && <div className="absolute -inset-0.5 rounded-2xl" style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', zIndex: -1 }} />}
                <div className="relative p-8 rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-sm flex flex-col h-full">
                  {p.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className="px-4 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-xl whitespace-nowrap">⚡ Most Popular</span>
                    </div>
                  )}
                  <div className={`text-xs font-black uppercase tracking-[0.22em] mb-1 bg-gradient-to-r ${p.grad} bg-clip-text text-transparent`}>{p.name}</div>
                  <p className="text-gray-400 text-sm mb-5">{p.blurb}</p>
                  <AnimatePresence mode="wait">
                    <motion.div key={billing} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.18 }}
                      className="flex items-end gap-1 mb-7">
                      <span className="text-[3.5rem] leading-none font-black text-white">${billing === 'monthly' ? p.monthly : p.yearly}</span>
                      <span className="text-gray-400 mb-1.5 text-sm">/mo</span>
                    </motion.div>
                  </AnimatePresence>
                  {p.yearly > 0 && billing === 'yearly' && (
                    <p className="text-green-400 text-xs font-semibold -mt-5 mb-5">Save ${(p.monthly - p.yearly) * 12}/year</p>
                  )}
                  <ul className="space-y-3 mb-8 flex-1">
                    {p.perks.map((pk, j) => (
                      <li key={j} className="flex items-center gap-3 text-gray-300 text-sm">
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${p.grad}`}>
                          <Check size={10} className="text-white" />
                        </div>
                        {pk}
                      </li>
                    ))}
                  </ul>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link href={p.href}
                      className={`block w-full text-center py-3 rounded-xl font-bold transition-all ${p.popular
                        ? `text-white bg-gradient-to-r ${p.grad} shadow-lg`
                        : 'text-white border border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      {p.cta}
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 mt-12">
            {([{ I: Shield, t: '30-day money-back guarantee' }, { I: Clock, t: 'Cancel anytime' }, { I: Sparkles, t: 'Instant access' }] as const).map(({ I, t }, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-400 text-sm"><I size={15} className="text-cyan-400" />{t}</div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-pink-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-black">Loved by Developers</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: i * 0.13 }} viewport={{ once: true }}
                whileHover={{ y: -5 }} className="p-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 28% 28%, rgba(168,85,247,0.08) 0%, transparent 60%)' }} />
                <div className="flex gap-0.5 mb-4">
                  {[...Array(r.stars)].map((_, j) => <Star key={j} size={13} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm">{r.av}</div>
                  <div>
                    <div className="font-semibold text-white text-sm">{r.name}</div>
                    <div className="text-gray-500 text-xs">{r.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center,rgba(34,211,238,0.07) 0%,transparent 70%)' }} />
        <ParticleField />
        <div className="max-w-3xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.85 }} viewport={{ once: true }} className="relative">
            <div className="absolute -inset-1.5 rounded-3xl opacity-25" style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)', filter: 'blur(14px)' }} />
            <div className="relative p-14 md:p-20 rounded-2xl border border-white/10 bg-gray-950/92 backdrop-blur-sm">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} className="absolute top-6 right-8 opacity-15">
                <Sparkles size={34} className="text-cyan-400" />
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                Stop Fighting Errors.<br />
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Start Fixing Them.</span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">Join 5,000+ developers who debug in seconds, not hours.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/error-fixer" className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg text-white"
                    style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', boxShadow: '0 0 40px rgba(34,211,238,0.3)' }}>
                    Get Started Free <ArrowRight size={20} />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="#pricing" className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                    View Pricing
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  )
}