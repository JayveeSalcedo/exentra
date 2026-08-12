import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Sparkles, ClipboardList, Users, BarChart2, BookOpen, Layers,
  ArrowRight, FileWarning, Activity, TrendingUp, CheckCircle2, Inbox,
} from 'lucide-react'
import './TeacherDashboard.css'

const MODULES = [
  { topic: 'Arrays',             label: 'Arrays',          color: '#6C8EF5' },
  { topic: 'Linked Lists',       label: 'Linked Lists',    color: '#00D4AA' },
  { topic: 'Stacks',             label: 'Stacks',          color: '#FFB830' },
  { topic: 'Queues',             label: 'Queues',          color: '#FF6B8A' },
  { topic: 'Trees',              label: 'Trees',           color: '#4FC3F7' },
  { topic: 'Graphs',             label: 'Graphs',          color: '#81C784' },
  { topic: 'Sorting Algorithms', label: 'Sorting',         color: '#FFB830' },
  { topic: 'Hashing',            label: 'Hashing',         color: '#FF6B8A' },
]

const QUICK_ACTIONS = [
  {
    label: 'Generate AI Quiz',
    sub: 'Create assessments with Llama 3',
    icon: Sparkles,
    color: '#6C8EF5',
    to: '/teacher/assessments/generate',
    featured: true,
  },
  { label: 'Blocks',      sub: 'Manage sections & rosters',     icon: Layers,        color: '#4FC3F7', to: '/teacher/blocks' },
  { label: 'Assessments', sub: 'View & manage all assessments', icon: ClipboardList, color: '#00D4AA', to: '/teacher/assessments' },
  { label: 'Students',    sub: 'View student roster',           icon: Users,         color: '#FFB830', to: '/teacher/students' },
  { label: 'Progress',    sub: 'Class performance overview',    icon: BarChart2,     color: '#FF6B8A', to: '/teacher/progress' },
  { label: 'Materials',   sub: 'Manage DSA learning content',   icon: BookOpen,      color: '#4FC3F7', to: '/teacher/materials' },
]

