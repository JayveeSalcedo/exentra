import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  ClipboardList, Clock, CheckCircle2, Lock,
  ChevronRight, Zap, BookOpen, AlertCircle, Trophy, Paperclip, XCircle
} from 'lucide-react'
import './StudentAssessments.css'

type Assessment = {
  id: string
  title: string
  description: string | null
  type: 'quiz' | 'activity' | 'assignment' | 'exam'
  total_points: number
  xp_reward: number
  time_limit: number | null
  due_date: string | null
  opens_at: string | null
  is_published: boolean
  created_at: string
  difficulty: string | null
  module_topic: string | null
  total_questions: number | null
  block_id: string | null
  submission?: {
    score: number | null
    percentage: number | null
    is_submitted: boolean
    submitted_at: string | null
  } | null
}

function isFileType(type: string) {
  return type === 'assignment' || type === 'activity'
}

function isMissed(a: Assessment): boolean {
  if (a.submission?.is_submitted) return false
  if (!a.due_date) return false
  return new Date(a.due_date) < new Date()
}

const TYPE_COLOR: Record<string, string> = {
  quiz:       '#9B7ED4',
  activity:   '#00D4AA',
  assignment: '#FFB830',
  exam:       '#FF6B8A',
}

const TYPE_LABEL: Record<string, string> = {
  quiz:       'Quiz',
  activity:   'Activity',
  assignment: 'Assignment',
  exam:       'Exam',
}

