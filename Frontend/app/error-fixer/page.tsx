'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Loader2, CheckCircle, Zap, Copy, Check,
  RefreshCw, AlertTriangle, Monitor, Sparkles,
  ChevronRight, BookOpen, Headphones, X,
  Shield, Wifi, HardDrive, Settings, Battery,
  Volume2, Printer, Cpu, RotateCcw,
} from 'lucide-react'

// ─── Background helpers ────────────────────────────────────────────────────────

function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.12 }}>
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.18) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.18) 1px,transparent 1px)',
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
        style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-20 right-10 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)', filter: 'blur(50px)' }}
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.7, 0.3, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
    </>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  step: number
  title: string
  description: string
  actions: string[]
  warning?: string
  severity: 'diagnose' | 'fix' | 'prevent'
}

interface Result {
  error: string
  category: string
  icon: any
  categoryColor: string
  difficulty: 'Easy' | 'Medium' | 'Advanced'
  estimatedTime: string
  steps: Step[]
}

// ─── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <motion.button onClick={copy} whileTap={{ scale: 0.9 }}
      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-cyan-400">
      <AnimatePresence mode="wait" initial={false}>
        {copied
          ? <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={13} className="text-green-400" /></motion.div>
          : <motion.div key="u" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy size={13} /></motion.div>}
      </AnimatePresence>
    </motion.button>
  )
}

// ─── Windows error categories ──────────────────────────────────────────────────

const CATEGORIES = [
  { icon: Monitor,   label: 'Blue Screen (BSOD)',    color: 'from-blue-400 to-blue-600'     },
  { icon: Wifi,      label: 'Internet / Network',    color: 'from-cyan-400 to-blue-500'     },
  { icon: Shield,    label: 'Windows Update',        color: 'from-green-400 to-emerald-600' },
  { icon: HardDrive, label: 'Disk / Storage',        color: 'from-orange-400 to-red-500'    },
  { icon: Settings,  label: 'Slow / Freezing PC',    color: 'from-purple-400 to-pink-500'   },
  { icon: Volume2,   label: 'Sound / Audio',         color: 'from-yellow-400 to-orange-400' },
  { icon: Printer,   label: 'Printer Issues',        color: 'from-pink-400 to-rose-500'     },
  { icon: Cpu,       label: 'High CPU / RAM',        color: 'from-red-400 to-orange-500'    },
  { icon: Battery,   label: 'Battery / Power',       color: 'from-lime-400 to-green-500'    },
  { icon: RotateCcw, label: 'System Restore',        color: 'from-indigo-400 to-purple-500' },
]

const EXAMPLES = [
  { label: 'Blue Screen of Death',         text: 'My PC suddenly shows a blue screen with SYSTEM_THREAD_EXCEPTION_NOT_HANDLED and restarts automatically' },
  { label: 'No Internet Connection',       text: 'Windows says "No Internet Access" but my Wi-Fi is connected. Other devices work fine on same network' },
  { label: 'Windows Update Stuck',         text: 'Windows Update is stuck at 35% and has not moved for 3 hours. Cannot cancel or restart normally' },
  { label: 'PC Running Very Slow',         text: 'My Windows 11 PC is extremely slow after startup. Everything takes minutes to open and the fan runs loudly' },
  { label: 'Sound Not Working',            text: 'No sound from speakers or headphones after Windows update. Volume is not muted and device shows as working' },
  { label: 'Disk 100% Usage',              text: 'Task Manager shows Disk at 100% usage all the time even when idle. PC is very slow and unresponsive' },
]

// ─── AI solution engine ────────────────────────────────────────────────────────

