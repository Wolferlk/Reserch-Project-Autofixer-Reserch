'use client'

import { motion } from 'framer-motion'
import { Zap, Users, Globe, Heart, ArrowRight, Sparkles } from 'lucide-react'
import { useState } from 'react'

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
      description: 'Learn from thousands of solved issues',
    },
    {
      icon: Globe,
      title: 'Global Network',
      description: 'Connect with repair shops and experts worldwide',
    },
    {
      icon: Heart,
      title: 'Trusted Support',
      description: 'Always here to help you fix any technical problem',
    },
  ]

  const timeline = [
    {
      year: '2025',
      title: 'Founded',
      description: 'Auto Fixer is launched with a mission to simplify error fixing',
    },
    {
      year: '2026',
      title: 'AI Integration',
      description: 'Introduced AI-powered error recognition and solutions',
    },
    {
      year: '2026',
      title: 'Global Expansion',
      description: 'Expanded to 50+ countries with 500+ repair partners',
    },
    {
      year: '2026',
      title: 'Screenshot Scanner',
      description: 'Launched advanced screenshot analysis technology',
    },
    {
      year: '2026',
      title: 'Tutorials Platform',
      description: 'Released comprehensive tutorial library with 500+ courses',
    },
  ]

  const team = [
    {
      name: 'Sasindu Diluranga',
      role: 'Founder & CEO',
      bio: 'Tech enthusiast with 15+ years in software development',
    },
    {
      name: 'Venuja Bimsara',
      role: 'CTO',
      bio: 'AI expert specializing in computer vision and NLP',
    },
    {
      name: 'Udana Rajanayaka',
      role: 'VP Product',
      bio: 'Product strategist with experience at major tech companies',
    },
    {
      name: 'Pavindu Ranasinghe',
      role: 'Head of Support',
      bio: 'Customer-first advocate with 10+ years in support operations',
    },
  ]

  return (
    <div className="min-h-screen py-20 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-900/50">
      <div className="container-custom space-y-32">
        {/* Enhanced Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12 relative"
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">Transforming Tech Support</span>
          </motion.div>
          <h1 className="section-title mb-6 bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            About Auto Fixer
          </h1>
          <p className="section-subtitle text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Empowering millions to fix errors and learn technology with AI intelligence
          </p>
        </motion.section>

        {/* Enhanced Mission Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative"
        >
          <div className="glass-card p-12 rounded-2xl border border-cyan-500/20 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                <h2 className="text-4xl font-bold text-white mb-8">Our Mission</h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  We believe everyone should have access to instant, AI-powered solutions for technical problems. Whether it's a coding error, software bug, or hardware issue, Auto Fixer is here to help you find the solution quickly and easily.
                </p>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Our platform combines artificial intelligence, expert knowledge, and community wisdom to provide the most comprehensive error-fixing experience available.
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 30, scale: 0.9 }} 
                whileInView={{ opacity: 1, x: 0, scale: 1 }} 
                transition={{ duration: 0.6 }}
                className="relative h-80 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-purple-500/20 glass-card" />
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Zap className="text-cyan-400 mx-auto mb-4" size={60} />
                    </motion.div>
                    <p className="text-white font-bold text-xl">Instant AI Solutions</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Enhanced Values Section */}
        <motion.section className="relative">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4 text-white">Our Core Values</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Driven by innovation, community, and commitment to excellence</p>
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
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  }}
                  className="group"
                >
                  <div className="relative glass-card p-8 rounded-xl border border-cyan-500/20 h-full overflow-hidden hover:border-cyan-500/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <motion.div 
                        className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 p-3 mx-auto mb-6 group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition-all duration-300"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Icon className="w-full h-full text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.section>

        {/* Enhanced Timeline Section */}
        <motion.section className="relative">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4 text-white">Our Journey</h2>
            <p className="text-gray-400 text-lg">From vision to reality in five transformative years</p>
          </div>
          <div className="space-y-6 relative">
            {/* Timeline line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent" />
            
            {timeline.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`flex gap-6 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className="flex-shrink-0 w-full lg:w-1/2 flex" style={{ justifyContent: index % 2 === 1 ? 'flex-end' : 'flex-start' }}>
                  <div className="glass-card p-8 rounded-xl border border-cyan-500/20 w-full lg:w-5/6 hover:border-cyan-500/50 transition-all duration-300 group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex gap-6 items-start">
                      <div className="flex-shrink-0">
                        <motion.div 
                          className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-cyan-500/50"
                          whileHover={{ scale: 1.1 }}
                        >
                          {item.year}
                        </motion.div>
                      </div>
                      <div className="flex-1 py-2">
                        <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                        <p className="text-gray-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Enhanced Team Section */}
        <motion.section className="relative">
          <div className="text-center mb-16">
            <h2 className="section-title mb-4 text-white">Meet Our Team</h2>
            <p className="text-gray-400 text-lg">Talented individuals united by a shared vision</p>
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
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {team.map((member, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
                onMouseEnter={() => setHoveredMember(index)}
                onMouseLeave={() => setHoveredMember(null)}
              >
                <div className="relative glass-card p-8 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 text-center group overflow-hidden h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <motion.div 
                      className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300"
                      animate={hoveredMember === index ? { scale: 1.05, rotate: 5 } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-white font-bold text-2xl">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                    <p className="text-cyan-400 font-semibold text-sm mb-4">{member.role}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{member.bio}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Enhanced Stats Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative group overflow-hidden"
        >
          <div className="glass-card p-16 rounded-2xl border border-cyan-500/20 group-hover:border-cyan-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white text-center mb-16">Impact by Numbers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { value: '100K+', label: 'Errors Fixed' },
                  { value: '50K+', label: 'Active Users' },
                  { value: '500+', label: 'Tutorials' },
                  { value: '150+', label: 'Repair Partners' },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="text-center group/stat"
                  >
                    <motion.div
                      className="text-5xl font-bold gradient-text mb-3 group-hover/stat:scale-110 transition-transform duration-300"
                      whileHover={{ scale: 1.1 }}
                    >
                      {stat.value}
                    </motion.div>
                    <p className="text-gray-400 text-lg">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Enhanced Call to Action */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative group overflow-hidden"
        >
          <div className="glass-card p-20 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 border border-purple-500/30 group-hover:border-purple-500/50 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative text-center">
              <h2 className="text-4xl font-bold text-white mb-6">Join Our Community</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Become part of a growing community of tech enthusiasts and professionals solving problems together
              </p>
              <motion.button 
                className="px-10 py-4 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold hover:shadow-xl hover:shadow-cyan-500/60 transition-all duration-300 flex items-center gap-2 mx-auto group/btn"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started Today
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </motion.button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
