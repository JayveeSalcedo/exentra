import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  User, Edit3, Save, X, CheckCircle2, AlertTriangle,
  Camera, Trash2, Layers, Users, ClipboardList, BookOpen,
  KeyRound, Eye, EyeOff,
} from 'lucide-react'
import './TeacherProfile.css'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2MB, matches storage bucket limit
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const easeOut = [0.16, 1, 0.3, 1] as const

export default function TeacherProfile() {
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
    contactEmail: '',
    schoolId: user?.schoolId ?? '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const [stats, setStats] = useState({
    blocks: 0,
    students: 0,
    assessments: 0,
    materials: 0,
  })

  useEffect(() => {
    if (!user) return
    fetchProfile()
    fetchStats()
  }, [user])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, username, contact_email, school_id')
      .eq('id', user!.id)
      .single()
    if (data) {
      setForm(f => ({
        ...f,
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        username: data.username ?? '',
        contactEmail: data.contact_email ?? '',
        schoolId: data.school_id ?? '',
      }))
    }
  }

  const fetchStats = async () => {
    const { data: blocks } = await supabase
      .from('blocks')
      .select('id')
      .eq('teacher_id', user!.id)
      .eq('is_archived', false)

    const blockIds = (blocks ?? []).map(b => b.id)

    const [{ count: students }, { count: assessments }, { count: materials }] = await Promise.all([
      blockIds.length
        ? supabase.from('block_enrollments').select('id', { count: 'exact', head: true }).in('block_id', blockIds).eq('status', 'active')
        : Promise.resolve({ count: 0 }),
      blockIds.length
        ? supabase.from('assessments').select('id', { count: 'exact', head: true }).in('block_id', blockIds)
        : Promise.resolve({ count: 0 }),
      blockIds.length
        ? supabase.from('materials').select('id', { count: 'exact', head: true }).in('block_id', blockIds)
        : Promise.resolve({ count: 0 }),
    ])

    setStats({
      blocks: blockIds.length,
      students: students ?? 0,
      assessments: assessments ?? 0,
      materials: materials ?? 0,
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
    const newSchoolId = form.schoolId.trim()
    const schoolIdChanged = newSchoolId !== '' && newSchoolId !== user?.schoolId
    const wantsPasswordChange = form.newPassword.length > 0 || form.confirmPassword.length > 0

    if (newSchoolId === '') {
      showToast('School ID cannot be empty.', false)
      return
    }
    if (wantsPasswordChange) {
      if (form.newPassword.length < 8 || !/[A-Z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
        showToast('Password must be 8+ characters with an uppercase letter and a number.', false)
        return
      }
      if (form.newPassword !== form.confirmPassword) {
        showToast("Passwords don't match.", false)
        return
      }
    }

    setSaving(true)
    try {
      // Check School ID availability up front — no point sending a
      // confirmation email for an ID someone else already has.
      if (schoolIdChanged) {
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('school_id', newSchoolId)
          .neq('id', user!.id)
          .maybeSingle()
        if (taken) throw new Error('That School ID is already in use.')
      }

      // Auth-affecting changes go first — a failure here (e.g. weak password
      // per Supabase policy) shouldn't leave a half-applied save.
      const authUpdates: { email?: string; password?: string } = {}
      if (schoolIdChanged) authUpdates.email = `${newSchoolId}@psu.edu.ph`
      if (wantsPasswordChange) authUpdates.password = form.newPassword

      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await supabase.auth.updateUser(authUpdates)
        if (authErr) throw authErr
      }

      // Intentionally NOT writing school_id here even if it changed — until
      // the person confirms the email change from their inbox, auth.users.email
      // is still the OLD address. Writing school_id now would make login()
      // construct a login email that doesn't match yet, locking them out.
      // AuthContext syncs school_id automatically once confirmation lands
      // (see the USER_UPDATED handler there).
      const { error } = await supabase.from('profiles').update({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        username: form.username.trim(),
        contact_email: form.contactEmail.trim() || null,
      }).eq('id', user!.id)
      if (error) throw error

      await refreshProfile()
      setForm(f => ({ ...f, newPassword: '', confirmPassword: '' }))
      showToast(
        schoolIdChanged
          ? 'Profile updated! Check your inbox to confirm the School ID / email change — until then, keep logging in with your current School ID.'
          : 'Profile updated!'
      )
      setEditing(false)
    } catch (err: any) {
      showToast(err.message ?? 'Save failed', false)
    } finally {
      setSaving(false)
    }
  }

  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="tp-root">

      {/* ── Header card ── */}
      <motion.div className="tp-header"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
      >
        <div className="tp-header-top">
          {/* Avatar */}
          <div className="tp-avatar-wrap">
            <button
              type="button"
              className="tp-avatar tp-avatar-btn"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              title="Change profile picture"
            >
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="tp-avatar-img" />
                : <span className="tp-avatar-initials">{initials}</span>}
              <span className="tp-avatar-overlay">
                {uploadingAvatar ? <span className="tp-spin" /> : <Camera size={16} />}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="tp-avatar-input"
              onChange={handleAvatarChange}
            />
            {user?.avatarUrl && (
              <button
                type="button"
                className="tp-avatar-remove"
                onClick={handleAvatarRemove}
                disabled={uploadingAvatar}
                title="Remove profile picture"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>

          {/* Identity */}
          <div className="tp-header-info">
            <h1 className="tp-name">{form.firstName} {form.lastName}</h1>
            <p className="tp-sub">
              <span>@{form.username}</span>
              <span className="tp-dot">·</span>
              <span>{user?.schoolId}</span>
              <span className="tp-dot">·</span>
              <span className="tp-role-tag">Teacher</span>
            </p>
          </div>

          <button className="tp-edit-btn" onClick={() => setEditing(true)}>
            <Edit3 size={13} /> Edit
          </button>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="tp-stats-grid">
        {[
          { icon: <Layers size={16} color="#4FC3F7" />, val: stats.blocks, label: 'Blocks', color: '#4FC3F7' },
          { icon: <Users size={16} color="#FFB830" />, val: stats.students, label: 'Students', color: '#FFB830' },
          { icon: <ClipboardList size={16} color="#00D4AA" />, val: stats.assessments, label: 'Assessments', color: '#00D4AA' },
          { icon: <BookOpen size={16} color="#9B7ED4" />, val: stats.materials, label: 'Materials', color: '#9B7ED4' },
        ].map((s, i) => (
          <div key={i} className="tp-stat-card">
            <div className="tp-stat-icon" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>{s.icon}</div>
            <span className="tp-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="tp-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Account info ── */}
      <motion.div className="tp-info-card"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3, ease: easeOut }}
      >
        <h2 className="tp-section-title"><User size={14} /> Account Information</h2>
        <div className="tp-info-grid">
          {[
            { label: 'Login Email', val: `${user?.schoolId}@psu.edu.ph` },
            { label: 'Contact Email', val: form.contactEmail || '—' },
            { label: 'Role', val: 'Teacher' },
            { label: 'Blocks Handled', val: String(stats.blocks) },
          ].map((row, i) => (
            <div key={i} className="tp-info-row">
              <span className="tp-info-label">{row.label}</span>
              <span className="tp-info-val">{row.val}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Edit modal ── */}
      <AnimatePresence>
        {editing && (
          <motion.div className="tp-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditing(false)}
          >
            <motion.div className="tp-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: easeOut }}
              onClick={e => e.stopPropagation()}
            >
              <div className="tp-modal-header">
                <h2><Edit3 size={15} /> Edit Profile</h2>
                <button className="tp-modal-close" onClick={() => setEditing(false)}><X size={15} /></button>
              </div>

              <div className="tp-modal-body">
                <div className="tp-field-row">
                  <div className="tp-field">
                    <label>First Name</label>
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
                  </div>
                  <div className="tp-field">
                    <label>Last Name</label>
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
                  </div>
                </div>
                <div className="tp-field">
                  <label>Username</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" />
                </div>
                <div className="tp-field">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                    placeholder="Optional — for notifications, not login"
                  />
                </div>

                <div className="tp-modal-divider">
                  <KeyRound size={12} /> Login &amp; Security
                </div>

                <div className="tp-field">
                  <label>School ID (Login Email)</label>
                  <input
                    value={form.schoolId}
                    onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}
                    placeholder="e.g. 22as1000"
                  />
                  <span className="tp-field-hint">Logs in as {form.schoolId || '—'}@psu.edu.ph</span>
                </div>

                <div className="tp-field-row">
                  <div className="tp-field">
                    <label>New Password</label>
                    <div className="tp-pw-wrap">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={form.newPassword}
                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Leave blank to keep current"
                      />
                      <button type="button" className="tp-pw-toggle" onClick={() => setShowNewPw(v => !v)} tabIndex={-1}>
                        {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="tp-field">
                    <label>Confirm Password</label>
                    <div className="tp-pw-wrap">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                      />
                      <button type="button" className="tp-pw-toggle" onClick={() => setShowConfirmPw(v => !v)} tabIndex={-1}>
                        {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tp-modal-footer">
                <button className="tp-btn-cancel" onClick={() => setEditing(false)}><X size={13} /> Cancel</button>
                <button className="tp-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="tp-spin" /> : <Save size={13} />}
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
          <motion.div className={`tp-toast ${toast.ok ? 'ok' : 'err'}`}
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
