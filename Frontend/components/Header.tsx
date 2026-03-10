'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Menu, UserPlus, X, Zap } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/error-fixer', label: 'Fix Error' },
  { href: '/screenshot-scanner', label: 'Upload Image' },
  { href: '/tutorials', label: 'Softwares' },
  { href: '/hardware-repair', label: 'Hardware' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, logout, isReady } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const initials =
    user?.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'AF'

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/50'
          : 'bg-transparent backdrop-blur-md border-b border-white/5'
      }`}
    >
      {/* top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
<Link
  href="/"
  className="flex items-center gap-3 group flex-shrink-0"
>
  <motion.div
    whileHover={{ scale: 1.12, rotate: 4 }}
    whileTap={{ scale: 0.96 }}
    className="relative w-14 h-14 flex items-center justify-center"
  >
    {/* Glow Behind Logo */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-70 blur-lg transition-all duration-300" />

    <Image
      src="/mini.png"
      alt="Auto Fixer"
      width={56}
      height={56}
      className="relative rounded-2xl object-contain"
      priority
    />
  </motion.div>

  <span className="font-extrabold text-3xl bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
    Auto Fixer
  </span>
</Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200 group rounded-lg hover:bg-white/5"
              >
                {link.label}
                <span className="absolute bottom-1 left-3 right-3 h-px bg-gradient-to-r from-cyan-400 to-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </Link>
            ))}
          </nav>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            {isReady && user ? (
              <>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    href="/error-fixer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white relative overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                      boxShadow: '0 0 20px rgba(34,211,238,0.25)',
                    }}
                  >
                    <Zap size={14} className="group-hover:animate-pulse" />
                    Continue Fixing
                  </Link>
                </motion.div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10">
                      <Avatar className="size-10 border border-cyan-400/30">
                        <AvatarImage alt={user.name} src={user.picture} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-36">
                        <div className="truncate text-sm font-semibold text-white">{user.name}</div>
                        <div className="truncate text-xs text-gray-400">{user.email}</div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 border-white/10 bg-slate-950/95 text-white">
                    <DropdownMenuLabel className="space-y-1">
                      <div className="text-sm font-semibold text-white">{user.name}</div>
                      <div className="text-xs font-normal text-slate-400">{user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild className="cursor-pointer text-slate-200 focus:bg-white/10 focus:text-white">
                      <Link href="/error-fixer">Open Auto Fixer</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
                      onClick={logout}
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-2"
                >
                  Sign in
                </Link>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white relative overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
                      boxShadow: '0 0 20px rgba(34,211,238,0.25)',
                    }}
                  >
                    <UserPlus size={14} className="group-hover:animate-pulse" />
                    Get Started
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* ── Mobile Toggle ── */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-gray-300"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={20} />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-black/90 backdrop-blur-2xl"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/8 transition-all text-sm font-medium group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 group-hover:bg-cyan-400 transition-colors" />
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="pt-3 pb-1 border-t border-white/10 mt-3 space-y-2">
                {isReady && user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <Avatar className="size-11 border border-cyan-400/30">
                        <AvatarImage alt={user.name} src={user.picture} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{user.name}</div>
                        <div className="truncate text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                    <Link
                      href="/error-fixer"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6, #a855f7)' }}
                    >
                      Continue Fixing
                    </Link>
                    <button
                      className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-rose-200 border border-rose-400/20 bg-rose-500/10"
                      onClick={() => {
                        logout()
                        setIsOpen(false)
                      }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-gray-300 border border-white/10 hover:bg-white/5 transition-all"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #22d3ee, #3b82f6, #a855f7)' }}
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
