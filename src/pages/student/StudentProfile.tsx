import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  User, Zap, Flame, Edit3, Save, X,
  CheckCircle2, AlertTriangle, BookOpen, Target, Camera, Trash2
} from 'lucide-react'
import './StudentProfile.css'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2MB, matches storage bucket limit
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const XP_PER_LEVEL = 500

function xpToNextLevel(xp: number, level: number) {
  const needed = level * XP_PER_LEVEL
  const current = xp - (level - 1) * XP_PER_LEVEL
  return { current: Math.max(0, current), needed, pct: Math.min(100, Math.round((Math.max(0, current) / needed) * 100)) }
}

const easeOut = [0.16, 1, 0.3, 1] as const

export default function StudentProfile() {
  const { user, refreshProfile } = useAuth()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    username: user?.username ?? '',
    yearCourse: '',
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
      .select('first_name, last_name, username, year_course')
      .eq('id', user!.id)
      .single()
    if (data) {
      setForm({
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        username: data.username ?? '',
        yearCourse: data.year_course ?? '',
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

  const handleAvatarClick = () => {
    if (uploadingAvatar) return
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file || !user) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      showToast('Use a JPG, PNG, WEBP, or GIF image.', false)
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast('Image must be under 2MB.', false)
      return
    }

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}` // bust CDN cache on same filename

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
      if (dbErr) throw dbErr

      await refreshProfile()
      showToast('Profile picture updated!')
    } catch (err: any) {
      showToast(err.message ?? 'Upload failed', false)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarRemove = async () => {
    if (!user || uploadingAvatar) return
    setUploadingAvatar(true)
    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      if (dbErr) throw dbErr

      await refreshProfile()
      showToast('Profile picture removed.')
    } catch (err: any) {
      showToast(err.message ?? 'Remove failed', false)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        username: form.username.trim(),
        year_course: form.yearCourse.trim(),
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
  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="sp-root">

      {/* ── Header card ── */}
      <motion.div className="sp-header"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
      >
        <div className="sp-header-top">
          {/* Avatar */}
          <div className="sp-avatar-wrap">
            <button
              type="button"
              className="sp-avatar sp-avatar-btn"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              title="Change profile picture"
            >
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="sp-avatar-img" />
                : <span className="sp-avatar-initials">{initials}</span>}
              <span className="sp-avatar-overlay">
                {uploadingAvatar ? <span className="sp-spin" /> : <Camera size={16} />}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sp-avatar-input"
              onChange={handleAvatarChange}
            />
            {user?.avatarUrl && (
              <button
                type="button"
                className="sp-avatar-remove"
                onClick={handleAvatarRemove}
                disabled={uploadingAvatar}
                title="Remove profile picture"
              >
                <Trash2 size={11} />
              </button>
            )}
            <div className="sp-avatar-level">Lv {level}</div>
          </div>

          {/* Identity */}
          <div className="sp-header-info">
            <h1 className="sp-name">{form.firstName} {form.lastName}</h1>
            <p className="sp-sub">
              <span>@{form.username}</span>
              <span className="sp-dot">·</span>
              <span>{user?.schoolId}</span>
              <span className="sp-dot">·</span>
              <span className={blockName ? '' : 'sp-muted'}>{blockName ?? 'No section assigned'}</span>
            </p>
            {form.yearCourse && <p className="sp-course">{form.yearCourse}</p>}
          </div>

          <button className="sp-edit-btn" onClick={() => setEditing(true)}>
            <Edit3 size={13} /> Edit
          </button>
        </div>

        {/* XP bar */}
        <div className="sp-xp">
          <div className="sp-xp-track">
            <motion.div className="sp-xp-fill"
              initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: easeOut }}
            />
          </div>
          <span className="sp-xp-text">{xpCurrent.toLocaleString()} / {xpNeeded.toLocaleString()} XP to Level {level + 1}</span>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="sp-stats-grid">
        {[
          { icon: <Zap size={16} color="#FFB830" />, val: xp.toLocaleString(), label: 'Total XP', color: '#FFB830' },
          { icon: <Flame size={16} color="#FF6B8A" />, val: `${streak}d`, label: 'Streak', color: '#FF6B8A' },
          { icon: <BookOpen size={16} color="#00D4AA" />, val: stats.lessonsCompleted, label: 'Lessons', color: '#00D4AA' },
          { icon: <Target size={16} color="#9B7ED4" />, val: stats.assessmentsTaken, label: 'Assessments', color: '#9B7ED4' },
        ].map((s, i) => (
          <div key={i} className="sp-stat-card">
            <div className="sp-stat-icon" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>{s.icon}</div>
            <span className="sp-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="sp-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Account info ── */}
      <motion.div className="sp-info-card"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3, ease: easeOut }}
      >
        <h2 className="sp-section-title"><User size={14} /> Account Information</h2>
        <div className="sp-info-grid">
          {[
            { label: 'Email', val: `${user?.schoolId}@psu.edu.ph` },
            { label: 'Year & Course', val: form.yearCourse || '—' },
            { label: 'Block / Section', val: blockName ?? 'Not yet assigned' },
            { label: 'Average Score', val: stats.avgScore ? `${stats.avgScore}%` : '—' },
            { label: 'Leaderboard Rank', val: stats.rank ? `#${stats.rank}` : '—' },
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
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: easeOut }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sp-modal-header">
                <h2><Edit3 size={15} /> Edit Profile</h2>
                <button className="sp-modal-close" onClick={() => setEditing(false)}><X size={15} /></button>
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
