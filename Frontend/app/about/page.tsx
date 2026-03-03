'use client'

import { motion } from 'framer-motion'
import { Zap, Users, Globe, Heart } from 'lucide-react'

export default function About() {
  const features = [
    {
      icon: Zap,
      title: 'Instant Solutions',
      description: 'Get AI-powered error fixes in seconds, not hours',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Learn from thousands of solved issues and shared solutions',
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
      year: '2020',
      title: 'Founded',
      description: 'Auto Fixer is launched with a mission to simplify error fixing',
    },
    {
      year: '2021',
      title: 'AI Integration',
      description: 'Introduced AI-powered error recognition and solutions',
    },
    {
      year: '2022',
      title: 'Global Expansion',
      description: 'Expanded to 50+ countries with 500+ repair partners',
    },
    {
      year: '2023',
      title: 'Screenshot Scanner',
      description: 'Launched advanced screenshot analysis technology',
    },
    {
      year: '2024',
      title: 'Tutorials Platform',
      description: 'Released comprehensive tutorial library with 500+ courses',
    },
  ]

  const team = [
    {
      name: 'Alex Johnson',
      role: 'Founder & CEO',
      bio: 'Tech enthusiast with 15+ years in software development',
    },
    {
      name: 'Sarah Chen',
      role: 'CTO',
      bio: 'AI expert specializing in computer vision and NLP',
    },
    {
      name: 'Marcus Williams',
      role: 'VP Product',
      bio: 'Product strategist with experience at major tech companies',
    },
    {
      name: 'Emma Rodriguez',
      role: 'Head of Support',
      bio: 'Customer-first advocate with 10+ years in support operations',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container-custom space-y-20">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="section-title mb-4">About Auto Fixer</h1>
          <p className="section-subtitle">
            Empowering millions to fix errors and learn technology with AI intelligence
          </p>
        </motion.section>

        {/* Mission Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="glass-card p-12 rounded-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                We believe everyone should have access to instant, AI-powered solutions for technical problems. Whether it's a coding error, software bug, or hardware issue, Auto Fixer is here to help you find the solution quickly and easily.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Our platform combines artificial intelligence, expert knowledge, and community wisdom to provide the most comprehensive error-fixing experience available.
              </p>
            </div>
            <div className="relative h-80 rounded-xl overflow-hidden glass-card bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="text-cyan-400 mx-auto mb-4" size={60} />
                  <p className="text-white font-bold text-xl">Instant AI Solutions</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Values Section */}
        <motion.section>
          <h2 className="section-title text-center mb-12">Our Values</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div key={index} variants={itemVariants}>
                  <div className="glass-card p-8 rounded-xl text-center hover:bg-white/[0.08] transition-all duration-300">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 p-3 mx-auto mb-4">
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.section>

        {/* Timeline Section */}
        <motion.section>
          <h2 className="section-title text-center mb-12">Our Journey</h2>
          <div className="space-y-8">
            {timeline.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-card p-8 rounded-xl border border-cyan-500/20"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-white text-xl">
                      {item.year}
                    </div>
                  </div>
                  <div className="flex-1 py-2">
                    <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Team Section */}
        <motion.section>
          <h2 className="section-title text-center mb-12">Meet Our Team</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {team.map((member, index) => (
              <motion.div key={index} variants={itemVariants}>
                <div className="glass-card p-6 rounded-xl hover:bg-white/[0.08] transition-all duration-300 text-center group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
                  <p className="text-cyan-400 font-semibold text-sm mb-3">{member.role}</p>
                  <p className="text-gray-400 text-sm">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="glass-card p-12 rounded-2xl"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">Impact by Numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { value: '100K+', label: 'Errors Fixed' },
              { value: '50K+', label: 'Active Users' },
              { value: '500+', label: 'Tutorials' },
              { value: '150+', label: 'Repair Partners' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-5xl font-bold gradient-text mb-3">{stat.value}</div>
                <p className="text-gray-400 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-card p-16 rounded-2xl text-center bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <h2 className="text-4xl font-bold text-white mb-6">Join Our Community</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Become part of a growing community of tech enthusiasts and professionals solving problems together
          </p>
          <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300">
            Get Started Today
          </button>
        </motion.section>
      </div>
    </div>
  )
}
