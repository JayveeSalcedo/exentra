// ─────────────────────────────────────────────────────────────────────────
// Lightweight sound-effects engine for Exentra.
// Every sound is synthesized on the fly with the Web Audio API — no .mp3/.wav
// asset files needed, so this works immediately with zero binary assets.
// Mute preference is persisted to localStorage so it holds across sessions.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

const MUTE_KEY = 'exentra_sfx_muted'

export function isSfxMuted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setSfxMuted(muted: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
}

/** React hook for a mute toggle button — persists across reloads. */
export function useSfxToggle() {
  const [muted, setMutedState] = useState<boolean>(() => isSfxMuted())

  useEffect(() => {
    setSfxMuted(muted)
    music.setMuted(muted)
  }, [muted])

  return { muted, toggle: () => setMutedState(m => !m) }
}

// ── Background music (public/music/quiz-bg.mp3) ────────────────────────────
// Single looping <audio> element, lazily created and reused across the
// lobby → quiz/file-submission flow so it survives phase changes without
// restarting from zero each time.
let musicEl: HTMLAudioElement | null = null

function getMusicEl(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!musicEl) {
    musicEl = new Audio('/music/quiz-bg.mp3')
    musicEl.loop = true
    musicEl.volume = 0.16
    musicEl.muted = isSfxMuted()
  }
  return musicEl
}

export const music = {
  /** Start (or resume) the loop. Call from a user-gesture handler (e.g. "Start Assessment"). */
  play: () => {
    const el = getMusicEl()
    if (!el) return
    el.muted = isSfxMuted()
    el.play().catch(() => {
      // Autoplay can still be blocked in rare cases — safe to ignore, SFX still works.
    })
  },
  /** Stop and rewind — use when the attempt ends (submit) or the page is left. */
  stop: () => {
    if (!musicEl) return
    musicEl.pause()
    musicEl.currentTime = 0
  },
  setMuted: (m: boolean) => {
    if (musicEl) musicEl.muted = m
  },
}

interface ToneOpts {
  type?: OscillatorType
  delay?: number
  volume?: number
  freqEnd?: number
}

function tone(freq: number, duration: number, opts: ToneOpts = {}) {
  if (isSfxMuted()) return
  const audioCtx = getCtx()
  if (!audioCtx) return

  const { type = 'sine', delay = 0, volume = 0.1, freqEnd } = opts
  const start = audioCtx.currentTime + delay

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), start + duration)

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(gain)
  gain.connect(audioCtx.destination)

  osc.start(start)
  osc.stop(start + duration + 0.03)
}

/** Named sound effects used across the assessment-taking flow. */
export const sfx = {
  /** Picking a choice in a quiz/exam. */
  select: () => tone(720, 0.07, { type: 'sine', volume: 0.08 }),
  /** Moving between questions (prev/next/dot nav). */
  nav: () => tone(480, 0.05, { type: 'sine', volume: 0.06 }),
  /** Tab-switch anti-cheat warning. */
  warning: () => {
    tone(320, 0.14, { type: 'square', volume: 0.08 })
    tone(260, 0.16, { type: 'square', volume: 0.08, delay: 0.15 })
  },
  /** Last-seconds timer tick. */
  tick: () => tone(880, 0.04, { type: 'sine', volume: 0.05 }),
  /** Submitting the assessment / turning in files. */
  submit: () => {
    tone(500, 0.09, { type: 'triangle', volume: 0.09 })
    tone(700, 0.09, { type: 'triangle', volume: 0.09, delay: 0.09 })
    tone(900, 0.14, { type: 'triangle', volume: 0.1, delay: 0.18 })
  },
  /** Passing result reveal (percentage >= 60). */
  success: () => {
    tone(523.25, 0.12, { type: 'triangle', volume: 0.1 }) // C5
    tone(659.25, 0.12, { type: 'triangle', volume: 0.1, delay: 0.11 }) // E5
    tone(783.99, 0.22, { type: 'triangle', volume: 0.11, delay: 0.22 }) // G5
  },
  /** Below-passing result reveal — soft, informational, not punishing. */
  needsWork: () => {
    tone(440, 0.18, { type: 'sine', volume: 0.08, freqEnd: 330 })
  },
  /** Picking up/arming something — a tool, a slot, a chip. */
  pick: () => tone(650, 0.05, { type: 'sine', volume: 0.07 }),
  /** Committing a move — swap, delete, insert, rotate. */
  place: () => tone(560, 0.07, { type: 'triangle', volume: 0.09 }),
  /** Undoing a move. */
  undo: () => tone(380, 0.09, { type: 'sine', volume: 0.07, freqEnd: 300 }),
  /** Using a hint. */
  hint: () => tone(760, 0.1, { type: 'sine', volume: 0.08 }),
  /** Grabbing a powerup / bonus. */
  powerup: () => {
    tone(600, 0.08, { type: 'triangle', volume: 0.1 })
    tone(900, 0.14, { type: 'triangle', volume: 0.1, delay: 0.08 })
  },
  /** Invalid/blocked action. */
  error: () => tone(220, 0.1, { type: 'square', volume: 0.06 }),
}
