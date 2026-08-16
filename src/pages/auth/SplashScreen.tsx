import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

const LOADING_MESSAGES = [
  'Initializing DSA Engine...',
  'Loading your progress...',
  'Preparing challenges...',
  'Summoning Algie...',
  'Almost there...',
]

export default function SplashScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [msgIndex, setMsgIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Cycle loading messages
    const msgInterval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 600)

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return p + 2
      })
    }, 60)

    // Done after ~3.2s
    const doneTimer = setTimeout(() => {
      setDone(true)
    }, 3000)

    // Navigate after exit animation
    const navTimer = setTimeout(() => {
      if (user) {
        navigate(`/${user.role}/dashboard`)
      } else {
        navigate('/login')
      }
    }, 3600)

    return () => {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
      clearTimeout(doneTimer)
      clearTimeout(navTimer)
    }
  }, [navigate])

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          key="splash"
          className="splash-root"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Background */}
          <div className="splash-bg">
            <div className="splash-orb splash-orb-1" />
            <div className="splash-orb splash-orb-2" />
            <div className="splash-orb splash-orb-3" />
            <div className="splash-grid" />
          </div>

          {/* Particles */}
          <div className="splash-particles">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                }}
              />
            ))}
          </div>

          <div className="splash-content">
            {/* Logo + name */}
            <motion.div
              className="splash-brand"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.div
                className="splash-logo-ring"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <div className="splash-logo-inner" />
              </motion.div>
              <div className="splash-title-wrap">
                <h1 className="splash-title">EXENTRA</h1>
                <p className="splash-subtitle">DSA LEARNING SYSTEM</p>
              </div>
            </motion.div>

            {/* Algie */}
            <motion.div
              className="splash-mascot"
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7, type: 'spring', stiffness: 100, damping: 12 }}
            >
              <motion.img
                src="/mascot.png"
                alt="Algie"
                className="splash-mascot-img"
                animate={{
                  y: [0, -14, 0, -7, 0],
                  rotate: [-1.5, 1.5, -1.5, 0.5, -1.5],
                  scale: [1, 1.04, 1, 1.02, 1],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Glow under mascot */}
              <div className="mascot-glow" />
            </motion.div>

            {/* Loading bar + message */}
            <motion.div
              className="splash-loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  className="splash-msg"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {LOADING_MESSAGES[msgIndex]}
                </motion.p>
              </AnimatePresence>

              <div className="splash-bar-track">
                <motion.div
                  className="splash-bar-fill"
                  style={{ width: `${progress}%` }}
                />
                <div className="splash-bar-glow" style={{ left: `${progress}%` }} />
              </div>

              <p className="splash-percent">{progress}%</p>
            </motion.div>

            {/* School */}
            <motion.p
              className="splash-school"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              Pangasinan State University · IT Department
            </motion.p>
          </div>

          <style>{`
            .splash-root {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--bg-base);
              overflow: hidden;
            }
            .splash-bg {
              position: absolute;
              inset: 0;
              pointer-events: none;
            }
            .splash-orb {
              position: absolute;
              border-radius: 50%;
              filter: blur(90px);
            }
            .splash-orb-1 {
              width: 600px; height: 600px;
              background: radial-gradient(circle, rgba(59,91,219,0.25), transparent);
              top: -200px; left: -150px;
            }
            .splash-orb-2 {
              width: 500px; height: 500px;
              background: radial-gradient(circle, rgba(0,212,170,0.2), transparent);
              bottom: -150px; right: -100px;
            }
            .splash-orb-3 {
              width: 300px; height: 300px;
              background: radial-gradient(circle, rgba(59,91,219,0.15), transparent);
              bottom: 100px; left: 30%;
            }
            /* Light mode: same institution-colorway (royal blue / gold) orbs, much
               softer so they read as a warm glow on cream instead of murky haze. */
            :root.light-mode .splash-orb-1 {
              background: radial-gradient(circle, rgba(42,74,196,0.12), transparent);
            }
            :root.light-mode .splash-orb-2 {
              background: radial-gradient(circle, rgba(14,143,114,0.10), transparent);
            }
            :root.light-mode .splash-orb-3 {
              background: radial-gradient(circle, rgba(184,134,11,0.08), transparent);
            }
            .splash-grid {
              position: absolute;
              inset: 0;
              background-image:
                linear-gradient(rgba(99,179,237,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99,179,237,0.03) 1px, transparent 1px);
              background-size: 40px 40px;
            }
            :root.light-mode .splash-grid {
              background-image:
                linear-gradient(rgba(42,74,196,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(42,74,196,0.05) 1px, transparent 1px);
            }
            /* Particles */
            .splash-particles {
              position: absolute;
              inset: 0;
              pointer-events: none;
            }
            .particle {
              position: absolute;
              background: var(--cyan, #00D4AA);
              border-radius: 50%;
              opacity: 0;
              animation: particleFade ease-in-out infinite;
            }
            :root.light-mode .particle {
              background: var(--accent, #2A4AC4);
              animation-name: particleFadeLight;
            }
            @keyframes particleFade {
              0%, 100% { opacity: 0; transform: translateY(0) scale(1); }
              50% { opacity: 0.4; transform: translateY(-20px) scale(1.5); }
            }
            @keyframes particleFadeLight {
              0%, 100% { opacity: 0; transform: translateY(0) scale(1); }
              50% { opacity: 0.28; transform: translateY(-20px) scale(1.5); }
            }
            /* Content */
            .splash-content {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
            }
            /* Brand */
            .splash-brand {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
              margin-bottom: 8px;
            }
            .splash-logo-ring {
              width: 72px; height: 72px;
              border-radius: 50%;
              border: 2px solid transparent;
              border-top-color: #00D4AA;
              border-right-color: rgba(59,91,219,0.5);
              display: flex; align-items: center; justify-content: center;
            }
            :root.light-mode .splash-logo-ring {
              border-top-color: var(--accent, #2A4AC4);
              border-right-color: rgba(184,134,11,0.5);
            }
            .splash-logo-inner {
              width: 52px; height: 52px;
              border-radius: 50%;
              background: linear-gradient(135deg, rgba(0,212,170,0.15), rgba(59,91,219,0.15));
              border: 1px solid rgba(0,212,170,0.2);
            }
            :root.light-mode .splash-logo-inner {
              background: linear-gradient(135deg, rgba(42,74,196,0.10), rgba(184,134,11,0.12));
              border: 1px solid rgba(42,74,196,0.18);
            }
            .splash-title-wrap {
              text-align: center;
            }
            .splash-title {
              font-family: 'Orbitron', monospace;
              font-size: 42px;
              font-weight: 900;
              letter-spacing: 8px;
              background: linear-gradient(135deg, #fff 30%, #00D4AA);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              line-height: 1;
            }
            /* Light mode: dark institution-navy fading into royal blue, since a
               white-to-teal gradient disappears against the cream surface. */
            :root.light-mode .splash-title {
              background: linear-gradient(135deg, #23201A 25%, var(--accent, #2A4AC4));
              -webkit-background-clip: text;
              background-clip: text;
            }
            .splash-subtitle {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              letter-spacing: 4px;
              color: #00D4AA;
              opacity: 0.7;
              margin-top: 6px;
            }
            :root.light-mode .splash-subtitle {
              color: var(--accent, #2A4AC4);
              opacity: 0.85;
            }
            /* Mascot */
            .splash-mascot {
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .splash-mascot-img {
              width: 260px;
              height: auto;
              position: relative;
              z-index: 1;
              filter: drop-shadow(0 10px 22px rgba(0,0,0,0.35));
            }
            :root.light-mode .splash-mascot-img {
              filter: drop-shadow(0 10px 20px rgba(40,30,10,0.18));
            }
            .mascot-glow {
              position: absolute;
              bottom: 10px;
              left: 50%;
              transform: translateX(-50%);
              width: 160px; height: 30px;
              background: radial-gradient(ellipse, rgba(0,212,170,0.3), transparent);
              filter: blur(10px);
              border-radius: 50%;
            }
            :root.light-mode .mascot-glow {
              background: radial-gradient(ellipse, rgba(184,134,11,0.28), transparent);
            }
            /* Loading */
            .splash-loading {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
              width: 300px;
            }
            .splash-msg {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              color: var(--text-secondary);
              letter-spacing: 0.5px;
              height: 18px;
            }
            .splash-bar-track {
              width: 100%;
              height: 4px;
              background: var(--surface-06);
              border-radius: 999px;
              overflow: visible;
              position: relative;
            }
            .splash-bar-fill {
              height: 100%;
              background: linear-gradient(90deg, #3B5BDB, #00D4AA);
              border-radius: 999px;
              transition: width 0.1s linear;
            }
            :root.light-mode .splash-bar-fill {
              background: linear-gradient(90deg, var(--accent, #2A4AC4), var(--xp, #B8860B));
            }
            .splash-bar-glow {
              position: absolute;
              top: 50%;
              transform: translate(-50%, -50%);
              width: 12px; height: 12px;
              background: #00D4AA;
              border-radius: 50%;
              filter: blur(4px);
              opacity: 0.8;
              transition: left 0.1s linear;
            }
            :root.light-mode .splash-bar-glow {
              background: var(--xp, #B8860B);
            }
            .splash-percent {
              font-family: 'Orbitron', monospace;
              font-size: 11px;
              color: #00D4AA;
              opacity: 0.7;
            }
            :root.light-mode .splash-percent {
              color: var(--accent, #2A4AC4);
              opacity: 0.85;
            }
            /* School */
            .splash-school {
              font-size: 11px;
              color: var(--text-muted);
              letter-spacing: 0.5px;
              margin-top: 8px;
            }
          `}</style>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