const DIFF_COLOR: Record<string, string> = {
  Easy:   '#00D4AA',
  Medium: '#FFB830',
  Hard:   '#FF6B8A',
  Mixed:  '#9B7ED4',
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Overdue'
  const days = Math.floor(diff / 86400000)
  const hrs  = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hrs}h left`
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hrs > 0) return `${hrs}h ${mins}m left`
  return `${mins}m left`
}

export default function StudentAssessments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<'all' | 'quiz' | 'activity' | 'assignment' | 'exam'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'missed'>('all')

  useEffect(() => {
    if (!user) return
    fetchAssessments()
  }, [user])

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const { data: myEnrollment } = await supabase
        .from('block_enrollments')
        .select('block_id')
        .eq('student_id', user!.id)
        .eq('status', 'active')
        .maybeSingle()

      const myBlockId = myEnrollment?.block_id ?? null

      let query = supabase
        .from('assessments')
        .select('*')
        .eq('is_published', true)

      query = myBlockId
        ? query.or(`block_id.is.null,block_id.eq.${myBlockId}`)
        : query.is('block_id', null)

      const { data: raw, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const { data: subs } = await supabase
        .from('submissions')
        .select('assessment_id, score, percentage, is_submitted, submitted_at')
        .eq('student_id', user!.id)

      const subMap = new Map(subs?.map(s => [s.assessment_id, s]) ?? [])

      const merged: Assessment[] = (raw ?? []).map(a => ({
        ...a,
        submission: subMap.get(a.id) ?? null,
      }))

      setAssessments(merged)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = assessments.filter(a => {
    const typeOk = filter === 'all' || a.type === filter
    const done   = !!a.submission?.is_submitted
    const missed = isMissed(a)

    const statusOk =
      statusFilter === 'all'     ? true :
      statusFilter === 'done'    ? done :
      statusFilter === 'missed'  ? missed :
      statusFilter === 'pending' ? (!done && !missed) : true

    return typeOk && statusOk
  })

  const stats = {
    total:    assessments.length,
    done:     assessments.filter(a => a.submission?.is_submitted).length,
    pending:  assessments.filter(a => !a.submission?.is_submitted && !isMissed(a)).length,
    missed:   assessments.filter(isMissed).length,
    avgScore: (() => {
      const scored = assessments.filter(a => a.submission?.percentage != null)
      if (!scored.length) return null
      return Math.round(scored.reduce((s, a) => s + (a.submission!.percentage ?? 0), 0) / scored.length)
    })(),
  }

  return (
    <div className="sa-root">
      {/* Header */}
      <motion.div className="sa-header" {...stagger(0)}>
        <div>
          <p className="sa-header-label">MY ASSESSMENTS</p>
          <h1 className="sa-header-title">Assessments</h1>
          <p className="sa-header-sub">Quizzes, activities, and assignments from your teacher</p>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div className="sa-stats" {...stagger(1)}>
        {[
          { label: 'Total',     value: stats.total,   icon: ClipboardList, color: '#9B7ED4' },
          { label: 'Pending',   value: stats.pending,  icon: Clock,         color: '#FFB830' },
          { label: 'Done',      value: stats.done,     icon: CheckCircle2,  color: '#00D4AA' },
          { label: 'Missed',    value: stats.missed,   icon: XCircle,       color: '#FF6B8A' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`sa-stat-card ${label === 'Missed' && stats.missed > 0 ? 'sa-stat-card--alert' : ''}`}
            style={label === 'Missed' && stats.missed > 0 ? { borderColor: `${color}40` } : {}}
          >
            <div className="sa-stat-icon" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <p className="sa-stat-value" style={label === 'Missed' && stats.missed > 0 ? { color } : {}}>{value}</p>
              <p className="sa-stat-label">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Missed banner — shown only when there are missed assessments */}
      {stats.missed > 0 && (
        <motion.div className="sa-missed-banner" {...stagger(2)}>
          <XCircle size={15} color="#FF6B8A" />
          <span>
            You have <strong>{stats.missed}</strong> missed assessment{stats.missed > 1 ? 's' : ''}.
            These are past their due date and were not submitted. Contact your teacher if needed.
          </span>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div className="sa-filters" {...stagger(stats.missed > 0 ? 3 : 2)}>
        <div className="sa-filter-group">
          {(['all', 'quiz', 'activity', 'assignment', 'exam'] as const).map(t => (
            <button
              key={t}
              className={`sa-filter-btn ${filter === t ? 'active' : ''}`}
              style={filter === t && t !== 'all' ? { borderColor: TYPE_COLOR[t], color: TYPE_COLOR[t] } : {}}
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? 'All Types' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="sa-filter-group">
          {([
            { key: 'all',     label: 'All Status' },
            { key: 'pending', label: 'Pending'    },
            { key: 'done',    label: 'Done'       },
            { key: 'missed',  label: `Missed${stats.missed > 0 ? ` (${stats.missed})` : ''}` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              className={`sa-filter-btn ${statusFilter === key ? 'active' : ''} ${key === 'missed' && stats.missed > 0 ? 'sa-filter-btn--missed' : ''}`}
              style={statusFilter === key && key === 'missed' ? { borderColor: '#FF6B8A', color: '#FF6B8A' } : {}}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="sa-loading">
          <span className="sa-spinner" />
          <p>Loading assessments…</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div className="sa-empty" {...stagger(4)}>
          <div className="sa-empty-icon">
            <ClipboardList size={32} color="var(--text-muted)" />
          </div>
          <p className="sa-empty-title">
            {assessments.length === 0 ? 'No assessments yet'
              : statusFilter === 'missed' ? 'No missed assessments'
              : 'No assessments match your filters'}
          </p>
          <p className="sa-empty-sub">
            {assessments.length === 0
              ? "Your teacher hasn't published any assessments yet. Check back later."
              : statusFilter === 'missed'
              ? "Great job! You haven't missed any assessments."
              : 'Try changing your filter options.'}
          </p>
        </motion.div>
      ) : (
        <div className="sa-list">
          <AnimatePresence>
            {filtered.map((a, i) => {
              const done         = !!a.submission?.is_submitted
              const missed       = isMissed(a)
              const isFile       = isFileType(a.type)
              const hasGrade     = done && !isFile && a.submission?.percentage != null
              const pendingGrade = done && isFile && (a.submission?.percentage == null || a.submission.percentage === 0)
              const typeColor    = TYPE_COLOR[a.type] ?? '#9B7ED4'
              const overdue      = a.due_date && !done && !missed && new Date(a.due_date) < new Date()
              const locked       = !!a.opens_at && new Date(a.opens_at) > new Date()

              return (
                <motion.div
                  key={a.id}
                  className={`sa-card ${done ? 'done' : ''} ${missed ? 'missed' : ''}`}
                  {...stagger(i + 4)}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => !locked && !missed && navigate(`/student/assessments/${a.id}`)}
                  style={{ cursor: locked || missed ? 'default' : 'pointer' }}
                >
                  {/* Left accent */}
                  <div className="sa-card-accent" style={{ background: missed ? '#FF6B8A' : typeColor }} />

                  {/* Main */}
                  <div className="sa-card-body">
                    <div className="sa-card-top">
                      <div className="sa-card-badges">
                        <span className="sa-type-badge" style={{ color: typeColor, borderColor: `${typeColor}35`, background: `${typeColor}10` }}>
                          {TYPE_LABEL[a.type]}
                        </span>
                        {a.difficulty && (
                          <span className="sa-diff-badge" style={{ color: DIFF_COLOR[a.difficulty] ?? '#9B7ED4' }}>
                            {a.difficulty}
                          </span>
                        )}
                        {a.module_topic && (
                          <span className="sa-module-badge">
                            <BookOpen size={10} /> {a.module_topic}
                          </span>
                        )}
                      </div>

                      {/* Status badge */}
                      {missed ? (
                        <span className="sa-status missed">
                          <XCircle size={12} /> Missed
                        </span>
                      ) : done && pendingGrade ? (
                        <span className="sa-status submitted">
                          <CheckCircle2 size={12} /> Submitted
                        </span>
                      ) : done ? (
                        <span className="sa-status done">
                          <CheckCircle2 size={12} /> Done
                        </span>
                      ) : locked ? (
                        <span className="sa-status locked">
                          <Lock size={12} /> Locked
                        </span>
                      ) : overdue ? (
                        <span className="sa-status overdue">
                          <AlertCircle size={12} /> Overdue
                        </span>
                      ) : (
                        <span className="sa-status pending">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </div>

                    <h3 className="sa-card-title">{a.title}</h3>
                    {a.description && <p className="sa-card-desc">{a.description}</p>}

                    <div className="sa-card-meta">
                      {a.total_questions && !isFile && (
                        <span><ClipboardList size={11} /> {a.total_questions} questions</span>
                      )}
                      {isFile && (
                        <span><Paperclip size={11} /> File submission</span>
                      )}
                      {a.time_limit && (
                        <span><Clock size={11} /> {a.time_limit} min</span>
                      )}
                      <span><Zap size={11} /> {a.xp_reward} XP</span>
                      {a.due_date && !done && !missed && (
                        <span style={{ color: overdue ? '#FF6B8A' : '#FFB830' }}>
                          <Clock size={11} /> {overdue ? 'Overdue' : timeLeft(a.due_date)}
                        </span>
                      )}
                      {a.due_date && (
                        <span style={{ color: missed ? '#FF6B8A' : undefined }}>
                          Due {formatDate(a.due_date)}
                        </span>
                      )}
                    </div>

                    {/* Missed notice */}
                    {missed && (
                      <div className="sa-missed-notice">
                        <XCircle size={11} color="#FF6B8A" />
                        Not submitted — deadline has passed. Contact your teacher if you need an extension.
                      </div>
                    )}

                    {/* Pending grade notice for file submissions */}
                    {pendingGrade && (
                      <div className="sa-pending-grade">
                        <Clock size={11} color="#FFB830" />
                        Submitted — awaiting grade from teacher
                      </div>
                    )}

                    {/* Score bar */}
                    {hasGrade && a.submission?.percentage != null && (
                      <div className="sa-score-bar-wrap">
                        <div className="sa-score-bar-track">
                          <motion.div
                            className="sa-score-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${a.submission.percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{
                              background: a.submission.percentage >= 75
                                ? 'linear-gradient(90deg,#00D4AA,#00A882)'
                                : a.submission.percentage >= 50
                                ? 'linear-gradient(90deg,#FFB830,#e0a020)'
                                : 'linear-gradient(90deg,#FF6B8A,#e0506a)',
                            }}
                          />
                        </div>
                        <span className="sa-score-label">
                          {a.submission.score ?? '?'} / {a.total_points} pts ({a.submission.percentage}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrow — hidden for missed */}
                  {!locked && !missed && (
                    <div className="sa-card-arrow">
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
