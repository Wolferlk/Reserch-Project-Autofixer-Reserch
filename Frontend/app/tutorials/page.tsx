'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Play, Clock, ChevronRight, Sparkles, Send,
  Loader2, Bot, User, BookOpen, X, Zap, Monitor,
  Layers, Globe, Code2, Palette, Figma, Youtube,
  RotateCcw, ChevronDown,
} from 'lucide-react'

// ─── Background ───────────────────────────────────────────────────────────────

function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.1 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(168,85,247,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,0.2) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center,transparent 20%,#000 75%)' }} />
    </div>
  )
}

function GlowOrbs() {
  return (
    <>
      <motion.div className="absolute top-20 left-10 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-20 right-10 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.7, 0.3, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
    </>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tutorial {
  id: number
  title: string
  category: string
  duration: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  gradient: string
  description: string
  views: string
  tags: string[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'All',         value: 'all',         icon: Sparkles, color: 'from-cyan-400 to-purple-500' },
  { label: 'Photoshop',   value: 'Photoshop',   icon: Layers,   color: 'from-blue-500 to-purple-600' },
  { label: 'Illustrator', value: 'Illustrator', icon: Palette,  color: 'from-orange-400 to-red-500'  },
  { label: 'Figma',       value: 'Figma',       icon: Figma,    color: 'from-pink-400 to-purple-500' },
  { label: 'VS Code',     value: 'VS Code',     icon: Code2,    color: 'from-cyan-400 to-blue-500'   },
  { label: 'Windows',     value: 'Windows',     icon: Monitor,  color: 'from-blue-400 to-blue-600'   },
  { label: 'Chrome',      value: 'Chrome',      icon: Globe,    color: 'from-yellow-400 to-red-500'  },
  { label: 'YouTube',     value: 'YouTube',     icon: Youtube,  color: 'from-red-500 to-pink-500'    },
]

const LEVEL_COLOR = {
  Beginner:     'text-green-400 border-green-500/30 bg-green-500/10',
  Intermediate: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  Advanced:     'text-red-400 border-red-500/30 bg-red-500/10',
}

// ─── Only 2 mock tutorials — replace/extend via backend ───────────────────────

const TUTORIALS: Tutorial[] = [
  {
    id: 1,
    title: 'How to Remove Background in Photoshop',
    category: 'Photoshop',
    duration: '12 min',
    level: 'Beginner',
    gradient: 'from-blue-500 to-purple-600',
    description: 'Use the Remove Background button and Refine Edge tool to cleanly cut out any subject in seconds.',
    views: '45.2K',
    tags: ['Background Removal', 'Selection', 'Masking'],
  },
  {
    id: 2,
    title: 'Fix High CPU Usage in Windows 11',
    category: 'Windows',
    duration: '15 min',
    level: 'Intermediate',
    gradient: 'from-blue-400 to-cyan-500',
    description: 'Step-by-step guide to identify and kill processes causing 100% CPU usage via Task Manager.',
    views: '78.5K',
    tags: ['Performance', 'Task Manager', 'Startup'],
  },
]

// ─── AI chat engine (swap fetch call for your real API) ────────────────────────

async function getAIResponse(messages: ChatMessage[], userMessage: string): Promise<string> {
  const t = userMessage.toLowerCase()

  // ── Photoshop ──
  if (/photoshop|ps/i.test(t)) {
    if (/background|remove bg|cut out/i.test(t)) return `## Remove Background in Photoshop\n\n**Method 1 — One Click (PS 2021+):**\n1. Open your image → go to **Properties panel** (Window → Properties)\n2. Click **"Remove Background"** button — Photoshop uses AI to cut it instantly\n3. A **Layer Mask** is created automatically\n4. Use a white/black brush on the mask to refine edges\n\n**Method 2 — Select Subject + Refine Edge:**\n1. Go to **Select → Subject** (AI selects the main object)\n2. Then **Select → Select and Mask**\n3. Use **Refine Edge Brush** around hair/fur\n4. Set Output to **Layer Mask** → click OK\n\n**Method 3 — Magic Eraser (Simple backgrounds):**\n1. Select the **Magic Eraser** tool from toolbar\n2. Set Tolerance to **30–40** in the top bar\n3. Click on the background — it removes similar coloured areas\n\n💡 **Tip:** For best results, use Method 2 on complex subjects like hair or transparent objects.`
    if (/layer|layers/i.test(t)) return `## Working with Layers in Photoshop\n\n**Create a new layer:**\n1. Press **Ctrl+Shift+N** (Windows) / **Cmd+Shift+N** (Mac)\n2. Or click the **+** icon at the bottom of the Layers panel\n\n**Organise layers into groups:**\n1. Select multiple layers (Ctrl+click)\n2. Press **Ctrl+G** to group them\n3. Double-click the group name to rename it\n\n**Blend modes:**\n- Located in the dropdown at the top of the Layers panel\n- **Multiply** — darkens (great for shadows)\n- **Screen** — lightens (great for glows)\n- **Overlay** — adds contrast\n\n**Layer masks:**\n1. Select a layer → click the **mask icon** at the bottom of Layers panel\n2. Paint **black** to hide, **white** to reveal\n\n💡 **Tip:** Always work non-destructively — use Smart Objects and masks instead of erasing directly.`
    return `## Photoshop Help\n\nI can help you with many Photoshop tasks. Here are some things you can ask me:\n\n- **"How do I remove a background?"**\n- **"How do I work with layers?"**\n- **"How do I resize an image without losing quality?"**\n- **"How do I fix blurry images?"**\n- **"How do I export for web?"**\n\nJust ask your specific question and I'll give you step-by-step instructions!`
  }

  // ── Illustrator ──
  if (/illustrator|ai tool/i.test(t)) {
    if (/pen tool|path|bezier/i.test(t)) return `## Pen Tool in Illustrator\n\n**Basic usage:**\n1. Press **P** to select the Pen tool\n2. Click to create a straight point\n3. Click and drag to create a curved point\n4. Press **Enter** or click the first point to close a shape\n\n**Edit existing paths:**\n1. Press **A** to switch to the **Direct Selection** tool\n2. Click any anchor point to select it\n3. Drag the handles to adjust the curve\n\n**Convert anchor types:**\n- Hold **Alt/Option** and click an anchor to toggle between smooth and corner points\n\n💡 **Tip:** Practice with simple shapes first. The Pen tool is the most powerful but takes time to master.`
    return `## Illustrator Help\n\nI can guide you through Illustrator. Try asking:\n\n- **"How do I use the pen tool?"**\n- **"How do I create a logo?"**\n- **"How do I trace an image?"**\n- **"How do I export SVG?"**`
  }

  // ── Figma ──
  if (/figma/i.test(t)) {
    if (/component|variant/i.test(t)) return `## Components & Variants in Figma\n\n**Create a component:**\n1. Design your element (e.g. a button)\n2. Right-click → **"Create Component"** (or press **Ctrl+Alt+K**)\n3. It turns purple — now it's a master component\n\n**Use a component:**\n1. Open **Assets panel** (Ctrl+Alt+P)\n2. Drag the component onto your canvas — this creates an **Instance**\n3. Changes to the master update all instances automatically\n\n**Create Variants:**\n1. Select your component → click **"Add Variant"** in the right panel\n2. Set property names (e.g. State = Default, Hover, Disabled)\n3. Design each variant differently\n4. Use the **Interactive Components** feature to set hover/click states\n\n💡 **Tip:** Name your components clearly with a slash — e.g. Button/Primary/Default — to auto-organise in Assets.`
    return `## Figma Help\n\nHere are some things I can help with in Figma:\n\n- **"How do I create components?"**\n- **"How do I use Auto Layout?"**\n- **"How do I prototype interactions?"**\n- **"How do I export assets?"**`
  }

  // ── VS Code ──
  if (/vs code|vscode|visual studio code|extension/i.test(t)) {
    if (/extension|plugin/i.test(t)) return `## Install Extensions in VS Code\n\n**Method 1 — Marketplace UI:**\n1. Click the **Extensions icon** in the sidebar (or press **Ctrl+Shift+X**)\n2. Type the extension name in the search bar\n3. Click **Install** on the result\n\n**Method 2 — Command Palette:**\n1. Press **Ctrl+Shift+P** → type "Install Extensions"\n2. Search and install from there\n\n**Recommended extensions:**\n- **Prettier** — auto-formats your code\n- **ESLint** — catches JavaScript errors\n- **GitLens** — supercharges Git in VS Code\n- **Thunder Client** — test APIs without leaving VS Code\n- **Auto Rename Tag** — renames paired HTML tags together\n\n**Manage extensions:**\n- Click the gear ⚙️ next to any installed extension to disable, uninstall, or configure it\n\n💡 **Tip:** Press **Ctrl+K Ctrl+T** to switch colour themes instantly.`
    return `## VS Code Help\n\nI can help with VS Code. Try asking:\n\n- **"How do I install extensions?"**\n- **"What are the best shortcuts?"**\n- **"How do I use Git in VS Code?"**\n- **"How do I fix code formatting?"**`
  }

  // ── Windows ──
  if (/windows|pc|computer|laptop/i.test(t)) {
    if (/slow|speed up|fast/i.test(t)) return `## Speed Up Your Windows PC\n\n**Step 1 — Disable startup apps:**\n1. Press **Ctrl+Shift+Esc** → Task Manager\n2. Click the **Startup** tab\n3. Right-click and **Disable** anything with "High" impact you don't need immediately\n\n**Step 2 — Clean up disk space:**\n1. Press **Windows key** → type "Disk Cleanup" → Run as administrator\n2. Check all boxes → click OK → Delete Files\n\n**Step 3 — Adjust visual effects:**\n1. Right-click Start → System → Advanced system settings\n2. Performance → Settings → select "Adjust for best performance"\n\n**Step 4 — Check for malware:**\n1. Windows Security → Virus & threat protection → Quick scan\n\n**Step 5 — Update drivers:**\n1. Right-click Start → Device Manager\n2. Look for ⚠️ warning icons → right-click → Update driver\n\n💡 **Tip:** If you're on a traditional HDD, upgrading to an SSD is the single biggest speed improvement possible.`
    return `## Windows Help\n\nI can help with Windows issues. Try asking:\n\n- **"How do I speed up my PC?"**\n- **"How do I fix no internet connection?"**\n- **"How do I fix a blue screen?"**\n- **"How do I free up disk space?"**`
  }

  // ── Chrome ──
  if (/chrome|browser/i.test(t)) {
    if (/slow|speed|cache|clear/i.test(t)) return `## Speed Up Chrome / Clear Cache\n\n**Clear cache and cookies:**\n1. Press **Ctrl+Shift+Delete** in Chrome\n2. Set time range to **"All time"**\n3. Check: Browsing history, Cookies, Cached images\n4. Click **"Clear data"**\n\n**Disable unused extensions:**\n1. Click the puzzle piece 🧩 icon in the toolbar\n2. Click **Manage Extensions**\n3. Toggle off or remove extensions you don't use\n\n**Enable hardware acceleration:**\n1. Chrome menu (⋮) → Settings → System\n2. Turn on **"Use hardware acceleration when available"**\n3. Relaunch Chrome\n\n**Check for Chrome updates:**\n1. Chrome menu → Help → About Google Chrome\n2. Chrome will auto-update if behind\n\n💡 **Tip:** Each Chrome tab uses RAM. Use **Task Manager** (Shift+Esc in Chrome) to see which tabs use the most memory.`
    return `## Chrome Help\n\nI can help with Chrome. Try asking:\n\n- **"How do I clear cache?"**\n- **"Why is Chrome slow?"**\n- **"How do I manage extensions?"**\n- **"How do I reset Chrome settings?"**`
  }

  // ── Greeting ──
  if (/^(hi|hello|hey|sup|yo)/i.test(t)) return `👋 **Hello! I'm your Tutorial AI Assistant.**\n\nI can give you step-by-step guides for any software. Try asking:\n\n- **"How do I remove a background in Photoshop?"**\n- **"How do I install VS Code extensions?"**\n- **"How do I speed up my Windows PC?"**\n- **"How do I clear Chrome cache?"**\n- **"How do I use the Pen Tool in Illustrator?"**\n- **"How do I create components in Figma?"**\n\nJust ask in plain English — no tech knowledge needed!`

  // ── Default ──
  return `I can provide step-by-step tutorials for popular software. Try asking about:\n\n**🎨 Design Tools**\n- Photoshop (background removal, layers, effects)\n- Illustrator (pen tool, shapes, exporting)\n- Figma (components, prototyping, auto layout)\n\n**💻 Developer Tools**\n- VS Code (extensions, shortcuts, Git)\n- Chrome (speed, extensions, devtools)\n\n**🖥️ Operating Systems**\n- Windows (speed, errors, settings)\n\nJust describe what you want to do and I'll walk you through it step by step!`
}

// ─── Markdown renderer (simple) ───────────────────────────────────────────────

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-black text-white mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**'))
          return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>
        if (line.startsWith('- ')) {
          const inner = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <div key={i} className="flex items-start gap-2 pl-1"><span className="text-purple-400 mt-0.5 flex-shrink-0">•</span><p className="text-gray-300" dangerouslySetInnerHTML={{ __html: inner }} /></div>
        }
        if (/^\d+\./.test(line)) {
          const num = line.match(/^(\d+)\./)?.[1]
          const rest = line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return (
            <div key={i} className="flex items-start gap-2.5 pl-1">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5">{num}</span>
              <p className="text-gray-300" dangerouslySetInnerHTML={{ __html: rest }} />
            </div>
          )
        }
        if (line.startsWith('💡')) return <div key={i} className="mt-2 px-3 py-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-yellow-300 text-xs">{line}</div>
        if (line.trim() === '') return <div key={i} className="h-1" />
        const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        return <p key={i} className="text-gray-300" dangerouslySetInnerHTML={{ __html: rendered }} />
      })}
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `👋 **Hi! I'm your Tutorial AI Assistant.**\n\nAsk me how to do anything in popular software:\n\n- **"How do I remove a background in Photoshop?"**\n- **"How do I install VS Code extensions?"**\n- **"How do I speed up Windows?"**\n- **"How do I clear Chrome cache?"**\n- **"How do I use Pen Tool in Illustrator?"**\n\nJust ask in plain English!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // ── Replace this with your real API call ──────────────────────────────────
    // const res = await fetch('/api/tutorials-chat', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message: input, history: messages }),
    // })
    // const data = await res.json()
    // const reply = data.content
    // ─────────────────────────────────────────────────────────────────────────

    await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
    const reply = await getAIResponse(messages, input)
    setLoading(false)
    setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }])
  }

  const SUGGESTIONS = [
    'Remove background in Photoshop',
    'Speed up Windows PC',
    'Install VS Code extensions',
    'Clear Chrome cache',
    'Pen tool in Illustrator',
    'Create Figma components',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-full rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(34,211,238,0.08))' }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <p className="font-black text-white text-sm">Tutorial AI</p>
          <div className="flex items-center gap-1.5">
            <motion.span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"
              animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-xs text-gray-400">Online — Ask anything</span>
          </div>
        </div>
        <button onClick={onClose} className="ml-auto p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant'
              ? 'bg-gradient-to-br from-purple-500 to-pink-500'
              : 'bg-gradient-to-br from-cyan-500 to-blue-500'}`}>
              {msg.role === 'assistant' ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
            </div>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${msg.role === 'assistant'
              ? 'bg-white/[0.06] border border-white/8 rounded-tl-sm'
              : 'bg-gradient-to-br from-purple-600/80 to-pink-600/80 border border-purple-500/30 rounded-tr-sm'}`}>
              {msg.role === 'assistant'
                ? <RenderMarkdown content={msg.content} />
                : <p className="text-white text-sm leading-relaxed">{msg.content}</p>}
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.06] border border-white/8 flex items-center gap-2">
              {[0, 1, 2].map(j => (
                <motion.div key={j} className="w-2 h-2 rounded-full bg-purple-400"
                  animate={{ y: [0, -6, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: j * 0.15 }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-purple-500/20 bg-purple-500/8 text-purple-300 hover:bg-purple-500/15 hover:text-white transition-all whitespace-nowrap">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask how to do something…"
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all resize-none"
            style={{ maxHeight: 100 }}
          />
          <motion.button onClick={send} disabled={!input.trim() || loading}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}>
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} className="text-white" /></motion.div>
              : <Send size={16} className="text-white" />}
          </motion.button>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </motion.div>
  )
}

// ─── Tutorial card ────────────────────────────────────────────────────────────

function TutorialCard({ tutorial, onClick }: { tutorial: Tutorial; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.01 }} transition={{ duration: 0.4 }}
      className="group rounded-2xl border border-white/10 bg-gray-950/80 overflow-hidden cursor-pointer flex flex-col"
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 50px rgba(168,85,247,0.15)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      style={{ transition: 'box-shadow 0.3s' }}
    >
      {/* Thumbnail */}
      <div className={`h-40 bg-gradient-to-br ${tutorial.gradient} relative overflow-hidden flex items-center justify-center`}>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300" />
        <motion.div whileHover={{ scale: 1.15 }} className="relative z-10 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <Play size={22} className="text-white ml-0.5" fill="white" />
        </motion.div>
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <Clock size={11} className="text-cyan-400" />
          <span className="text-white text-xs font-semibold">{tutorial.duration}</span>
        </div>
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold border ${LEVEL_COLOR[tutorial.level]}`}>
          {tutorial.level}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-purple-500/30 bg-purple-500/10 text-purple-300">
            {tutorial.category}
          </span>
          <span className="text-xs text-gray-600">{tutorial.views} views</span>
        </div>
        <h3 className="font-black text-white text-base mb-2 group-hover:text-purple-300 transition-colors leading-tight">
          {tutorial.title}
        </h3>
        <p className="text-gray-400 text-sm mb-4 flex-1 leading-relaxed">{tutorial.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tutorial.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/8 bg-white/5 text-gray-500">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/8">
          <span className="text-xs text-gray-600">Click to open tutorial</span>
          <motion.div whileHover={{ x: 3 }} className="flex items-center gap-1 text-purple-400 text-sm font-bold">
            Watch <ChevronRight size={14} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tutorials() {
  const [search, setSearch]             = useState('')
  const [category, setCategory]         = useState('all')
  const [chatOpen, setChatOpen]         = useState(false)
  const [showAllCats, setShowAllCats]   = useState(false)

  const filtered = TUTORIALS.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q))
    const matchCat = category === 'all' || t.category === category
    return matchSearch && matchCat
  })

  const visibleCats = showAllCats ? CATEGORIES : CATEGORIES.slice(0, 6)

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <GridBg /><GlowOrbs />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-purple-500/30 bg-purple-500/10 backdrop-blur-md">
            <motion.span className="w-2 h-2 rounded-full bg-purple-400 inline-block"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <BookOpen size={13} className="text-purple-400" />
            <span className="text-purple-300 text-sm font-semibold">Step-by-Step Software Guides</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
            <span className="block bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Learn Any</span>
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 40px rgba(168,85,247,0.4))' }}>
              Software, Fast
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
            Browse video guides or chat with our AI to get instant step-by-step instructions for any software.
          </p>

          {/* Open chat CTA */}
          <motion.button onClick={() => setChatOpen(true)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)', boxShadow: '0 0 30px rgba(168,85,247,0.35)' }}>
            <Bot size={18} />
            Ask AI Anything
            <Sparkles size={14} />
          </motion.button>
        </motion.div>

        {/* ── Main layout ── */}
        <div className={`grid gap-6 transition-all duration-500 ${chatOpen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

          {/* ── Left: tutorials ── */}
          <div className="space-y-6">

            {/* Search + filter bar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <div className="relative mb-4">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" placeholder="Search tutorials…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {visibleCats.map(({ label, value, icon: Icon, color }) => (
                  <motion.button key={value} onClick={() => setCategory(value)}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${category === value
                      ? 'text-white shadow-lg'
                      : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/8 hover:text-white'}`}
                    style={category === value ? { background: `linear-gradient(135deg,${color.includes('cyan') ? '#22d3ee' : color.includes('purple') ? '#a855f7' : color.includes('orange') ? '#f97316' : color.includes('blue') ? '#3b82f6' : color.includes('pink') ? '#ec4899' : color.includes('yellow') ? '#facc15' : color.includes('red') ? '#ef4444' : '#a855f7'},${color.includes('purple') ? '#ec4899' : '#22d3ee'})`, boxShadow: '0 4px 16px rgba(168,85,247,0.3)' } : {}}>
                    <Icon size={13} />
                    {label}
                  </motion.button>
                ))}
                <button onClick={() => setShowAllCats(!showAllCats)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-gray-500 hover:text-white hover:bg-white/8 transition-all">
                  {showAllCats ? 'Less' : 'More'}
                  <motion.div animate={{ rotate: showAllCats ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={12} />
                  </motion.div>
                </button>
              </div>
            </motion.div>

            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {filtered.length === 0 ? 'No tutorials found' : `${filtered.length} tutorial${filtered.length !== 1 ? 's' : ''}`}
                {category !== 'all' && <span className="text-purple-400 ml-1">in {category}</span>}
              </p>
              {(search || category !== 'all') && (
                <button onClick={() => { setSearch(''); setCategory('all') }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {/* Tutorial cards */}
            <AnimatePresence mode="wait">
              {filtered.length > 0 ? (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filtered.map(t => (
                    <TutorialCard key={t.id} tutorial={t} onClick={() => setChatOpen(true)} />
                  ))}

                  {/* Add more card — placeholder for backend */}
                  <motion.div whileHover={{ y: -4, scale: 1.01 }}
                    className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center p-10 text-center cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group min-h-[200px]">
                    <div className="w-12 h-12 rounded-2xl border border-dashed border-white/20 group-hover:border-purple-500/40 flex items-center justify-center mb-4 transition-colors">
                      <Zap size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <p className="text-gray-500 text-sm font-semibold group-hover:text-gray-300 transition-colors">More tutorials coming</p>
                    <p className="text-gray-700 text-xs mt-1">Connect your backend API</p>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
                    <Search size={26} className="text-gray-600" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">No tutorials found</h3>
                  <p className="text-gray-500 text-sm mb-5">Try a different search or ask the AI directly</p>
                  <motion.button onClick={() => setChatOpen(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}>
                    <Bot size={15} /> Ask AI Instead
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats bar */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.7 }} viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  { val: '500+',  label: 'Tutorials'      },
                  { val: '50K+',  label: 'Learning Hours' },
                  { val: '25K+',  label: 'Students'       },
                ].map(({ val, label }, i) => (
                  <div key={i}>
                    <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">{val}</div>
                    <div className="text-gray-500 text-xs uppercase tracking-widest">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Right: Chat panel ── */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"
                style={{ minHeight: 600 }}
              >
                <ChatPanel onClose={() => setChatOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Floating chat button (when chat is closed) ── */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            onClick={() => setChatOpen(true)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl z-50"
            style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)', boxShadow: '0 0 40px rgba(168,85,247,0.5)' }}>
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <Bot size={26} className="text-white" />
            </motion.div>
            <motion.div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-black"
              animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}