'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  Check, X, Zap, Users, Building2, Sparkles, ArrowRight,
  Shield, Clock, Star, ChevronDown, HelpCircle,
} from 'lucide-react'

// ─── Background helpers ────────────────────────────────────────────────────────

function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.15 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.18) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 20%, #000 75%)' }} />
    </div>
  )
}

function GlowOrbs() {
  return (
    <>
      <motion.div className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-40 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.8, 0.4, 0.8] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
    </>
  )
}

function ParticleField() {
  const pts = Array.from({ length: 40 }, (_, i) => ({
    id: i, x: `${(i * 2.5) % 100}%`, y: `${(i * 3.1) % 100}%`,
    size: (i % 3) + 1,
    color: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#3b82f6',
    delay: (i % 20) * 0.15, dur: 3 + (i % 5),
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pts.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ width: p.size, height: p.size, left: p.x, top: p.y, background: p.color }}
          animate={{ y: [0, -24, 0], opacity: [0.15, 0.6, 0.15], scale: [1, 1.5, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
      ))}
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    blurb: 'Perfect for getting started',
    monthly: 0,
    yearly: 0,
    grad: 'from-gray-500 to-gray-400',
    glow: 'rgba(156,163,175,0.2)',
    border: 'border-white/10',
    popular: false,
    cta: 'Start for Free',
    ctaStyle: 'border',
    features: [
      { label: '5 error fixes per month',      included: true  },
      { label: '3 screenshot scans',            included: true  },
      { label: 'Basic tutorial access',         included: true  },
      { label: 'Community support',             included: true  },
      { label: 'Priority AI responses',         included: false },
      { label: 'Hardware diagnostics',          included: false },
      { label: 'API access',                    included: false },
      { label: 'Team collaboration',            included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Sparkles,
    blurb: 'For developers & power users',
    monthly: 19,
    yearly: 15,
    grad: 'from-cyan-400 to-blue-500',
    glow: 'rgba(34,211,238,0.25)',
    border: 'border-cyan-500/30',
    popular: true,
    cta: 'Start Pro Trial',
    ctaStyle: 'gradient',
    features: [
      { label: 'Unlimited error fixes',         included: true  },
      { label: 'Unlimited screenshot scans',    included: true  },
      { label: 'Full tutorial library',         included: true  },
      { label: 'Priority AI responses',         included: true  },
      { label: 'Hardware diagnostics',          included: true  },
      { label: 'Email support',                 included: true  },
      { label: 'API access',                    included: false },
      { label: 'Team collaboration',            included: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    icon: Users,
    blurb: 'Built for engineering teams',
    monthly: 49,
    yearly: 39,
    grad: 'from-purple-500 to-pink-500',
    glow: 'rgba(168,85,247,0.25)',
    border: 'border-purple-500/30',
    popular: false,
    cta: 'Start Team Trial',
    ctaStyle: 'gradient',
    features: [
      { label: 'Unlimited error fixes',         included: true  },
      { label: 'Unlimited screenshot scans',    included: true  },
      { label: 'Full tutorial library',         included: true  },
      { label: 'Priority AI responses',         included: true  },
      { label: 'Hardware diagnostics',          included: true  },
      { label: 'Up to 10 team members',         included: true  },
      { label: 'API access',                    included: true  },
      { label: 'Team collaboration',            included: true  },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    blurb: 'For large organisations',
    monthly: null,
    yearly: null,
    grad: 'from-amber-400 to-orange-500',
    glow: 'rgba(251,191,36,0.2)',
    border: 'border-amber-500/20',
    popular: false,
    cta: 'Contact Sales',
    ctaStyle: 'border',
    features: [
      { label: 'Everything in Team',            included: true  },
      { label: 'Unlimited team members',        included: true  },
      { label: 'Custom AI model fine-tuning',   included: true  },
      { label: 'SSO / SAML',                    included: true  },
      { label: 'SLA guarantee',                 included: true  },
      { label: 'Dedicated account manager',     included: true  },
      { label: 'On-premise deployment',         included: true  },
      { label: 'Custom integrations',           included: true  },
    ],
  },
]

const faqs = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes — upgrade or downgrade anytime from your account settings. Changes take effect immediately and we prorate any billing differences.',
  },
  {
    q: 'Is there a free trial for paid plans?',
    a: 'Pro and Team plans come with a 14-day free trial, no credit card required. You only pay when you decide to continue.',
  },
  {
    q: 'What counts as one "error fix"?',
    a: 'Each time you submit an error message or screenshot for AI analysis counts as one fix. Regenerating a different solution for the same error also counts as one fix.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for annual Enterprise plans.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Absolutely. We offer a 30-day money-back guarantee on all paid plans — no questions asked.',
  },
  {
    q: 'Can I use Auto Fixer for commercial projects?',
    a: 'Yes. All plans including Free allow commercial use. Enterprise plans additionally include white-labelling and redistribution rights.',
  },
]

const compareCols = ['Free', 'Pro', 'Team', 'Enterprise']
const compareRows = [
  { label: 'Error fixes / month',     values: ['5',        'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Screenshot scans',        values: ['3',        'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Tutorials',               values: ['Basic',    'Full',      'Full',      'Full']      },
  { label: 'AI response priority',    values: [false,      true,        true,        true]        },
  { label: 'Hardware diagnostics',    values: [false,      true,        true,        true]        },
  { label: 'API access',              values: [false,      false,       true,        true]        },
  { label: 'Team members',            values: ['1',        '1',         'Up to 10',  'Unlimited'] },
  { label: 'SSO / SAML',             values: [false,      false,       false,       true]        },
  { label: 'Dedicated support',       values: [false,      'Email',     'Priority',  'Dedicated'] },
  { label: 'SLA guarantee',           values: [false,      false,       false,       true]        },
]

// ─── FAQ Item ──────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] transition-colors cursor-pointer"
      onClick={() => setOpen(!open)}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <span className="font-semibold text-white text-sm pr-4">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex-shrink-0">
          <ChevronDown size={18} className="text-gray-400" />
        </motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/8 pt-4">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <GridBg />
        <GlowOrbs />
        <ParticleField />

        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md"
          >
            <motion.span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-cyan-300 text-sm font-semibold tracking-wide">Simple, transparent pricing</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6"
          >
            <span className="block bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Pay for what</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 40px rgba(34,211,238,0.3))' }}>
              you actually use
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg text-gray-400 max-w-xl mx-auto mb-10"
          >
            Start free, scale when you're ready. No hidden fees, no surprises — just powerful AI tools at honest prices.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
            className="inline-flex items-center gap-1 p-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm mb-4"
          >
            {(['monthly', 'yearly'] as const).map(b => (
              <motion.button key={b} onClick={() => setBilling(b)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize relative transition-colors ${billing === b ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {billing === b && (
                  <motion.div layoutId="billingpill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600"
                    style={{ zIndex: -1 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                {b}
                {b === 'yearly' && (
                  <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">
                    SAVE 20%
                  </span>
                )}
              </motion.button>
            ))}
          </motion.div>

          {billing === 'yearly' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-xs font-medium">
              🎉 You're saving up to $120/year on annual billing
            </motion.p>
          )}
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section className="pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
            {plans.map((plan, i) => {
              const Icon = plan.icon
              const price = billing === 'monthly' ? plan.monthly : plan.yearly
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ y: -8 }}
                  className={`relative rounded-2xl overflow-hidden ${plan.popular ? 'ring-1 ring-cyan-500/50' : ''}`}
                >
                  {/* Glow border for popular */}
                  {plan.popular && (
                    <div className="absolute -inset-0.5 rounded-2xl opacity-60 pointer-events-none"
                      style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', zIndex: -1 }} />
                  )}

                  <div
                    className={`relative flex flex-col h-full p-7 rounded-2xl border ${plan.border} bg-gray-950/95 backdrop-blur-sm`}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 24px 60px ${plan.glow}`)}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    style={{ transition: 'box-shadow 0.35s' }}
                  >
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="px-4 py-1 rounded-full text-xs font-black text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg whitespace-nowrap">
                          ⚡ MOST POPULAR
                        </span>
                      </div>
                    )}

                    {/* Icon + name */}
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.grad} flex items-center justify-center`}
                        style={{ boxShadow: `0 4px 16px ${plan.glow}` }}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <div>
                        <div className={`text-sm font-black uppercase tracking-widest bg-gradient-to-r ${plan.grad} bg-clip-text text-transparent`}>
                          {plan.name}
                        </div>
                        <div className="text-xs text-gray-500">{plan.blurb}</div>
                      </div>
                    </div>

                    {/* Price */}
                    <AnimatePresence mode="wait">
                      <motion.div key={billing}
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }} className="mb-6">
                        {price !== null ? (
                          <div className="flex items-end gap-1">
                            <span className="text-5xl font-black text-white leading-none">${price}</span>
                            <span className="text-gray-500 text-sm mb-1.5">/mo</span>
                          </div>
                        ) : (
                          <div className="text-4xl font-black text-white leading-none">Custom</div>
                        )}
                        {plan.yearly !== null && plan.yearly > 0 && billing === 'yearly' && (
                          <p className="text-green-400 text-xs font-semibold mt-1">
                            Save ${(plan.monthly! - plan.yearly) * 12}/yr
                          </p>
                        )}
                        {price === null && (
                          <p className="text-gray-500 text-xs mt-1">Tailored to your needs</p>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f, j) => (
                        <motion.li key={j}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * j + i * 0.1 }}
                          className="flex items-center gap-2.5 text-sm">
                          {f.included ? (
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${plan.grad}`}>
                              <Check size={9} className="text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center bg-white/5">
                              <X size={9} className="text-gray-600" strokeWidth={3} />
                            </div>
                          )}
                          <span className={f.included ? 'text-gray-300' : 'text-gray-600'}>{f.label}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Link href={plan.id === 'enterprise' ? '/contact' : '/error-fixer'}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          plan.ctaStyle === 'gradient'
                            ? `text-white bg-gradient-to-r ${plan.grad}`
                            : 'text-white border border-white/15 bg-white/5 hover:bg-white/10'
                        }`}
                        style={plan.ctaStyle === 'gradient' ? { boxShadow: `0 4px 20px ${plan.glow}` } : {}}>
                        {plan.cta}
                        <ArrowRight size={14} />
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="py-12 relative z-10 border-y border-white/8"
        style={{ background: 'linear-gradient(90deg,rgba(34,211,238,0.04),rgba(59,130,246,0.04),rgba(168,85,247,0.04))' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield,   text: '30-day money-back guarantee' },
              { icon: Clock,    text: 'Cancel anytime, instantly'   },
              { icon: Sparkles, text: 'Instant access after signup' },
              { icon: Star,     text: '4.9 / 5 average rating'      },
            ].map(({ icon: Icon, text }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="flex items-center gap-2.5 text-sm text-gray-400">
                <Icon size={16} className="text-cyan-400 flex-shrink-0" />
                {text}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-24 relative z-10 overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-purple-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">Compare</span>
            <h2 className="text-4xl md:text-5xl font-black">Everything, side by side</h2>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="rounded-2xl border border-white/10 overflow-hidden bg-gray-950/60 backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-5 text-gray-500 font-semibold w-1/3">Feature</th>
                  {compareCols.map((col, i) => (
                    <th key={col} className="px-4 py-5 text-center">
                      <span className={`font-black text-sm ${i === 1 ? 'bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent' : i === 2 ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent' : i === 3 ? 'bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent' : 'text-gray-400'}`}>
                        {col}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-white/[0.04] transition-colors`}>
                    <td className="px-6 py-4 text-gray-400 font-medium">{row.label}</td>
                    {row.values.map((val, j) => (
                      <td key={j} className="px-4 py-4 text-center">
                        {val === true ? (
                          <div className="flex justify-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br ${j === 1 ? 'from-cyan-400 to-blue-500' : j === 2 ? 'from-purple-500 to-pink-500' : j === 3 ? 'from-amber-400 to-orange-500' : 'from-gray-500 to-gray-400'}`}>
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </div>
                          </div>
                        ) : val === false ? (
                          <div className="flex justify-center">
                            <X size={14} className="text-gray-700" />
                          </div>
                        ) : (
                          <span className={`font-semibold ${j === 1 ? 'text-cyan-400' : j === 2 ? 'text-purple-400' : j === 3 ? 'text-amber-400' : 'text-gray-400'}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="text-center mb-14">
            <span className="text-pink-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">Social Proof</span>
            <h2 className="text-4xl md:text-5xl font-black">Trusted by thousands</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Sarah K.',  role: 'Senior Developer',  av: 'S', color: 'from-cyan-500 to-blue-500',    text: 'Switched to Pro after the free trial and never looked back. The unlimited fixes alone save me hours every week.', stars: 5 },
              { name: 'James T.',  role: 'CS Student',         av: 'J', color: 'from-blue-500 to-purple-500',  text: "The Pro plan is insanely good value. I fixed 40+ errors last month — that would've taken me days on Stack Overflow.", stars: 5 },
              { name: 'Priya M.',  role: 'DevOps Engineer',    av: 'P', color: 'from-purple-500 to-pink-500',  text: 'Our whole team upgraded to the Team plan. The shared error history feature alone is worth the price.', stars: 5 },
            ].map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.65 }} viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 30% 30%, rgba(34,211,238,0.06) 0%, transparent 60%)' }} />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: r.stars }).map((_, j) => <Star key={j} size={13} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center font-black text-white text-xs`}>{r.av}</div>
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

      {/* ── FAQ ── */}
      <section className="py-24 relative z-10">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="text-center mb-14">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.25em] mb-3 block">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-black mb-3">Common questions</h2>
            <p className="text-gray-400">Can't find what you're looking for?{' '}
              <Link href="/contact" className="text-cyan-400 hover:underline">Contact us</Link>
            </p>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.55 }} viewport={{ once: true }}>
                <FaqItem q={f.q} a={f.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 relative overflow-hidden z-10">
        <ParticleField />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.07) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85 }} viewport={{ once: true }}
            className="relative">
            <div className="absolute -inset-2 rounded-3xl opacity-20"
              style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)', filter: 'blur(16px)' }} />
            <div className="relative p-12 md:p-20 rounded-2xl border border-white/10 bg-gray-950/90 backdrop-blur-sm">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                className="absolute top-6 right-8 opacity-10">
                <Sparkles size={36} className="text-cyan-400" />
              </motion.div>

              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-green-500/20 bg-green-500/8">
                <motion.span className="w-2 h-2 rounded-full bg-green-400 inline-block"
                  animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="text-green-400 text-xs font-bold">No credit card needed · Free forever</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                Start fixing errors<br />
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">for free, right now</span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
                Join 5,000+ developers who've stopped losing hours to bugs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/error-fixer"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-white"
                    style={{ background: 'linear-gradient(135deg,#22d3ee,#3b82f6,#a855f7)', boxShadow: '0 0 40px rgba(34,211,238,0.3)' }}>
                    <Zap size={18} /> Get Started Free
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/contact"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                    <HelpCircle size={18} /> Talk to Sales
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