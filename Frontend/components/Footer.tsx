'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Github, Twitter, Linkedin, Zap, ArrowUpRight } from 'lucide-react'

const productLinks = [
  { href: '/error-fixer',        label: 'Fix Error Text' },
  { href: '/screenshot-scanner', label: 'Screenshot Scanner' },
  { href: '/tutorials',          label: 'Tutorials' },
  { href: '/hardware-repair',    label: 'Hardware Repair' },
]

const companyLinks = [
  { href: '/about',   label: 'About Us' },
  { href: '/contact', label: 'Contact' },
  { href: '#',        label: 'Privacy Policy' },
  { href: '#',        label: 'Terms of Service' },
  { href: '#pricing', label: 'Pricing' },
]

const socials = [
  { icon: Github,   href: '#', label: 'GitHub'   },
  { icon: Twitter,  href: '#', label: 'Twitter'  },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black mt-20">

      {/* top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* background blobs */}
      <div className="absolute bottom-0 left-1/4 w-96 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 py-16">

          {/* Brand col */}
          <div className="md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <motion.div whileHover={{ scale: 1.08, rotate: 3 }} className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-50 blur-md transition-opacity duration-300" />
                <Image src="/mini.png" alt="Auto Fixer" width={40} height={40} className="relative rounded-xl object-contain" />
              </motion.div>
              <span className="font-black text-xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                Auto Fixer
              </span>
            </Link>

            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              The world's most advanced AI error-resolution platform. Fix bugs, learn tutorials, and find expert repair shops.
            </p>

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/8 mb-6">
              <motion.span className="w-2 h-2 rounded-full bg-green-400 inline-block"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="text-green-400 text-xs font-semibold">All systems operational</span>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a key={label} href={href} aria-label={label}
                  whileHover={{ scale: 1.12, y: -2 }} whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-colors">
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-5">Product</h3>
            <ul className="space-y-3">
              {productLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href}
                    className="group inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors duration-200">
                    <span className="w-1 h-1 rounded-full bg-cyan-500/0 group-hover:bg-cyan-400 transition-colors mr-1" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-5">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link href={href}
                    className="group inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors duration-200">
                    <span className="w-1 h-1 rounded-full bg-cyan-500/0 group-hover:bg-cyan-400 transition-colors mr-1" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Newsletter */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-5">Contact</h3>
            <div className="space-y-3 mb-8">
              {[
                { icon: Mail,   text: 'support@autofixer.ai' },
                { icon: Phone,  text: '+1 (555) 123-4567'    },
                { icon: MapPin, text: 'San Francisco, CA'    },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-gray-400 group cursor-default">
                  <div className="w-8 h-8 rounded-lg border border-white/8 bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-500/30 transition-colors">
                    <Icon size={13} className="group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className="text-sm group-hover:text-gray-300 transition-colors">{text}</span>
                </div>
              ))}
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Stay Updated</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all min-w-0"
                />
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-bold flex-shrink-0 flex items-center gap-1"
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6)' }}
                >
                  <Zap size={13} />
                  Join
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Auto Fixer. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-gray-600 text-xs">
            <span>Built with</span>
            <span className="text-red-400 mx-0.5">♥</span>
            <span>using Next.js & AI</span>
            <ArrowUpRight size={11} className="ml-0.5 opacity-50" />
          </div>
        </div>
      </div>
    </footer>
  )
}