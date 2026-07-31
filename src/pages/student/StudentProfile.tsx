import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  User, Zap, Flame, Shield, Star, Edit3, Save, X,
  CheckCircle2, AlertTriangle, BookOpen, Trophy, Target, Layers
} from 'lucide-react'
import './StudentProfile.css'

const XP_PER_LEVEL = 500

function xpToNextLevel(xp: number, level: number) {
  const needed = level * XP_PER_LEVEL
  const current = xp - (level - 1) * XP_PER_LEVEL
  return { current: Math.max(0, current), needed, pct: Math.min(100, Math.round((Math.max(0, current) / needed) * 100)) }
}

const RANK_LABELS: Record<number, string> = {
  1: 'Novice', 2: 'Apprentice', 3: 'Explorer', 4: 'Coder',
  5: 'Analyst', 6: 'Architect', 7: 'Expert', 8: 'Master', 9: 'Legend', 10: 'Grandmaster',
}

const RANK_COLORS: Record<number, string> = {
  1: 'var(--text-secondary)', 2: '#00D4AA', 3: '#4FC3F7', 4: '#7C5CBF',
  5: '#FFB830', 6: '#FF6B8A', 7: '#00D4AA', 8: '#FFB830', 9: '#FF6B8A', 10: 'var(--text-primary)',
}

const easeOut = [0.16, 1, 0.3, 1] as const