interface SubRow {
  id: string
  student_id: string
  assessment_id: string
  percentage: number | null
  submitted_at: string | null
  assessmentTitle: string
  moduleTopic: string | null
  studentName: string
  studentAvatar: string | null
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
})

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [submissions, setSubmissions] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const { data: myBlocks } = await supabase
        .from('blocks')
        .select('id')
        .eq('teacher_id', user!.id)
        .eq('is_archived', false)

      const blockIds = (myBlocks ?? []).map(b => b.id)
      if (blockIds.length === 0) { setSubmissions([]); setLoading(false); return }

      const { data: myAssessments } = await supabase
        .from('assessments')
        .select('id, title, module_topic')
        .in('block_id', blockIds)

      const assessmentMap: Record<string, { title: string; module_topic: string | null }> = {}
      ;(myAssessments ?? []).forEach(a => { assessmentMap[a.id] = { title: a.title, module_topic: a.module_topic } })
      const assessmentIds = (myAssessments ?? []).map(a => a.id)
      if (assessmentIds.length === 0) { setSubmissions([]); setLoading(false); return }

      const { data: subs } = await supabase
        .from('submissions')
        .select('id, student_id, assessment_id, percentage, submitted_at')
        .in('assessment_id', assessmentIds)
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false })
        .limit(60)

      const studentIds = Array.from(new Set((subs ?? []).map(s => s.student_id)))
      const profileMap: Record<string, { first_name: string; last_name: string; avatar_url: string | null }> = {}
      if (studentIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', studentIds)
        ;(profiles ?? []).forEach(p => { profileMap[p.id] = p })
      }

      setSubmissions((subs ?? []).map(s => ({
        id: s.id,
        student_id: s.student_id,
        assessment_id: s.assessment_id,
        percentage: s.percentage,
        submitted_at: s.submitted_at,
        assessmentTitle: assessmentMap[s.assessment_id]?.title ?? 'Assessment',
        moduleTopic: assessmentMap[s.assessment_id]?.module_topic ?? null,
        studentName: profileMap[s.student_id]
          ? `${profileMap[s.student_id].first_name} ${profileMap[s.student_id].last_name}`
          : 'Student',
        studentAvatar: profileMap[s.student_id]?.avatar_url ?? null,
      })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const gradedSubs  = useMemo(() => submissions.filter(s => s.percentage != null), [submissions])
  const pendingSubs = useMemo(() => submissions.filter(s => s.percentage == null), [submissions])
  const recentSubs  = useMemo(() => submissions.slice(0, 5), [submissions])

  const topicStats = useMemo(() => {
    const map: Record<string, number[]> = {}
    gradedSubs.forEach(s => {
      if (!s.moduleTopic) return
      if (!map[s.moduleTopic]) map[s.moduleTopic] = []
      map[s.moduleTopic].push(s.percentage as number)
    })
    return MODULES
      .map(m => {
        const scores = map[m.topic]
        return scores
          ? { ...m, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }
          : null
      })
      .filter((m): m is typeof MODULES[number] & { avg: number; count: number } => m != null)
  }, [gradedSubs])

  return (
    <div className="td-root">
      {/* Welcome */}
      <motion.div className="td-welcome" {...stagger(0)}>
        <p className="td-welcome-label">Welcome back</p>
        <h1 className="td-welcome-title">{user?.firstName} {user?.lastName} </h1>
        <p className="td-welcome-sub">Manage your DSA class, generate AI-powered assessments, and track student progress.</p>
      </motion.div>

      {/* Quick actions */}
      <motion.div {...stagger(1)}>
        <p className="td-section-label">Quick Actions</p>
        <div className="td-actions-grid">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.button
              key={action.to}
              className={`td-action-tile ${action.featured ? 'featured' : ''}`}
              onClick={() => navigate(action.to)}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -3 }}
              {...stagger(i + 2)}
            >
              <div className="td-action-icon" style={{ background: `${action.color}18`, border: `1px solid ${action.color}30` }}>
                <action.icon size={19} color={action.color} />
              </div>
              <div className="td-action-text">
                <span className="td-action-label">
                  {action.label}
                  {action.featured && <span className="td-ai-badge">AI</span>}
                </span>
                <span className="td-action-sub">{action.sub}</span>
              </div>
              <ArrowRight size={15} className="td-action-arrow" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* At-a-glance widgets */}
      <div className="td-widgets-grid">
        {/* Class performance */}
        <motion.div className="td-widget" {...stagger(8)}>
          <div className="td-widget-header">
            <h3 className="td-widget-title"><TrendingUp size={14} /> Class Performance</h3>
            <button className="td-widget-link" onClick={() => navigate('/teacher/progress')}>
              View all <ArrowRight size={11} />
            </button>
          </div>

          {loading ? (
            <p className="td-widget-loading">Loading…</p>
          ) : topicStats.length === 0 ? (
            <div className="td-widget-empty">
              <BarChart2 size={22} color="var(--text-muted)" />
              <p>No graded submissions yet</p>
            </div>
          ) : (
            <div className="td-perf-list">
              {topicStats.slice(0, 5).map((m, i) => {
                const scoreColor = m.avg >= 80 ? '#00D4AA' : m.avg >= 60 ? '#FFB830' : '#FF6B8A'
                return (
                  <div key={m.topic} className="td-perf-row">
                    <span className="td-perf-label">{m.label}</span>
                    <div className="td-perf-bar-track">
                      <motion.div
                        className="td-perf-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${m.avg}%` }}
                        transition={{ duration: 0.7, delay: 0.15 + i * 0.05 }}
                        style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)` }}
                      />
                    </div>
                    <span className="td-perf-pct" style={{ color: scoreColor }}>{m.avg}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Pending grading */}
        <motion.div className="td-widget" {...stagger(9)}>
          <div className="td-widget-header">
            <h3 className="td-widget-title"><FileWarning size={14} /> Pending Grading</h3>
            <button className="td-widget-link" onClick={() => navigate('/teacher/assessments')}>
              View all <ArrowRight size={11} />
            </button>
          </div>

          {loading ? (
            <p className="td-widget-loading">Loading…</p>
          ) : pendingSubs.length === 0 ? (
            <div className="td-widget-empty">
              <CheckCircle2 size={22} color="#00D4AA" />
              <p>All caught up — nothing to grade</p>
            </div>
          ) : (
            <div className="td-list">
              <p className="td-widget-count">
                <span style={{ color: '#FFB830' }}>{pendingSubs.length}</span> submission{pendingSubs.length !== 1 ? 's' : ''} awaiting grading
              </p>
              {pendingSubs.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  className="td-list-row"
                  onClick={() => navigate(`/teacher/assessments?open=${s.assessment_id}`)}
                >
                  <span className="td-list-avatar">{s.studentAvatar ? <img src={s.studentAvatar} alt="avatar" className="td-list-avatar-img" /> : s.studentName[0]}</span>
                  <div className="td-list-text">
                    <span className="td-list-name">{s.studentName}</span>
                    <span className="td-list-sub">{s.assessmentTitle}</span>
                  </div>
                  <span className="td-list-time">{timeAgo(s.submitted_at)}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div className="td-widget" {...stagger(10)}>
          <div className="td-widget-header">
            <h3 className="td-widget-title"><Activity size={14} /> Recent Activity</h3>
          </div>

          {loading ? (
            <p className="td-widget-loading">Loading…</p>
          ) : recentSubs.length === 0 ? (
            <div className="td-widget-empty">
              <Inbox size={22} color="var(--text-muted)" />
              <p>No recent submissions</p>
            </div>
          ) : (
            <div className="td-list">
              {recentSubs.map(s => {
                const scoreColor = s.percentage == null ? 'var(--text-muted)' : s.percentage >= 80 ? '#00D4AA' : s.percentage >= 60 ? '#FFB830' : '#FF6B8A'
                return (
                  <button
                    key={s.id}
                    className="td-list-row"
                    onClick={() => navigate(`/teacher/assessments?open=${s.assessment_id}`)}
                  >
                    <span className="td-list-avatar">{s.studentAvatar ? <img src={s.studentAvatar} alt="avatar" className="td-list-avatar-img" /> : s.studentName[0]}</span>
                    <div className="td-list-text">
                      <span className="td-list-name">{s.studentName}</span>
                      <span className="td-list-sub">submitted {s.assessmentTitle}</span>
                    </div>
                    <span className="td-list-score" style={{ color: scoreColor }}>
                      {s.percentage != null ? `${s.percentage}%` : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
