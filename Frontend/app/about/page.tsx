'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Globe,
  Heart,
  Layers3,
  MessageSquareText,
  Microscope,
  ScanSearch,
  Sparkles,
  Target,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

const researchUrl = 'https://auto-fixer-research.vercel.app/'

export default function About() {
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)

  const features = [
    {
      icon: Zap,
      title: 'Instant Solutions',
      description: 'Get AI-powered error fixes in seconds, not hours',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Learn from solved issues and real troubleshooting workflows',
    },
    {
      icon: Globe,
      title: 'Accessible Support',
      description: 'Make technical diagnosis understandable for every user',
    },
    {
      icon: Heart,
      title: 'Trusted Guidance',
      description: 'Recommend clear repair steps, services, and hardware options',
    },
  ]

  const researchStats = [
    { value: '84.6%', label: 'Accuracy', detail: 'Classification performance' },
    { value: '4', label: 'AI Modules', detail: 'Integrated support pipeline' },
    { value: '15+', label: 'Error Types', detail: 'Detected and categorized' },
    { value: '12+', label: 'Technologies', detail: 'Open-source research stack' },
  ]

  const researchModules = [
    {
      icon: ScanSearch,
      title: 'Screenshot-Based Error Detection',
      description: 'CNN and OCR analyze screenshots, blue screens, error dialogs, and system crash details.',
      tags: ['CNN', 'OCR', 'Image Processing'],
    },
    {
      icon: MessageSquareText,
      title: 'AI Troubleshooting Chatbot',
      description: 'Natural language classification interprets user-described problems and provides guided fixes.',
      tags: ['NLP', 'TF-IDF', 'SGD Classifier'],
    },
    {
      icon: CheckCircle2,
      title: 'Guided Installation Support',
      description: 'Structured workflows validate configuration steps before setup mistakes become failures.',
      tags: ['Validation', 'Workflow Engine'],
    },
    {
      icon: Wrench,
      title: 'Repair Recommendation Engine',
      description: 'Gradient Boosting recommends repair services and suitable hardware from diagnostic context.',
      tags: ['ML', 'Recommendations'],
    },
  ]

  const timeline = [
    {
      year: '2024',
      title: 'Research Planning',
      description: 'Defined the automated computer error diagnosis problem and mapped the AI support workflow.',
    },
    {
      year: '2025',
      title: 'Model Development',
      description: 'Built the screenshot analysis, NLP chatbot, installation validation, and recommendation modules.',
    },
    {
      year: '2026',
      title: 'Integrated Platform',
      description: 'Unified the research modules into Auto Fixer for live diagnosis and repair guidance.',
    },
  ]

  const team = [
    {
      name: 'Sasindu Diluranga',
      role: 'Developer',
      focus: 'Screenshot-Based Error Detection',
      image: '/DeveloperTeam/sasindu.jpg',
      accent: 'from-cyan-400 to-blue-500',
      summary: 'Leads visual error analysis using screenshot classification and OCR extraction.',
    },
    {
      name: 'Udana Rajanayake',
      role: 'Developer',
      focus: 'AI-Powered Chatbot',
      image: '/DeveloperTeam/udana.png',
      accent: 'from-emerald-400 to-cyan-500',
      summary: 'Builds conversational troubleshooting flows for user-described technical issues.',
    },
    {
      name: 'Pavindu Ranasinghe',
      role: 'Developer',
      focus: 'Guided Installation Support',
      image: '/DeveloperTeam/PAvindu.png',
      accent: 'from-amber-400 to-rose-500',
      summary: 'Creates validation-driven installation guidance to prevent configuration mistakes.',
    },
    {
      name: 'Venuja Bimsara',
      role: 'Developer',
      focus: 'Repair Recommendation Engine',
      image: '/DeveloperTeam/Venuja.png',
      accent: 'from-violet-400 to-fuchsia-500',
      summary: 'Develops decision support for repair services and hardware recommendations.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black py-20">
      <div className="container-custom space-y-28">
        <motion.section
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/80 px-6 py-16 text-center sm:px-10 lg:px-16"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">AI-Powered Research Project</span>
          </motion.div>
          <h1 className="section-title mx-auto mb-6 max-w-5xl">
            Smart AI Assistant for Computer Error Diagnosis
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-gray-300">
            Auto Fixer combines computer vision, natural language processing, and machine learning to
            diagnose technical problems and recommend practical repair actions.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={researchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:-translate-y-0.5 hover:shadow-cyan-500/40"
            >
              Research About
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="#developer-team"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
            >
              Meet Developers
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative"
        >
          <div className="mb-12 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200">
                <Microscope className="h-4 w-4" />
                About The Research
              </div>
              <h2 className="section-title mb-5">Transforming Technical Support with AI</h2>
              <p className="text-lg leading-relaxed text-gray-300">
                Modern computer systems are essential for daily work, but unexpected hardware and
                software failures still disrupt productivity. This research addresses that challenge
                with intelligent automation for users who need clear, fast technical support.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {researchStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-slate-950/70 p-5">
                    <div className="gradient-text text-3xl font-black">{stat.value}</div>
                    <div className="mt-1 font-semibold text-white">{stat.label}</div>
                    <div className="mt-1 text-sm text-gray-400">{stat.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {researchModules.map((module, index) => {
              const Icon = module.icon
              return (
                <motion.div
                  key={module.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className="group h-full"
                >
                  <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.07]">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{module.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-400">{module.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {module.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative"
        >
          <div className="grid gap-10 rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-8 md:p-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-6 text-4xl font-bold text-white">Our Mission</h2>
              <p className="mb-5 text-lg leading-relaxed text-gray-300">
                We believe everyone should have access to AI-powered support for technical problems.
                Whether it is a coding error, software bug, or hardware issue, Auto Fixer helps users
                move from confusion to a practical solution.
              </p>
              <p className="text-lg leading-relaxed text-gray-300">
                The platform turns research models into a usable workflow: identify the issue,
                understand the context, and recommend the next best repair action.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.96 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-slate-950/70 p-6"
            >
              <div className="grid gap-4">
                {[
                  { icon: BrainCircuit, label: 'Computer Vision + NLP', value: 'Multimodal diagnosis' },
                  { icon: Cpu, label: 'Machine Learning', value: 'Classification and recommendations' },
                  { icon: Target, label: 'Research Impact', value: 'Less manual support dependency' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{item.label}</div>
                        <div className="text-sm text-gray-400">{item.value}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section className="relative">
          <div className="mb-16 text-center">
            <h2 className="section-title mb-4">Our Core Values</h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400">
              Driven by practical AI, research discipline, and accessible technical support.
            </p>
          </div>
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.12,
                  delayChildren: 0.2,
                },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  }}
                  className="group"
                >
                  <div className="h-full rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-8 transition hover:-translate-y-1 hover:border-cyan-500/50 hover:bg-white/[0.07]">
                    <motion.div
                      className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 p-3 shadow-lg shadow-cyan-500/25"
                      whileHover={{ scale: 1.08, rotate: 5 }}
                    >
                      <Icon className="h-full w-full text-white" />
                    </motion.div>
                    <h3 className="mb-3 text-center text-xl font-bold text-white">{feature.title}</h3>
                    <p className="text-center leading-relaxed text-gray-400">{feature.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.section>

        <motion.section className="relative">
          <div className="mb-16 text-center">
            <h2 className="section-title mb-4">Our Journey</h2>
            <p className="text-lg text-gray-400">From research problem to integrated AI support platform.</p>
          </div>
          <div className="relative grid gap-6 lg:grid-cols-3">
            {timeline.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: '-100px' }}
                className="rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-8 transition hover:-translate-y-1 hover:border-cyan-500/50"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-black text-white shadow-lg shadow-cyan-500/25">
                  {item.year}
                </div>
                <h3 className="mb-3 text-2xl font-bold text-white">{item.title}</h3>
                <p className="leading-relaxed text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section id="developer-team" className="relative scroll-mt-24">
          <div className="mb-16 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                <Layers3 className="h-4 w-4" />
                Development Team
              </div>
              <h2 className="section-title mb-4">Meet The Researchers</h2>
            </div>
            <p className="text-lg leading-relaxed text-gray-400">
              Four focused developers working across visual diagnosis, chatbot support, guided
              installation, and intelligent repair recommendation.
            </p>
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.2,
                },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
          >
            {team.map((member, index) => (
              <motion.article
                key={member.name}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
                onMouseEnter={() => setHoveredMember(index)}
                onMouseLeave={() => setHoveredMember(null)}
                className="group"
              >
                <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.07]">
                  <div className={`h-2 bg-gradient-to-r ${member.accent}`} />
                  <div className="p-5">
                    <motion.div
                      animate={hoveredMember === index ? { scale: 1.02 } : { scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                    >
                      <Image
                        src={member.image}
                        alt={`${member.name} profile photo`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-4">
                        <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-cyan-100 backdrop-blur">
                          {member.role}
                        </span>
                      </div>
                    </motion.div>
                    <div className="mt-5">
                      <h3 className="text-xl font-bold text-white">{member.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-cyan-300">{member.focus}</p>
                      <p className="mt-4 text-sm leading-relaxed text-gray-400">{member.summary}</p>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-8 md:p-12"
        >
          <div className="relative">
            <h2 className="mb-12 text-center text-3xl font-bold text-white">Impact by Numbers</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {researchStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-6 text-center"
                >
                  <div className="gradient-text mb-3 text-5xl font-bold">{stat.value}</div>
                  <p className="text-lg text-gray-300">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-violet-500/10 p-10 text-center md:p-16"
        >
          <h2 className="mb-6 text-4xl font-bold text-white">Explore the Research Project</h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-gray-300">
            Read the full research overview, methodology, team details, documents, and evaluation
            results behind Auto Fixer.
          </p>
          <a
            href={researchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-cyan-500/25 transition hover:-translate-y-0.5 hover:shadow-cyan-500/40"
          >
            Open Research About
            <ExternalLink className="h-4 w-4" />
          </a>
        </motion.section>
      </div>
    </div>
  )
}