export default function StudentProfile() {
  const { user } = useAuth()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    username: user?.username ?? '',
    yearCourse: '',
    bio: '',
  })

  const [stats, setStats] = useState({
    lessonsCompleted: 0,
    assessmentsTaken: 0,
    avgScore: 0,
    rank: 0,
  })

  const [blockName, setBlockName] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchProfile()
    fetchStats()
    fetchBlock()
  }, [user])

  const fetchBlock = async () => {
    const { data: enrollment } = await supabase
      .from('block_enrollments')
      .select('block_id')
      .eq('student_id', user!.id)
      .eq('status', 'active')
      .maybeSingle()

    if (enrollment?.block_id) {
      const { data: block } = await supabase
        .from('blocks')
        .select('name')
        .eq('id', enrollment.block_id)
        .single()
      setBlockName(block?.name ?? null)
    }
  }

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, username, year_course, bio')
      .eq('id', user!.id)
      .single()
    if (data) {
      setForm({
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        username: data.username ?? '',
        yearCourse: data.year_course ?? '',
        bio: data.bio ?? '',
      })
    }
  }

  const fetchStats = async () => {
    const [{ count: lessons }, { data: subs }, { data: rank }] = await Promise.all([
      supabase.from('student_progress').select('*', { count: 'exact', head: true })
        .eq('student_id', user!.id).eq('completed', true),
      supabase.from('submissions').select('score').eq('student_id', user!.id),
      supabase.from('profiles').select('id').order('xp', { ascending: false }),
    ])

    const scores = (subs ?? []).map((s: any) => s.score).filter((s: any) => s != null)
    const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
    const rankPos = rank ? rank.findIndex((r: any) => r.id === user!.id) + 1 : 0

    setStats({
      lessonsCompleted: lessons ?? 0,
      assessmentsTaken: subs?.length ?? 0,
      avgScore: avg,
      rank: rankPos,
    })
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        username: form.username.trim(),
        year_course: form.yearCourse.trim(),
        bio: form.bio.trim(),
      }).eq('id', user!.id)
      if (error) throw error
      showToast('Profile updated!')
      setEditing(false)
    } catch (err: any) {
      showToast(err.message ?? 'Save failed', false)
    } finally {
      setSaving(false)
    }
  }

  const level = user?.level ?? 1
  const xp = user?.xp ?? 0
  const streak = user?.streak ?? 0
  const { current: xpCurrent, needed: xpNeeded, pct: xpPct } = xpToNextLevel(xp, level)
  const rankLabel = RANK_LABELS[Math.min(level, 10)] ?? 'Legend'
  const rankColor = RANK_COLORS[Math.min(level, 10)] ?? 'var(--text-primary)'
  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="sp-root">

      {/* ── Hero card ── */}
      <motion.div className="sp-hero"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        {/* Ambient orbs */}
        <div className="sp-hero-orb sp-hero-orb-1" />
        <div className="sp-hero-orb sp-hero-orb-2" />

        <div className="sp-hero-inner">
          {/* Avatar */}
          <div className="sp-avatar-wrap">
            <div className="sp-avatar-ring" style={{ borderColor: rankColor }} />
            <div className="sp-avatar">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="sp-avatar-img" />
                : <span className="sp-avatar-initials">{initials}</span>}
            </div>
            <div className="sp-avatar-level" style={{ background: rankColor }}>
              {level}
            </div>
          </div>

          {/* Identity */}
          <div className="sp-hero-info">
            <div className="sp-hero-name-row">
              <h1 className="sp-hero-name">{form.firstName} {form.lastName}</h1>
              <span className="sp-rank-badge" style={{ color: rankColor, borderColor: rankColor }}>
                <Shield size={11} /> {rankLabel}
              </span>
            </div>
            <p className="sp-hero-id">
              <span className="sp-mono">@{form.username}</span>
              <span className="sp-dot">·</span>
              <span className="sp-mono">{user?.schoolId}</span>
              <span className="sp-dot">·</span>
              <span className="sp-mono" style={{ color: blockName ? undefined : 'var(--text-muted)' }}>
                {blockName ?? 'No section assigned'}
              </span>
            </p>
            {form.yearCourse && (
              <p className="sp-hero-course">{form.yearCourse}</p>
            )}
            {form.bio && (
              <p className="sp-hero-bio">"{form.bio}"</p>
            )}
          </div>

          {/* Edit button */}
          <button className="sp-edit-btn" onClick={() => setEditing(true)}>
            <Edit3 size={14} /> Edit Profile
          </button>
        </div>

        {/* XP bar */}
        <div className="sp-xp-section">
          <div className="sp-xp-labels">
            <span className="sp-xp-label"><Zap size={12} color="#FFB830" /> Level {level}</span>
            <span className="sp-xp-pts">{xpCurrent.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
            <span className="sp-xp-label">Level {level + 1}</span>
          </div>
          <div className="sp-xp-track">
            <motion.div className="sp-xp-fill"
              initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1.2, delay: 0.5, ease: easeOut }}
            />
            <span className="sp-xp-pct">{xpPct}%</span>
          </div>
          <p className="sp-xp-sub">{(xpNeeded - xpCurrent).toLocaleString()} XP to reach Level {level + 1}</p>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="sp-stats-grid">
        {[
          { icon: <Zap size={20} color="#FFB830" />, val: xp.toLocaleString(), label: 'Total XP', color: '#FFB830' },
          { icon: <Flame size={20} color="#FF6B8A" />, val: `${streak}d`, label: 'Streak', color: '#FF6B8A' },
          { icon: <BookOpen size={20} color="#00D4AA" />, val: stats.lessonsCompleted, label: 'Lessons Done', color: '#00D4AA' },
          { icon: <Target size={20} color="#7C5CBF" />, val: stats.assessmentsTaken, label: 'Assessments', color: '#7C5CBF' },
          { icon: <Star size={20} color="#FFB830" />, val: stats.avgScore ? `${stats.avgScore}%` : '—', label: 'Avg Score', color: '#FFB830' },
          { icon: <Trophy size={20} color="#00D4AA" />, val: stats.rank ? `#${stats.rank}` : '—', label: 'Leaderboard', color: '#00D4AA' },
        ].map((s, i) => (
          <motion.div key={i} className="sp-stat-card"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: easeOut }}
          >
            <div className="sp-stat-icon" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
              {s.icon}
            </div>
            <span className="sp-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="sp-stat-label">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Account info ── */}
      <motion.div className="sp-info-card"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35, ease: easeOut }}
      >
        <h2 className="sp-section-title"><User size={15} /> Account Information</h2>
        <div className="sp-info-grid">
          {[
            { label: 'School ID',    val: user?.schoolId },
            { label: 'Email',        val: `${user?.schoolId}@psu.edu.ph` },
            { label: 'Username',     val: `@${form.username}` },
            { label: 'Year & Course', val: form.yearCourse || '—' },
            { label: 'Block / Section', val: blockName ?? 'Not yet assigned' },
            { label: 'Role',         val: 'Student' },
            { label: 'Institution',  val: 'Pangasinan State University' },
          ].map((row, i) => (
            <div key={i} className="sp-info-row">
              <span className="sp-info-label">{row.label}</span>
              <span className="sp-info-val">{row.val}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Edit modal ── */}
      <AnimatePresence>
        {editing && (
          <motion.div className="sp-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditing(false)}
          >
            <motion.div className="sp-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: easeOut }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sp-modal-header">
                <h2><Edit3 size={16} /> Edit Profile</h2>
                <button className="sp-modal-close" onClick={() => setEditing(false)}><X size={16} /></button>
              </div>

              <div className="sp-modal-body">
                <div className="sp-field-row">
                  <div className="sp-field">
                    <label>First Name</label>
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
                  </div>
                  <div className="sp-field">
                    <label>Last Name</label>
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
                  </div>
                </div>
                <div className="sp-field">
                  <label>Username</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" />
                </div>
                <div className="sp-field">
                  <label>Year & Course</label>
                  <input value={form.yearCourse} onChange={e => setForm(f => ({ ...f, yearCourse: e.target.value }))} placeholder="e.g. 2nd Year — BSIT" />
                </div>
                <div className="sp-field">
                  <label>Bio <span className="sp-field-opt">(optional)</span></label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Say something about yourself…" rows={3} />
                </div>
              </div>

              <div className="sp-modal-footer">
                <button className="sp-btn-cancel" onClick={() => setEditing(false)}><X size={13} /> Cancel</button>
                <button className="sp-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="sp-spin" /> : <Save size={13} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className={`sp-toast ${toast.ok ? 'ok' : 'err'}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          >
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