function buildSolution(input: string): Result {
  const t = input.toLowerCase()

  const isBSOD    = /blue screen|bsod|stop error|exception|thread|memory|dumping/i.test(t)
  const isNet     = /internet|network|wifi|wi-fi|ethernet|no access|dns|connected but/i.test(t)
  const isUpdate  = /update|windows update|stuck|35%|install fail|kb\d/i.test(t)
  const isSlow    = /slow|freeze|freezing|lag|unresponsive|takes long|startup/i.test(t)
  const isSound   = /sound|audio|speaker|headphone|no sound|volume|muted/i.test(t)
  const isDisk    = /disk|100%|storage|hard drive|ssd|full|task manager/i.test(t)
  const isCPU     = /cpu|ram|memory|processor|high usage|task manager|fan/i.test(t)
  const isBattery = /battery|power|charging|plugged|drain|not charging/i.test(t)
  const isPrinter = /print|printer|spooler|offline|cannot print/i.test(t)
  const isRestore = /restore|recovery|reset|factory|system restore/i.test(t)

  if (isBSOD) return {
    error: input, category: 'Blue Screen of Death (BSOD)', icon: Monitor,
    categoryColor: 'from-blue-400 to-blue-600', difficulty: 'Medium', estimatedTime: '15–30 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Note the Error Code',
        description: 'The blue screen contains a specific stop code that identifies the problem. This is the most important clue.',
        actions: [
          'Write down the error code shown on the blue screen (e.g. SYSTEM_THREAD_EXCEPTION_NOT_HANDLED)',
          'Press Windows key → type "Event Viewer" → Open it',
          'Go to Windows Logs → System → look for red "Error" entries near the crash time',
          'Note the Source and Event ID — this pinpoints the faulty driver or hardware',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Update or Roll Back Drivers',
        description: 'Most BSODs are caused by outdated, corrupted, or incompatible device drivers — especially after a Windows update.',
        actions: [
          'Right-click Start → Device Manager',
          'Look for any devices with a yellow warning triangle ⚠️',
          'Right-click the device → Update driver → Search automatically',
          'If BSOD started after a recent update: Right-click the device → Properties → Driver tab → Roll Back Driver',
          'Most common culprits: Display adapter (GPU), Network adapter, Bluetooth',
        ],
        warning: 'If you cannot boot normally, restart and press F8 to enter Safe Mode first, then follow the steps above.',
      },
      {
        step: 3, severity: 'fix', title: 'Run System File Checker',
        description: 'Corrupted Windows system files can cause random BSODs. The built-in SFC tool scans and repairs them automatically.',
        actions: [
          'Press Windows key → type "cmd" → right-click Command Prompt → Run as administrator',
          'Type exactly: sfc /scannow and press Enter',
          'Wait for the scan to complete (can take 10–20 minutes)',
          'If it finds issues, also run: DISM /Online /Cleanup-Image /RestoreHealth',
          'Restart your PC when complete',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Check RAM & Prevent Future BSODs',
        description: 'Faulty RAM is another common BSOD cause. Run Windows Memory Diagnostic to rule this out.',
        actions: [
          'Press Windows + R → type mdsched.exe → press Enter',
          'Choose "Restart now and check for problems"',
          'Windows will test your RAM on next startup (takes ~10 min)',
          'Enable automatic driver updates: Settings → Windows Update → Advanced Options → Optional Updates',
          'Consider installing a free tool like WhoCrashed to read minidump files for future crashes',
        ],
      },
    ],
  }

  if (isNet) return {
    error: input, category: 'Internet / Network Issue', icon: Wifi,
    categoryColor: 'from-cyan-400 to-blue-500', difficulty: 'Easy', estimatedTime: '5–15 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Identify the Network Problem',
        description: 'First determine if the issue is with Windows, your router, or your Internet Service Provider.',
        actions: [
          'Check if other devices (phone, tablet) can access internet on the same Wi-Fi',
          'If other devices work → the problem is with your Windows PC specifically',
          'If no devices work → the problem is your router or ISP',
          'On your PC: click the Wi-Fi icon in taskbar → note if it says "No Internet Access" or "Connected, no internet"',
          'Press Windows + R → type cmd → type: ping 8.8.8.8 → press Enter (checks if internet works)',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Reset Network Settings',
        description: 'Windows has a built-in network reset that fixes most connectivity problems in one click.',
        actions: [
          'Press Windows key → type "Network Reset" → click Network reset',
          'Click "Reset now" → click Yes to confirm',
          'Your PC will restart — this takes about 5 minutes',
          'After restart, reconnect to your Wi-Fi network',
          'If still not working: Right-click the Wi-Fi icon → Troubleshoot problems → follow the wizard',
        ],
      },
      {
        step: 3, severity: 'fix', title: 'Flush DNS & Renew IP Address',
        description: 'Stale DNS cache or expired IP leases commonly cause "No Internet" errors even when connected.',
        actions: [
          'Press Windows key → type "cmd" → Run as administrator',
          'Type each command and press Enter after each one:',
          '→ netsh winsock reset',
          '→ netsh int ip reset',
          '→ ipconfig /release',
          '→ ipconfig /flushdns',
          '→ ipconfig /renew',
          'Restart your PC after running all commands',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Update Network Driver',
        description: 'An outdated Wi-Fi or Ethernet driver is a very common cause of random disconnections.',
        actions: [
          'Right-click Start → Device Manager',
          'Expand "Network adapters"',
          'Right-click your Wi-Fi or Ethernet adapter → Update driver',
          'Choose "Search automatically for drivers"',
          'Alternatively, visit your laptop/PC manufacturer website to download the latest driver directly',
        ],
      },
    ],
  }

  if (isUpdate) return {
    error: input, category: 'Windows Update Problem', icon: Shield,
    categoryColor: 'from-green-400 to-emerald-600', difficulty: 'Medium', estimatedTime: '20–40 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Check Update Status',
        description: 'First confirm the update is actually stuck and not just running slowly in the background.',
        actions: [
          'Wait at least 2–3 hours before taking action — some updates are genuinely slow',
          'Check if your hard drive light is blinking (activity means it\'s still working)',
          'Press Ctrl + Shift + Esc → Task Manager → check if "Windows Update" shows CPU/Disk activity',
          'If zero activity for more than 1 hour, the update is likely frozen',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Run Windows Update Troubleshooter',
        description: 'Microsoft\'s built-in troubleshooter automatically fixes the most common update problems.',
        actions: [
          'Press Windows key → type "Troubleshoot settings" → Open',
          'Click "Additional troubleshooters" (or "Other troubleshooters" on Windows 11)',
          'Click "Windows Update" → click "Run the troubleshooter"',
          'Follow the on-screen instructions and apply any fixes found',
          'Restart your PC and try updating again',
        ],
      },
      {
        step: 3, severity: 'fix', title: 'Clear Windows Update Cache',
        description: 'Corrupted update cache files are the #1 cause of stuck updates. Clearing them forces a fresh download.',
        actions: [
          'Press Windows key → type "cmd" → Run as administrator',
          'Type: net stop wuauserv → press Enter (stops Windows Update service)',
          'Type: net stop bits → press Enter',
          'Open File Explorer → go to: C:\\Windows\\SoftwareDistribution\\Download',
          'Select all files (Ctrl+A) → Delete them all',
          'Back in Command Prompt: net start wuauserv → press Enter',
          'Type: net start bits → press Enter',
          'Go to Settings → Windows Update → Check for updates',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Ensure Enough Disk Space',
        description: 'Windows requires at least 20GB of free space to install major updates.',
        actions: [
          'Press Windows + E → right-click your C: drive → Properties → check free space',
          'If less than 20GB free: Press Windows key → type "Disk Cleanup" → Run as administrator',
          'Check all boxes including "Windows Update Cleanup" → click OK → Delete Files',
          'Consider enabling Storage Sense: Settings → System → Storage → Storage Sense → Turn on',
        ],
      },
    ],
  }

  if (isSlow || isCPU) return {
    error: input, category: 'Slow / Freezing PC', icon: Settings,
    categoryColor: 'from-purple-400 to-pink-500', difficulty: 'Easy', estimatedTime: '10–20 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Find What\'s Using Resources',
        description: 'Use Task Manager to identify the exact program or process causing slowness.',
        actions: [
          'Press Ctrl + Shift + Esc to open Task Manager',
          'Click "More details" if shown',
          'Click the "CPU" column header to sort by highest usage',
          'Also click "Memory" and "Disk" columns to check each',
          'Note any process using over 30% — right-click it → Search online to learn what it is',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Disable Startup Programs',
        description: 'Too many programs launching at startup is the most common cause of slow Windows boot times.',
        actions: [
          'Press Ctrl + Shift + Esc → Task Manager → click "Startup" tab',
          'Look at the "Startup impact" column — disable anything marked "High"',
          'Right-click programs you don\'t need immediately → Disable',
          'Common safe ones to disable: Spotify, Discord, Teams, OneDrive, Skype, Steam',
          'Do NOT disable: antivirus, audio drivers, display drivers',
          'Restart your PC to see the improvement',
        ],
      },
      {
        step: 3, severity: 'fix', title: 'Free Up Disk Space & Defragment',
        description: 'A nearly full hard drive dramatically slows down Windows. Aim to keep at least 15% free.',
        actions: [
          'Press Windows key → type "Disk Cleanup" → Run as administrator',
          'Select your C: drive → check all boxes → click OK → Delete Files',
          'Settings → System → Storage → click "Temporary files" → remove them',
          'For HDDs (not SSDs): type "Defragment" in Start → Optimize Drives → click Optimize',
          'For SSDs: the same tool runs "TRIM" which is correct — do not defragment SSDs',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Adjust Performance Settings',
        description: 'Windows visual effects consume significant resources on older PCs.',
        actions: [
          'Right-click Start → System → Advanced system settings',
          'Under Performance → click Settings',
          'Select "Adjust for best performance" or manually uncheck animations',
          'Safe to uncheck: Animate windows, Fade effects, Shadows under windows',
          'Also check: Settings → Windows Update → ensure no update is downloading in background',
          'Run a malware scan: Windows Security → Virus & threat protection → Quick scan',
        ],
      },
    ],
  }

  if (isSound) return {
    error: input, category: 'Sound / Audio Problem', icon: Volume2,
    categoryColor: 'from-yellow-400 to-orange-400', difficulty: 'Easy', estimatedTime: '5–10 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Check Basic Audio Settings',
        description: 'Before going deeper, verify Windows has the right output device selected.',
        actions: [
          'Click the speaker icon in the taskbar — make sure volume is not at 0 or muted',
          'Right-click the speaker icon → Open Sound settings',
          'Under "Output" — make sure the correct device is selected (e.g. your speakers, not HDMI)',
          'Click your output device → click "Test" — do you hear the test sound?',
          'Also right-click the speaker icon → Volume mixer — check no app is muted',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Run Audio Troubleshooter',
        description: 'Windows can automatically detect and fix most sound problems.',
        actions: [
          'Right-click the speaker icon in taskbar → Troubleshoot sound problems',
          'Select the device you want to fix → click Next',
          'Follow the on-screen steps and apply any suggested fixes',
          'Alternatively: Settings → System → Troubleshoot → Other troubleshooters → Playing Audio → Run',
        ],
      },
      {
        step: 3, severity: 'fix', title: 'Reinstall Audio Driver',
        description: 'A corrupted or outdated audio driver is the most common cause of sound disappearing after a Windows update.',
        actions: [
          'Right-click Start → Device Manager',
          'Expand "Sound, video and game controllers"',
          'Right-click your audio device (e.g. Realtek High Definition Audio) → Uninstall device',
          'Check "Delete the driver software for this device" → click Uninstall',
          'Restart your PC — Windows will automatically reinstall the audio driver',
          'If still no sound: visit your PC/laptop manufacturer\'s website and download the latest audio driver',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Restart Windows Audio Service',
        description: 'Sometimes the Windows Audio service crashes silently. Restarting it fixes the issue instantly.',
        actions: [
          'Press Windows + R → type services.msc → press Enter',
          'Scroll down to find "Windows Audio"',
          'Right-click Windows Audio → Restart',
          'Also restart "Windows Audio Endpoint Builder" the same way',
          'If the service shows "Stopped", right-click → Start',
        ],
      },
    ],
  }

  if (isDisk) return {
    error: input, category: 'Disk 100% / Storage Issue', icon: HardDrive,
    categoryColor: 'from-orange-400 to-red-500', difficulty: 'Medium', estimatedTime: '15–25 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Find What\'s Causing 100% Disk',
        description: 'Several Windows services and apps are known to cause disk spikes. Identify the culprit first.',
        actions: [
          'Press Ctrl + Shift + Esc → Task Manager → click "Disk" column to sort',
          'Note which process is at the top — common culprits: Antivirus, Windows Search, Superfetch, Windows Update',
          'Also check: right-click Start → Event Viewer → Windows Logs → Application → look for errors',
          'Open Resource Monitor: Task Manager → Performance tab → click "Open Resource Monitor" → Disk tab',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Disable SysMain (Superfetch)',
        description: 'SysMain preloads apps into RAM but causes constant disk thrashing on HDDs and older SSDs.',
        actions: [
          'Press Windows + R → type services.msc → press Enter',
          'Find "SysMain" in the list → right-click → Properties',
          'Change "Startup type" to Disabled → click Stop → click OK',
          'Also consider disabling "Windows Search" the same way if you rarely search files',
          'Restart your PC and check if disk usage drops',
        ],
        warning: 'Disabling SysMain may slightly increase app launch times. Re-enable it if you notice no improvement.',
      },
      {
        step: 3, severity: 'fix', title: 'Check Disk for Errors',
        description: 'Physical bad sectors on your hard drive can cause permanent 100% disk usage.',
        actions: [
          'Press Windows key → type "cmd" → Run as administrator',
          'Type: chkdsk C: /f /r → press Enter',
          'Type Y when asked to schedule on next restart → press Enter',
          'Restart your PC — the check runs before Windows loads (takes 20–60 min)',
          'Results are shown in Event Viewer → Windows Logs → Application → Source: Wininit',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Upgrade to SSD or Free Up Space',
        description: 'If you\'re still on a traditional HDD, upgrading to an SSD is the single biggest performance improvement possible.',
        actions: [
          'Check if you have HDD or SSD: Task Manager → Performance → Disk → look for "Type"',
          'Free up space now: Settings → System → Storage → Temporary files → remove all',
          'Disable hibernation (recovers several GB): cmd as admin → type: powercfg /hibernate off',
          'If on HDD: Defragment weekly → Start → Defragment and Optimize Drives',
          'Consider a 240GB+ SSD replacement — they cost under $40 and transform PC speed',
        ],
      },
    ],
  }

  if (isBattery) return {
    error: input, category: 'Battery / Power Issue', icon: Battery,
    categoryColor: 'from-lime-400 to-green-500', difficulty: 'Easy', estimatedTime: '5–15 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Generate a Battery Report',
        description: 'Windows has a hidden battery report that shows full history, health, and capacity.',
        actions: [
          'Press Windows key → type "cmd" → Run as administrator',
          'Type: powercfg /batteryreport → press Enter',
          'Open File Explorer → go to C:\\Users\\YourName\\battery-report.html',
          'Open it in your browser — check "Design Capacity" vs "Full Charge Capacity"',
          'If Full Charge is less than 50% of Design Capacity, your battery needs replacement',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Recalibrate the Battery',
        description: 'Windows sometimes misreads battery percentage. Calibrating it resets the readings.',
        actions: [
          'Charge your laptop to 100% and leave plugged in for 2 more hours',
          'Unplug and use your laptop until it shuts down from low battery',
          'Leave it off for 5 hours',
          'Plug back in and charge to 100% without interruption',
          'This recalibrates the battery meter — check if percentage is more accurate now',
        ],
      },
      {
        step: 3, severity: 'fix', title: 'Update Battery & Power Drivers',
        description: 'Corrupted battery drivers can cause "plugged in, not charging" errors.',
        actions: [
          'Right-click Start → Device Manager',
          'Expand "Batteries"',
          'Right-click "Microsoft ACPI-Compliant Control Method Battery" → Uninstall device',
          'Do NOT delete driver files — just uninstall the device',
          'Shut down completely (not restart) → unplug for 30 seconds → plug in and power on',
          'Windows reinstalls the driver automatically',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Optimize Power Settings',
        description: 'Wrong power plan settings drain battery faster and can cause charging issues.',
        actions: [
          'Right-click the battery icon → Power Options',
          'Select "Balanced" plan (not High Performance when on battery)',
          'Click "Change plan settings" → "Change advanced power settings"',
          'Set "Battery" → "Critical battery action" to Hibernate',
          'Set "Critical battery level" to 5–10%',
          'Settings → System → Battery → enable Battery Saver at 20%',
        ],
      },
    ],
  }

  // Generic Windows error fallback
  return {
    error: input, category: 'Windows System Error', icon: Monitor,
    categoryColor: 'from-cyan-400 to-blue-500', difficulty: 'Medium', estimatedTime: '10–20 min',
    steps: [
      {
        step: 1, severity: 'diagnose', title: 'Check Event Viewer for Details',
        description: 'Event Viewer records every error Windows encounters. It\'s the best starting point for any unknown error.',
        actions: [
          'Press Windows key → type "Event Viewer" → Open',
          'In the left panel: Windows Logs → System',
          'Click the "Level" column to sort — look for red "Error" entries',
          'Double-click an error to see the full description and Event ID',
          'Search the Event ID number online (e.g. "Event ID 41 fix Windows") for targeted solutions',
        ],
      },
      {
        step: 2, severity: 'fix', title: 'Run System File Checker',
        description: 'SFC scans all protected Windows files and replaces corrupted ones automatically.',
        actions: [
          'Press Windows key → type "cmd" → right-click → Run as administrator',
          'Type: sfc /scannow → press Enter',
          'Wait for 100% completion — do not close the window',
          'If it reports "found corrupt files and repaired them" → restart your PC',
          'If problems persist, also run: DISM /Online /Cleanup-Image /RestoreHealth',
        ],
      },
      {
        step: 3, severity: 'fix', title: 'Run Windows Troubleshooters',
        description: 'Microsoft provides automatic troubleshooters for most common Windows problems.',
        actions: [
          'Settings → System → Troubleshoot → Other troubleshooters',
          'Run the troubleshooter most relevant to your issue',
          'Also try: Settings → Windows Update → run the Windows Update troubleshooter',
          'After running, restart your PC and test if the issue is resolved',
        ],
      },
      {
        step: 4, severity: 'prevent', title: 'Keep Windows & Drivers Updated',
        description: 'Most Windows errors are fixed by Microsoft in updates. Staying current prevents most problems.',
        actions: [
          'Settings → Windows Update → Check for updates → install all available',
          'Right-click Start → Device Manager → look for any ⚠️ yellow warning icons',
          'Update any flagged drivers by right-clicking → Update driver',
          'Enable automatic updates if disabled: Settings → Windows Update → Advanced options',
          'Create a restore point after everything works: Start → Create a restore point → Create',
        ],
      },
    ],
  }
}

