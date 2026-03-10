'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Cpu, ShieldCheck, Sparkles, Stars } from 'lucide-react'

type AuthShellProps = {
  title: string
  subtitle: string
  eyebrow: string
  alternateHref: string
  alternateLabel: string
  alternateText: string
  children: ReactNode
}

const highlights = [
  'Personalized AI repair history',
  'Saved fix sessions across pages',
  'One-click Google access for faster sign-in',
]

export function AuthShell({
  title,
  subtitle,
  eyebrow,
  alternateHref,
  alternateLabel,
  alternateText,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_32%),linear-gradient(135deg,#04070f_0%,#09142a_54%,#120617_100%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

      <div className="container-custom relative z-10 grid min-h-[calc(100vh-8rem)] gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
            <Stars className="h-4 w-4" />
            {eyebrow}
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-5xl font-black tracking-tight text-white md:text-7xl">
              {title}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">{subtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-md">
              <Cpu className="mb-4 h-6 w-6 text-cyan-300" />
              <p className="text-sm text-slate-200">Fast access to every Auto Fixer tool.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-md">
              <ShieldCheck className="mb-4 h-6 w-6 text-emerald-300" />
              <p className="text-sm text-slate-200">Dedicated account state in your browser session.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur-md">
              <Sparkles className="mb-4 h-6 w-6 text-pink-300" />
              <p className="text-sm text-slate-200">Creative, responsive pages matched to the site style.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Included
            </p>
            <div className="space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-8"
        >
          {children}
          <p className="mt-6 text-center text-sm text-slate-400">
            {alternateText}{' '}
            <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href={alternateHref}>
              {alternateLabel}
            </Link>
          </p>
        </motion.section>
      </div>
    </div>
  )
}
