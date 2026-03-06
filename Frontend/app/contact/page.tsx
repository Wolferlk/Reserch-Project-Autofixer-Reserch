'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader2, CheckCircle, Mail, Phone, MapPin, Clock, MessageSquare, Sparkles, ArrowRight } from 'lucide-react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'support',
    message: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const subjects = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'support', label: 'Support' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'other', label: 'Other' },
  ]

  const faqs = [
    {
      question: 'How accurate is the AI error detection?',
      answer: 'Our AI has been trained on over 10,000 error patterns and achieves 94% accuracy in detecting and fixing errors.',
    },
    {
      question: 'Can I use Auto Fixer offline?',
      answer: 'Currently, Auto Fixer requires an internet connection to access our AI services and repair shop network.',
    },
    {
      question: 'Is my data safe?',
      answer: 'Yes, we use industry-standard encryption and never store your personal files. Your privacy is our top priority.',
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel anytime from your account settings. No questions asked. Your subscription will end at the current billing period.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee if you\'re not satisfied with our service.',
    },
  ]

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: 'support@autofixer.com',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: '+94 12345678',
      color: 'from-cyan-500 to-teal-500',
    },
    {
      icon: MapPin,
      label: 'Address',
      value: 'Malabe, Colombo, Sri Lanka',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Clock,
      label: 'Hours',
      value: 'Mon-Fri: 9AM-6PM IST',
      color: 'from-pink-500 to-red-500',
    },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate API call to your Python backend
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // })
      // const data = await response.json()

      await new Promise(resolve => setTimeout(resolve, 2000))

      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'support',
        message: '',
      })

      // Reset after 5 seconds
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-20 bg-gradient-to-b from-slate-900/50 via-slate-950 to-slate-900/50">
      <div className="container-custom space-y-20">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8 relative"
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-300">We're Here To Help</span>
          </motion.div>
          <h1 className="section-title mb-6 bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Get In Touch
          </h1>
          <p className="section-subtitle text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Have a question? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </motion.div>

        {/* Contact Info Cards */}
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
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {contactInfo.map((info, index) => {
            const Icon = info.icon
            return (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                }}
              >
                <div className="relative glass-card p-8 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 group overflow-hidden h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <motion.div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${info.color} p-3 mb-5 group-hover:shadow-lg group-hover:shadow-cyan-500/30 transition-all duration-300`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <Icon className="w-full h-full text-white" />
                    </motion.div>
                    <h3 className="font-semibold text-white mb-2 text-lg">{info.label}</h3>
                    <p className="text-gray-400 leading-relaxed">{info.value}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="glass-card p-12 rounded-2xl border border-cyan-500/20 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-white mb-2">Send us a Message</h2>
                <p className="text-gray-400 mb-8">Fill out the form below and we'll get back to you within 24 hours</p>
                
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-center py-16"
                  >
                    <div className="text-center">
                      <motion.div 
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/50"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.6 }}
                      >
                        <CheckCircle className="text-white" size={40} />
                      </motion.div>
                      <h3 className="text-3xl font-bold text-white mb-3">Message Sent!</h3>
                      <p className="text-gray-400 text-lg">Thank you for contacting us. We'll get back to you soon.</p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-cyan-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300"
                          placeholder="Your name"
                        />
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-cyan-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300"
                          placeholder="your@email.com"
                        />
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-cyan-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300"
                          placeholder="+1 (555) 000-0000"
                        />
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          Subject *
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-cyan-500/20 text-white focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300"
                        >
                          {subjects.map((subject) => (
                            <option key={subject.value} value={subject.value} className="bg-gray-900">
                              {subject.label}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <label className="block text-sm font-semibold text-gray-300 mb-3">
                        Message *
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-cyan-500/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all duration-300 resize-none"
                        placeholder="Tell us what's on your mind..."
                      />
                    </motion.div>

                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={isLoading}
                      className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold hover:shadow-xl hover:shadow-cyan-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          Send Message
                        </>
                      )}
                    </motion.button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>

          {/* Support Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Support */}
            <div className="glass-card p-8 rounded-2xl border border-cyan-500/20 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  Quick Support
                </h3>
                <ul className="space-y-4">
                  {[
                    'Response time: 24 hours',
                    'Available Mon-Fri',
                    'Multiple support channels',
                    'Dedicated support team'
                  ].map((item, idx) => (
                    <motion.li key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.05 }} className="flex items-start gap-3">
                      <span className="text-cyan-400 font-bold mt-1 text-lg">•</span>
                      <span className="text-gray-400">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Social Media */}
            <div className="glass-card p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-3">Follow Us</h3>
                <p className="text-gray-400 mb-6">Stay updated with announcements</p>
                <div className="space-y-3">
                  {['Twitter', 'LinkedIn', 'Facebook', 'Instagram'].map((social, idx) => (
                    <motion.a
                      key={social}
                      href="#"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      whileHover={{ x: 5 }}
                      className="block px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 hover:border hover:border-purple-400/50 text-gray-300 hover:text-purple-300 transition-all duration-300 flex items-center justify-between group/social"
                    >
                      {social}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover/social:opacity-100 transition-opacity" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="text-center mb-16">
            <h2 className="section-title mb-4 text-white">Frequently Asked Questions</h2>
            <p className="text-gray-400 text-lg">Find answers to common questions about our service</p>
          </div>
          <div className="space-y-4 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.details
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="glass-card rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 group overflow-hidden"
              >
                <summary className="flex items-center justify-between font-semibold text-white hover:text-cyan-400 transition-colors p-6 cursor-pointer">
                  <span className="text-lg">{faq.question}</span>
                  <motion.span 
                    className="text-cyan-400 flex-shrink-0"
                    animate={{ rotate: 0 }}
                  >
                    ▼
                  </motion.span>
                </summary>
                <div className="px-6 pb-6 border-t border-cyan-500/20">
                  <p className="text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.details>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