// ─── Severity config ────────────────────────────────────────────────────────────

const sevCfg = {
  diagnose: { border: 'border-blue-500/30',   bg: 'bg-blue-500/5',   dot: 'bg-blue-400',   label: 'Diagnose', num: 'from-blue-400 to-blue-600'     },
  fix:      { border: 'border-green-500/30',  bg: 'bg-green-500/5',  dot: 'bg-green-400',  label: 'Fix',      num: 'from-green-400 to-emerald-500'  },
  prevent:  { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  dot: 'bg-amber-400',  label: 'Prevent',  num: 'from-amber-400 to-orange-500'   },
}

const diffColor = { Easy: 'text-green-400 border-green-500/30 bg-green-500/10', Medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', Advanced: 'text-red-400 border-red-500/30 bg-red-500/10' }

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ErrorFixer() {
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<Result | null>(null)
  const [progress, setProgress]     = useState(0)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [progressLabel, setProgressLabel] = useState('')

  const STAGES = [
    { pct: 20, label: 'Reading error…'       },
    { pct: 40, label: 'Identifying issue…'   },
    { pct: 65, label: 'Finding solutions…'   },
    { pct: 85, label: 'Building guide…'      },
    { pct: 100, label: 'Almost ready…'       },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    setProgress(0)
    setActiveStep(null)
    for (const s of STAGES) {
      await new Promise(r => setTimeout(r, 380))
      setProgress(s.pct)
      setProgressLabel(s.label)
    }
    await new Promise(r => setTimeout(r, 300))
    setResult(buildSolution(input))
    setLoading(false)
    setProgress(0)
  }

  const handleCategoryClick = (label: string) => {
    const map: Record<string, string> = {
      'Blue Screen (BSOD)':  'My PC suddenly shows a blue screen with SYSTEM_THREAD_EXCEPTION_NOT_HANDLED and restarts',
      'Internet / Network':  'Windows says No Internet Access but Wi-Fi is connected and other devices work fine',
      'Windows Update':      'Windows Update is stuck at 35% and has not moved for over 3 hours',
      'Disk / Storage':      'Task Manager shows Disk at 100% usage all the time even when idle',
      'Slow / Freezing PC':  'My Windows 11 PC is extremely slow after startup and everything takes minutes to open',
      'Sound / Audio':       'No sound from speakers or headphones after Windows update but volume is not muted',
      'High CPU / RAM':      'Task Manager shows CPU at 100% constantly even when no programs are open',
      'Battery / Power':     'My laptop battery says plugged in but not charging even with charger connected',
      'Printer Issues':      'My printer shows offline in Windows and will not print anything',
      'System Restore':      'I need to restore Windows to an earlier point because my PC stopped working',
    }
    setInput(map[label] ?? label)
  }

  const handleReset = () => { setResult(null); setInput(''); setActiveStep(null) }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <GridBg /><GlowOrbs />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">

        {/* ── Hero ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
            <motion.span className="w-2 h-2 rounded-full bg-blue-400 inline-block"
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <Monitor size={13} className="text-blue-400" />
            <span className="text-blue-300 text-sm font-semibold">Windows OS Error Fixer</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4">
            <span className="block bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">Fix Windows</span>
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.4))' }}>
              Errors Instantly
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Describe your Windows problem in plain English — no tech knowledge needed. Get clear, step-by-step fixes.
          </p>
        </motion.div>

        {/* ── Category quick-select ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 text-center mb-4">Select a problem category</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CATEGORIES.map(({ icon: Icon, label, color }, i) => (
              <motion.button key={i} onClick={() => handleCategoryClick(label)}
                whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors text-center leading-tight">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Input panel ── */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24 space-y-4">

              {/* Input card */}
              <div className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <Monitor size={13} className="text-white" />
                  </div>
                  <span className="font-bold text-sm text-white">Describe Your Problem</span>
                  {result && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      onClick={handleReset} whileTap={{ scale: 0.9 }}
                      className="ml-auto p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <X size={13} />
                    </motion.button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      What's happening on your PC?
                    </label>
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="e.g. My PC shows a blue screen and restarts randomly. It started after installing a Windows update yesterday…"
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all resize-none leading-relaxed"
                    />
                    {input && (
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-600">{input.length} chars</span>
                        <button onClick={() => setInput('')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Clear</button>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <AnimatePresence>
                    {loading && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                <Loader2 size={11} />
                              </motion.div>
                              {progressLabel}
                            </span>
                            <span className="text-blue-400 font-bold">{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-500"
                              animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button onClick={handleSubmit} disabled={loading || !input.trim()}
                    whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{
                      background: loading ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg,#3b82f6,#22d3ee)',
                      boxShadow: loading ? 'none' : '0 0 24px rgba(59,130,246,0.3)',
                    }}>
                    {loading
                      ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} /></motion.div> Analyzing…</>
                      : <><Zap size={16} /> Fix My Windows Error</>
                    }
                  </motion.button>
                </div>
              </div>

              {/* Examples */}
              <div className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm p-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Common Problems</h3>
                <div className="space-y-1">
                  {EXAMPLES.map((ex, i) => (
                    <motion.button key={i} onClick={() => setInput(ex.text)}
                      whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-all group">
                      <ChevronRight size={13} className="text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      <span className="text-sm text-gray-400 group-hover:text-white transition-colors truncate">{ex.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Help links */}
              <div className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm p-5 space-y-2">
                {[
                  { icon: BookOpen,   label: 'Windows Tutorials', href: '/tutorials', color: 'text-purple-400' },
                  { icon: Headphones, label: 'Contact Support',   href: '/contact',   color: 'text-pink-400'  },
                ].map(({ icon: Icon, label, href, color }) => (
                  <a key={label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group">
                    <Icon size={15} className={`${color} flex-shrink-0`} />
                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{label}</span>
                    <ChevronRight size={13} className="ml-auto text-gray-700 group-hover:text-gray-400 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Results panel ── */}
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">

              {/* Empty state */}
              {!result && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-h-[500px] rounded-2xl border border-white/10 bg-gray-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-8">
                    <Monitor size={40} className="text-blue-400" />
                  </motion.div>
                  <h3 className="text-3xl font-black text-white mb-3">Windows Error Fixer</h3>
                  <p className="text-gray-500 max-w-sm leading-relaxed mb-8">
                    Pick a category above or describe your problem on the left in plain English — no tech jargon needed.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Blue Screen', 'No Internet', 'Slow PC', 'No Sound', 'Disk 100%', 'Update Failed', 'Not Charging', 'Printer Offline'].map(tag => (
                      <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-500/20 bg-blue-500/8 text-blue-400">{tag}</span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Loading state */}
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="min-h-[500px] rounded-2xl border border-white/10 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <motion.div className="absolute inset-0 rounded-full border-2 border-blue-500/30"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
                      <motion.div className="absolute inset-0 rounded-full border-2 border-cyan-500/20"
                        animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                          <Monitor size={28} className="text-blue-400" />
                        </motion.div>
                      </div>
                    </div>
                    <p className="text-white font-bold text-lg">{progressLabel}</p>
                    <p className="text-gray-500 text-sm mt-1">Finding the best fix for your Windows error…</p>
                  </div>
                </motion.div>
              )}

              {/* Result */}
              {result && !loading && (
                <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-5">

                  {/* Summary banner */}
                  <div className="rounded-2xl border border-white/10 bg-gray-950/80 backdrop-blur-sm p-5">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${result.categoryColor} flex items-center justify-center flex-shrink-0`}>
                        <result.icon size={22} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-black text-white">{result.category}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${diffColor[result.difficulty]}`}>
                            {result.difficulty}
                          </span>
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-500/30 bg-green-500/10 text-green-400">
                            <CheckCircle size={10} /> {result.estimatedTime}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm truncate">{result.error}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CopyButton text={result.error} />
                        <button onClick={handleReset}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold transition-all">
                          <RefreshCw size={11} /> New
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step filter pills */}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setActiveStep(null)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${activeStep === null ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/8'}`}>
                      All Steps
                    </button>
                    {result.steps.map((s, i) => {
                      const cfg = sevCfg[s.severity]
                      return (
                        <button key={i} onClick={() => setActiveStep(activeStep === i ? null : i)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${activeStep === i ? `${cfg.border} ${cfg.bg} text-white` : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/8'}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          Step {s.step}: {cfg.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Solution steps */}
                  <div className="space-y-4">
                    {result.steps.map((step, i) => {
                      const cfg = sevCfg[step.severity]
                      const isActive = activeStep === null || activeStep === i
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: isActive ? 1 : 0.3, y: 0 }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-300`}
                          style={{ filter: isActive ? 'none' : 'grayscale(0.6)' }}>

                          {/* Step header */}
                          <div className="flex items-center gap-4 px-6 py-4 border-b border-white/8">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.num} flex items-center justify-center font-black text-white text-sm flex-shrink-0`}>
                              {step.step}
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{step.title}</h4>
                              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.dot.replace('bg-', 'text-')}`}>{cfg.label}</span>
                            </div>
                          </div>

                          <div className="p-6 space-y-5">
                            <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>

                            {/* Warning banner */}
                            {step.warning && (
                              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
                                <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                                <p className="text-yellow-300 text-sm">{step.warning}</p>
                              </div>
                            )}

                            {/* Action list */}
                            <div className="space-y-2">
                              {step.actions.map((action, j) => (
                                <motion.div key={j}
                                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: j * 0.06 + i * 0.1 }}
                                  className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
                                    action.startsWith('→')
                                      ? 'bg-black/40 border border-white/8 ml-4'
                                      : 'bg-white/[0.04] border border-white/8 hover:bg-white/[0.07]'
                                  }`}>
                                  {action.startsWith('→') ? (
                                    <span className="text-cyan-400 text-sm font-bold flex-shrink-0">›</span>
                                  ) : (
                                    <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${cfg.num} mt-0.5`}>
                                      {j + 1}
                                    </span>
                                  )}
                                  <p className={`text-sm leading-relaxed ${action.startsWith('→') ? 'text-gray-300 font-mono' : 'text-gray-300'}`}>
                                    {action.startsWith('→') ? action.slice(2) : action}
                                  </p>
                                  {(action.includes(':') && !action.startsWith('→')) && (
                                    <CopyButton text={action} />
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Footer CTA */}
                  <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/8 to-blue-500/8 backdrop-blur-sm p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-white mb-1">Still not fixed?</h4>
                        <p className="text-gray-400 text-sm">Our support team can walk you through it live.</p>
                      </div>
                      <div className="flex gap-3 flex-shrink-0">
                        <a href="/tutorials" className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all">
                          <BookOpen size={14} /> Tutorials
                        </a>
                        <a href="/contact" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                          style={{ background: 'linear-gradient(135deg,#3b82f6,#22d3ee)' }}>
                          <Headphones size={14} /> Get Help
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}