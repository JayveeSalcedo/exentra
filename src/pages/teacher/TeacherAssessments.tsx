import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Sparkles, ClipboardList, Eye, EyeOff, Trash2,
  ChevronDown, ChevronUp, CheckCircle2, Clock,
  BookOpen, Zap, AlertTriangle, Plus, RefreshCw,
  Users, BarChart2, UserCheck, Award, XCircle,
  Paperclip, FileText, Download, Save, Upload, X, Loader2, ArrowLeft, Layers
} from 'lucide-react'
import './TeacherAssessments.css'

type Choice = {
  id: string
  choice_text: string
  is_correct: boolean
  order_index: number
}

type Question = {
  id: string
  order_index: number
  question_text: string
  question_type: string
  points: number
  explanation: string | null
  choices: Choice[]
}

type FileSubmission = {
  id: string
  file_url: string
  file_name: string
  file_type: string | null
  uploaded_at: string
}

type Submission = {
  id: string
  student_id: string
  score: number | null
  percentage: number | null
  is_submitted: boolean
  studentName?: string
  studentUsername?: string
  fileSubmissions?: FileSubmission[]
  gradingScore?: string
  gradingSaving?: boolean
  gradingSaved?: boolean
}

type Assessment = {
  id: string
  title: string
  description: string | null
  type: string
  total_points: number
  xp_reward: number
  time_limit: number | null
  due_date: string | null
  is_published: boolean
  created_at: string
  difficulty: string | null
  module_topic: string | null
  total_questions: number | null
  block_id: string | null
  questions?: Question[]
  submissions?: Submission[]
  expanded?: boolean
  activeTab?: 'questions' | 'students'
}

interface PreviewState {
  file: FileSubmission
  url: string
  studentName: string
}

type Target = { id: string | null; name: string } // id null = "All Students"

const TYPE_COLOR: Record<string, string> = {
  quiz: '#6C8EF5', activity: '#00D4AA', assignment: '#FFB830', exam: '#FF6B8A',
}
const DIFF_COLOR: Record<string, string> = {
  Easy: '#00D4AA', Medium: '#FFB830', Hard: '#FF6B8A', Mixed: '#6C8EF5',
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] as const },
})

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function ScoreBadge({ percentage }: { percentage: number | null }) {
  if (percentage == null) return <span className="ta2-score-pending">—</span>
  const color = percentage >= 75 ? '#00D4AA' : percentage >= 50 ? '#FFB830' : '#FF6B8A'
  return (
    <span className="ta2-score-badge" style={{ color, borderColor: `${color}35`, background: `${color}10` }}>
      {percentage}%
    </span>
  )
}

function fileEmoji(type: string | null) {
  if (!type) return '📁'
  if (type.includes('pdf')) return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('image')) return '🖼️'
  if (type.includes('presentation') || type.includes('powerpoint')) return '📊'
  return '📁'
}

function fileIcon(type: string | null) {
  if (!type) return <FileText size={13} color="var(--text-secondary)" />
  if (type.startsWith('image/')) return <FileText size={13} color="#00D4AA" />
  if (type === 'application/pdf') return <FileText size={13} color="#FF6B8A" />
  if (type.includes('word')) return <FileText size={13} color="#6C8EF5" />
  if (type.includes('presentation') || type.includes('powerpoint')) return <FileText size={13} color="#FFB830" />
  return <FileText size={13} color="var(--text-secondary)" />
}

async function getSignedUrl(file: FileSubmission): Promise<string> {
  const urlObj = new URL(file.file_url)
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public\/)?submissions\/(.+)/)
  const storagePath = pathMatch ? decodeURIComponent(pathMatch[1]) : null
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from('submissions')
      .createSignedUrl(storagePath, 3600)
    if (!error && data?.signedUrl) return data.signedUrl
  }
  return file.file_url
}

function renderPreviewContent(p: PreviewState) {
  const { file, url } = p
  const type = file.file_type ?? ''
  const name = file.file_name.toLowerCase()

  if (type.includes('image')) {
    return <img src={url} alt={file.file_name} className="ta2-preview-img" />
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return <iframe src={url} className="ta2-preview-iframe" title={file.file_name} />
  }
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
  return <iframe src={viewerUrl} className="ta2-preview-iframe" title={file.file_name} />
}

export default function TeacherAssessments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('open')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading]         = useState(true)
  const [myBlocks, setMyBlocks]       = useState<{ id: string; name: string }[]>([])
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [filter, setFilter]           = useState<'all' | 'published' | 'draft'>('all')
  const [toggling, setToggling]       = useState<string | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loadingProfiles, setLoadingProfiles] = useState<string | null>(null)
  const [preview, setPreview]         = useState<PreviewState | null>(null)
  const [previewing, setPreviewing]   = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => { if (user) fetchAssessments() }, [user])

  useEffect(() => {
    if (!user) return
    supabase
      .from('blocks')
      .select('id, name')
      .eq('teacher_id', user.id)
      .eq('is_archived', false)
      .order('name')
      .then(({ data }) => setMyBlocks(data ?? []))
  }, [user])

  // Deep link from a notification (?open=<assessment_id>) — jump straight into
  // the block that assessment belongs to, expand it on the Students tab, and
  // scroll it into view.
  useEffect(() => {
    if (!openId || loading || !assessments.length) return
    const target = assessments.find(a => a.id === openId)
    if (!target) return

    const blockMatch = myBlocks.find(b => b.id === target.block_id)
    setSelectedTarget({ id: target.block_id ?? null, name: blockMatch ? blockMatch.name : 'All Students' })

    setAssessments(prev =>
      prev.map(a => {
        if (a.id !== openId) return a
        if (a.submissions?.length) {
          loadStudentProfiles(a.id, a.submissions, a.type === 'assignment' || a.type === 'activity')
        }
        return { ...a, expanded: true, activeTab: 'students' }
      })
    )

    setHighlightId(openId)
    setTimeout(() => {
      cardRefs.current[openId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    setTimeout(() => setHighlightId(null), 2500)

    // Clear the param so refreshing/filtering doesn't keep re-triggering it
    searchParams.delete('open')
    setSearchParams(searchParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading, assessments.length, myBlocks.length])

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          questions(*, choices(*)),
          submissions(id, student_id, score, percentage, is_submitted)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssessments((data ?? []).map(a => ({ ...a, expanded: false, activeTab: 'questions' })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadStudentProfiles = async (assessmentId: string, submissions: Submission[], isFileSubmission: boolean) => {
    const unresolved = submissions.filter(s => !s.studentName)
    if (!unresolved.length) return

    setLoadingProfiles(assessmentId)
    try {
      const ids = unresolved.map(s => s.student_id)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username')
        .in('id', ids)
      if (error) throw error

      const profileMap: Record<string, { first_name: string; last_name: string; username: string }> = {}
      ;(data ?? []).forEach(p => { profileMap[p.id] = p })

      let fileMap: Record<string, FileSubmission[]> = {}
      if (isFileSubmission) {
        const subIds = submissions.map(s => s.id)
        const { data: fileSubs } = await supabase
          .from('file_submissions')
          .select('id, submission_id, file_url, file_name, file_type, uploaded_at')
          .in('submission_id', subIds)

        ;(fileSubs ?? []).forEach((f: any) => {
          if (!fileMap[f.submission_id]) fileMap[f.submission_id] = []
          fileMap[f.submission_id].push(f)
        })
      }

      setAssessments(prev =>
        prev.map(a => {
          if (a.id !== assessmentId) return a
          return {
            ...a,
            submissions: (a.submissions ?? []).map(s => ({
              ...s,
              studentName: profileMap[s.student_id]
                ? `${profileMap[s.student_id].first_name} ${profileMap[s.student_id].last_name}`
                : 'Unknown Student',
              studentUsername: profileMap[s.student_id]?.username ?? '',
              fileSubmissions: fileMap[s.id] ?? [],
              gradingScore: s.score != null && s.score > 0 ? String(s.score) : '',
            })),
          }
        })
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProfiles(null)
    }
  }

  const togglePublish = async (a: Assessment) => {
    setToggling(a.id)
    try {
      const { error } = await supabase
        .from('assessments')
        .update({ is_published: !a.is_published })
        .eq('id', a.id)
      if (error) throw error
      setAssessments(prev =>
        prev.map(x => x.id === a.id ? { ...x, is_published: !x.is_published } : x)
      )
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(null)
    }
  }

  const deleteAssessment = async (id: string) => {
    setDeleting(id)
    setDeleteError(null)
    try {
      const { error } = await supabase.from('assessments').delete().eq('id', id)
      if (error) throw error
      setAssessments(prev => prev.filter(a => a.id !== id))
      setConfirmDelete(null)
    } catch (err: any) {
      console.error(err)
      const isRls = err?.code === '42501' || /row-level security|permission denied/i.test(err?.message ?? '')
      setDeleteError({
        id,
        message: isRls
          ? "Couldn't delete — a database permission is blocking it. Check the RLS delete policies on questions/choices/submissions."
          : (err?.message || "Couldn't delete this assessment."),
      })
    } finally {
      setDeleting(null)
    }
  }

  const toggleExpand = (id: string) => {
    setAssessments(prev =>
      prev.map(a => {
        if (a.id !== id) return a
        const willExpand = !a.expanded
        if (willExpand && a.activeTab === 'students' && a.submissions?.length) {
          loadStudentProfiles(id, a.submissions, a.type === 'assignment' || a.type === 'activity')
        }
        return { ...a, expanded: willExpand }
      })
    )
  }

  const setTab = (id: string, tab: 'questions' | 'students') => {
    setAssessments(prev =>
      prev.map(a => {
        if (a.id !== id) return a
        if (tab === 'students' && a.submissions?.length) {
          loadStudentProfiles(id, a.submissions, a.type === 'assignment' || a.type === 'activity')
        }
        return { ...a, activeTab: tab }
      })
    )
  }

  const setGradingScore = (assessmentId: string, submissionId: string, val: string) => {
    setAssessments(prev =>
      prev.map(a => a.id !== assessmentId ? a : {
        ...a,
        submissions: (a.submissions ?? []).map(s =>
          s.id !== submissionId ? s : { ...s, gradingScore: val, gradingSaved: false }
        ),
      })
    )
  }

  const saveGrade = async (assessment: Assessment, sub: Submission) => {
    const pts = parseFloat(sub.gradingScore ?? '')
    if (isNaN(pts) || pts < 0) return

    setAssessments(prev =>
      prev.map(a => a.id !== assessment.id ? a : {
        ...a,
        submissions: (a.submissions ?? []).map(s =>
          s.id !== sub.id ? s : { ...s, gradingSaving: true }
        ),
      })
    )

    try {
      const totalPts = assessment.total_points || 100
      const percentage = Math.round((pts / totalPts) * 100)
      const xp = percentage >= 90 ? assessment.xp_reward
        : percentage >= 75 ? Math.round(assessment.xp_reward * 0.75)
        : percentage >= 50 ? Math.round(assessment.xp_reward * 0.5)
        : Math.round(assessment.xp_reward * 0.25)

      await supabase
        .from('submissions')
        .update({ score: pts, percentage, xp_earned: xp, graded_at: new Date().toISOString() })
        .eq('id', sub.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', sub.student_id)
        .single()

      if (profile) {
        const newXp = Math.max(0, (profile.xp ?? 0) + xp)
        const newLevel = Math.floor(newXp / 1000) + 1
        await supabase
          .from('profiles')
          .update({ xp: newXp, level: newLevel })
          .eq('id', sub.student_id)
      }

      setAssessments(prev =>
        prev.map(a => a.id !== assessment.id ? a : {
          ...a,
          submissions: (a.submissions ?? []).map(s =>
            s.id !== sub.id ? s : {
              ...s, score: pts, percentage, gradingSaving: false, gradingSaved: true,
            }
          ),
        })
      )
    } catch (err) {
      console.error(err)
      setAssessments(prev =>
        prev.map(a => a.id !== assessment.id ? a : {
          ...a,
          submissions: (a.submissions ?? []).map(s =>
            s.id !== sub.id ? s : { ...s, gradingSaving: false }
          ),
        })
      )
    }
  }

  const handlePreview = async (file: FileSubmission, studentName: string) => {
    setPreviewing(file.id)
    try {
      const url = await getSignedUrl(file)
      setPreview({ file, url, studentName })
    } catch (err) {
      console.error('Preview error:', err)
    } finally {
      setPreviewing(null)
    }
  }

  const handleDownload = async (file: FileSubmission) => {
    setDownloading(file.id)
    try {
      const url = await getSignedUrl(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.click()
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(null)
    }
  }

  // ── Block cards (incl. "All Students") ─────────────────────────────────
  const cards = useMemo(() => {
    const allCount = assessments.filter(a => !a.block_id).length
    const blockCards = myBlocks.map(b => ({
      id: b.id,
      name: b.name,
      count: assessments.filter(a => a.block_id === b.id).length,
    }))
    return [{ id: null as string | null, name: 'All Students', count: allCount }, ...blockCards]
  }, [assessments, myBlocks])

  // ── Assessments scoped to the selected block ────────────────────────────
  const targetScoped = useMemo(() => {
    if (!selectedTarget) return []
    return assessments.filter(a => a.block_id === selectedTarget.id)
  }, [assessments, selectedTarget])

  const filtered = targetScoped.filter(a => {
    if (filter === 'published') return a.is_published
    if (filter === 'draft') return !a.is_published
    return true
  })

  const stats = {
    total:     targetScoped.length,
    published: targetScoped.filter(a => a.is_published).length,
    drafts:    targetScoped.filter(a => !a.is_published).length,
    submissions: targetScoped.reduce((s, a) => s + (a.submissions?.filter(sub => sub.is_submitted).length ?? 0), 0),
  }

  const openTarget = (t: Target) => {
    setSelectedTarget(t)
    setFilter('all')
  }

  // When inside a scoped block view, pre-fill the block on Create/Generate
  // so the teacher doesn't have to pick it again from the dropdown.
  const blockParam = selectedTarget ? (selectedTarget.id ?? '__all__') : null
  const createUrl = blockParam ? `/teacher/assessments/create?block=${blockParam}` : '/teacher/assessments/create'
  const generateUrl = blockParam ? `/teacher/assessments/generate?block=${blockParam}` : '/teacher/assessments/generate'

  return (
    <div className="ta2-root">
      {/* Header */}
      <motion.div className="ta2-header" {...stagger(0)}>
        <div>
          <p className="ta2-label">TEACHER PANEL</p>
          <h1 className="ta2-title">Assessments</h1>
          <p className="ta2-sub">
            {selectedTarget
              ? 'Manage, publish, and review assessments for this block'
              : 'Pick a block to manage its assessments and submissions'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            className="ta2-create-btn"
            onClick={() => navigate(createUrl)}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={15} /> Create Manually
          </motion.button>
          <motion.button
            className="ta2-generate-btn"
            onClick={() => navigate(generateUrl)}
            whileTap={{ scale: 0.97 }}
          >
            <Sparkles size={15} /> Generate with AI
          </motion.button>
        </div>
      </motion.div>

      {!selectedTarget ? (
        // ── Block picker ──────────────────────────────────────────────────
        loading ? (
          <div className="ta2-loading">
            <span className="ta2-spinner" />
            <p>Loading blocks…</p>
          </div>
        ) : (
          <motion.div className="ta2-block-grid" {...stagger(1)}>
            {cards.map((card, i) => (
              <motion.button
                key={card.id ?? '__all__'}
                className={`ta2-block-card ${card.id === null ? 'ta2-block-card--all' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => openTarget(card)}
              >
                <div className="ta2-block-card-icon">
                  {card.id === null ? <Users size={16} color="#00D4AA" /> : <Layers size={16} color="#6C8EF5" />}
                </div>
                <h3 className="ta2-block-card-name">{card.name}</h3>
                <span className="ta2-block-card-count">
                  <ClipboardList size={11} /> {card.count} assessment{card.count === 1 ? '' : 's'}
                </span>
              </motion.button>
            ))}
            {myBlocks.length === 0 && (
              <p className="ta2-no-blocks-hint">
                You have no blocks yet. Assessments made for All Students will appear here, or create a block first from the Blocks page.
              </p>
            )}
          </motion.div>
        )
      ) : (
        <>
          {/* Target header */}
          <motion.div className="ta2-target-header" {...stagger(1)}>
            <button className="ta2-back-btn" onClick={() => setSelectedTarget(null)}>
              <ArrowLeft size={14} /> All Blocks
            </button>
            <span className="ta2-target-name">
              <Layers size={13} /> {selectedTarget.name}
            </span>
          </motion.div>

          {/* Stats */}
          <motion.div className="ta2-stats" {...stagger(2)}>
            {[
              { label: 'Total',       value: stats.total,       icon: ClipboardList, color: '#6C8EF5' },
              { label: 'Published',   value: stats.published,   icon: Eye,           color: '#00D4AA' },
              { label: 'Drafts',      value: stats.drafts,      icon: EyeOff,        color: '#FFB830' },
              { label: 'Submissions', value: stats.submissions, icon: Users,         color: '#FF6B8A' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="ta2-stat">
                <div className="ta2-stat-icon" style={{ background: `${color}14`, border: `1px solid ${color}25` }}>
                  <Icon size={15} color={color} />
                </div>
                <div>
                  <p className="ta2-stat-val">{value}</p>
                  <p className="ta2-stat-lbl">{label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Filters */}
          <motion.div className="ta2-filters" {...stagger(3)}>
            {(['all', 'published', 'draft'] as const).map(f => (
              <button
                key={f}
                className={`ta2-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button className="ta2-refresh-btn" onClick={fetchAssessments} title="Refresh">
              <RefreshCw size={13} />
            </button>
          </motion.div>

          {/* List */}
          {loading ? (
            <div className="ta2-loading">
              <span className="ta2-spinner" />
              <p>Loading assessments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div className="ta2-empty" {...stagger(4)}>
              <ClipboardList size={32} color="var(--text-muted)" />
              <p className="ta2-empty-title">
                {targetScoped.length === 0 ? `No assessments for ${selectedTarget.name} yet` : 'No assessments match this filter'}
              </p>
              <p className="ta2-empty-sub">
                {targetScoped.length === 0
                  ? 'Use the AI generator to create one for this block.'
                  : 'Try a different filter.'}
              </p>
              {targetScoped.length === 0 && (
                <button className="ta2-generate-btn" onClick={() => navigate(generateUrl)}>
                  <Sparkles size={14} /> Generate with AI
                </button>
              )}
            </motion.div>
          ) : (
            <div className="ta2-list">
              <AnimatePresence>
                {filtered.map((a, i) => {
                  const color = TYPE_COLOR[a.type] ?? '#6C8EF5'
                  const submittedSubs = (a.submissions ?? []).filter(s => s.is_submitted)
                  const submittedCount = submittedSubs.length
                  const avgScore = (() => {
                    const scored = submittedSubs.filter(s => s.percentage != null)
                    if (!scored.length) return null
                    return Math.round(scored.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / scored.length)
                  })()
                  const isFileType = a.type === 'assignment' || a.type === 'activity'

                  return (
                    <motion.div
                      key={a.id}
                      ref={el => { cardRefs.current[a.id] = el }}
                      className={`ta2-card ${a.is_published ? 'published' : 'draft'} ${a.id === highlightId ? 'ta2-card-highlight' : ''}`}
                      {...stagger(i + 5)}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      layout
                    >
                      <div className="ta2-card-accent" style={{ background: color }} />

                      <div className="ta2-card-main">
                        {/* Top row */}
                        <div className="ta2-card-top">
                          <div className="ta2-card-badges">
                            <span className="ta2-type-badge" style={{ color, borderColor: `${color}35`, background: `${color}10` }}>
                              {a.type.toUpperCase()}
                            </span>
                            {a.difficulty && (
                              <span className="ta2-diff-badge" style={{ color: DIFF_COLOR[a.difficulty] ?? '#6C8EF5' }}>
                                {a.difficulty}
                              </span>
                            )}
                            {a.module_topic && (
                              <span className="ta2-module-badge">
                                <BookOpen size={9} /> {a.module_topic}
                              </span>
                            )}
                            {isFileType && (
                              <span className="ta2-type-badge" style={{ color, borderColor: `${color}40`, background: `${color}10`, fontSize: 9 }}>
                                <Upload size={9} /> FILE UPLOAD
                              </span>
                            )}
                          </div>

                          <div className="ta2-card-actions">
                            <motion.button
                              className={`ta2-publish-btn ${a.is_published ? 'unpublish' : 'publish'}`}
                              onClick={() => togglePublish(a)}
                              disabled={toggling === a.id}
                              whileTap={{ scale: 0.95 }}
                              title={a.is_published ? 'Unpublish' : 'Publish to students'}
                            >
                              {toggling === a.id ? (
                                <RefreshCw size={13} className="ta2-spin" />
                              ) : a.is_published ? (
                                <><EyeOff size={13} /> Unpublish</>
                              ) : (
                                <><Eye size={13} /> Publish</>
                              )}
                            </motion.button>

                            {confirmDelete === a.id ? (
                              <div className="ta2-confirm-delete">
                                <span>Delete?</span>
                                <button className="ta2-confirm-yes" onClick={() => deleteAssessment(a.id)} disabled={deleting === a.id}>
                                  {deleting === a.id ? <RefreshCw size={11} className="ta2-spin" /> : 'Yes'}
                                </button>
                                <button className="ta2-confirm-no" onClick={() => { setConfirmDelete(null); setDeleteError(null) }}>No</button>
                              </div>
                            ) : (
                              <button className="ta2-delete-btn" onClick={() => setConfirmDelete(a.id)} title="Delete assessment">
                                <Trash2 size={14} />
                              </button>
                            )}

                            <button className="ta2-expand-btn" onClick={() => toggleExpand(a.id)} title={a.expanded ? 'Collapse' : 'View details'}>
                              {a.expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Title + status */}
                        <div className="ta2-card-title-row">
                          <h3 className="ta2-card-title">{a.title}</h3>
                          <span className={`ta2-status-badge ${a.is_published ? 'pub' : 'draft'}`}>
                            {a.is_published
                              ? <><CheckCircle2 size={11} /> Published</>
                              : <><Clock size={11} /> Draft</>}
                          </span>
                        </div>

                        {/* Meta row */}
                        <div className="ta2-card-meta">
                          {!isFileType && a.total_questions != null && (
                            <span><ClipboardList size={11} /> {a.total_questions} questions</span>
                          )}
                          {isFileType && (
                            <span><Paperclip size={11} /> {a.total_points} pts</span>
                          )}
                          {a.time_limit && (
                            <span><Clock size={11} /> {a.time_limit} min</span>
                          )}
                          <span><Zap size={11} /> {a.xp_reward} XP</span>
                          <span>Created {fmt(a.created_at)}</span>
                          {submittedCount > 0 && (
                            <span><Users size={11} /> {submittedCount} submitted</span>
                          )}
                          {!isFileType && avgScore != null && (
                            <span><BarChart2 size={11} /> Avg {avgScore}%</span>
                          )}
                        </div>

                        {deleteError?.id === a.id && (
                          <p className="ta2-delete-error">
                            <AlertTriangle size={12} /> {deleteError.message}
                          </p>
                        )}

                        {/* Expanded panel */}
                        <AnimatePresence>
                          {a.expanded && (
                            <motion.div
                              className="ta2-expanded-panel"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              {/* Tabs */}
                              <div className="ta2-tabs">
                                {!isFileType && (
                                  <button
                                    className={`ta2-tab ${a.activeTab === 'questions' ? 'active' : ''}`}
                                    onClick={() => setTab(a.id, 'questions')}
                                  >
                                    <ClipboardList size={12} /> Questions
                                  </button>
                                )}
                                <button
                                  className={`ta2-tab ${a.activeTab === 'students' ? 'active' : ''}`}
                                  onClick={() => setTab(a.id, 'students')}
                                >
                                  <UserCheck size={12} />
                                  {isFileType ? 'Submissions' : 'Students'}
                                  {submittedCount > 0 && (
                                    <span className="ta2-tab-count">{submittedCount}</span>
                                  )}
                                </button>
                              </div>

                              {/* Questions tab */}
                              {!isFileType && a.activeTab === 'questions' && (
                                <div className="ta2-questions-inner">
                                  {!a.questions?.length ? (
                                    <p className="ta2-no-questions">No questions found for this assessment.</p>
                                  ) : (
                                    [...(a.questions ?? [])]
                                      .sort((x, y) => x.order_index - y.order_index)
                                      .map((q, qi) => (
                                        <div key={q.id} className="ta2-q-item">
                                          <div className="ta2-q-num">Q{qi + 1}</div>
                                          <div className="ta2-q-body">
                                            <p className="ta2-q-text">{q.question_text}</p>
                                            <div className="ta2-q-choices">
                                              {[...(q.choices ?? [])]
                                                .sort((x, y) => x.order_index - y.order_index)
                                                .map((c, ci) => (
                                                  <div key={c.id} className={`ta2-q-choice ${c.is_correct ? 'correct' : ''}`}>
                                                    <span className="ta2-q-choice-label">{['A','B','C','D'][ci]}</span>
                                                    <span>{c.choice_text}</span>
                                                    {c.is_correct && <CheckCircle2 size={11} color="#00D4AA" />}
                                                  </div>
                                                ))}
                                            </div>
                                            {q.explanation && (
                                              <p className="ta2-q-explanation">
                                                <span>Explanation:</span> {q.explanation}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                  )}
                                </div>
                              )}

                              {/* Students / Submissions tab */}
                              {a.activeTab === 'students' && (
                                <div className="ta2-students-panel">
                                  {loadingProfiles === a.id ? (
                                    <div className="ta2-students-loading">
                                      <span className="ta2-spinner" style={{ width: 18, height: 18 }} />
                                      <span>Loading student data…</span>
                                    </div>
                                  ) : submittedCount === 0 ? (
                                    <div className="ta2-students-empty">
                                      <Users size={24} color="var(--text-muted)" />
                                      <p>No submissions yet</p>
                                      <span>Students haven't submitted this {a.type === 'activity' ? 'activity' : isFileType ? 'assignment' : 'assessment'}.</span>
                                    </div>
                                  ) : isFileType ? (
                                    // ── Assignment submissions ──
                                    <div className="ta2-assignment-submissions">
                                      <p className="ta2-assignment-grade-hint" style={{ borderColor: `${color}30`, background: `${color}08`, color }}>
                                        <AlertTriangle size={12} color={color} />
                                        Review each submission and enter a score to grade it.
                                      </p>
                                      {submittedSubs.map((sub, idx) => (
                                        <motion.div
                                          key={sub.id}
                                          className="ta2-assignment-sub-card"
                                          initial={{ opacity: 0, y: 8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: idx * 0.05 }}
                                        >
                                          {/* Student info */}
                                          <div className="ta2-student-info" style={{ marginBottom: 12 }}>
                                            <div className="ta2-student-avatar">
                                              {(sub.studentName ?? 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                              <p className="ta2-student-name">{sub.studentName ?? 'Loading…'}</p>
                                              {sub.studentUsername && (
                                                <p className="ta2-student-username">@{sub.studentUsername}</p>
                                              )}
                                            </div>
                                            <div style={{ marginLeft: 'auto' }}>
                                              <ScoreBadge percentage={sub.percentage} />
                                            </div>
                                          </div>

                                          {/* Files with View + Download */}
                                          {sub.fileSubmissions && sub.fileSubmissions.length > 0 ? (
                                            <div className="ta2-files-list">
                                              {sub.fileSubmissions.map(f => (
                                                <div key={f.id} className="ta2-file-row">
                                                  {fileIcon(f.file_type)}
                                                  <span className="ta2-file-emoji">{fileEmoji(f.file_type)}</span>
                                                  <span className="ta2-file-name">{f.file_name}</span>
                                                  <div className="ta2-file-actions">
                                                    <button
                                                      className="ta2-file-view-btn"
                                                      onClick={() => handlePreview(f, sub.studentName ?? 'Student')}
                                                      disabled={previewing === f.id}
                                                    >
                                                      {previewing === f.id
                                                        ? <Loader2 size={12} className="ta2-spin" />
                                                        : <Eye size={12} />}
                                                      {previewing === f.id ? 'Loading…' : 'View'}
                                                    </button>
                                                    <button
                                                      className="ta2-file-dl-btn"
                                                      onClick={() => handleDownload(f)}
                                                      disabled={downloading === f.id}
                                                    >
                                                      {downloading === f.id
                                                        ? <Loader2 size={12} className="ta2-spin" />
                                                        : <Download size={12} />}
                                                      {downloading === f.id ? '…' : 'Download'}
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="ta2-no-files">No files attached to this submission.</p>
                                          )}

                                          {/* Grading input */}
                                          <div className="ta2-grade-row">
                                            <label className="ta2-grade-label">Score</label>
                                            <input
                                              className="ta2-grade-input"
                                              type="number"
                                              min={0}
                                              max={a.total_points}
                                              placeholder={`0 – ${a.total_points}`}
                                              value={sub.gradingScore ?? (sub.score != null ? String(sub.score) : '')}
                                              onChange={e => setGradingScore(a.id, sub.id, e.target.value)}
                                            />
                                            <span className="ta2-grade-total">/ {a.total_points}</span>
                                            <motion.button
                                              className={`ta2-grade-btn ${sub.gradingSaved ? 'saved' : ''}`}
                                              onClick={() => saveGrade(a, sub)}
                                              disabled={sub.gradingSaving}
                                              whileTap={{ scale: 0.95 }}
                                            >
                                              {sub.gradingSaving ? (
                                                <RefreshCw size={12} className="ta2-spin" />
                                              ) : sub.gradingSaved ? (
                                                <><CheckCircle2 size={12} /> Saved</>
                                              ) : (
                                                <><Save size={12} /> Save Grade</>
                                              )}
                                            </motion.button>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  ) : (
                                    // ── Quiz/exam results ──
                                    <>
                                      <div className="ta2-students-summary">
                                        <div className="ta2-students-summary-item">
                                          <span className="ta2-students-summary-val">{submittedCount}</span>
                                          <span className="ta2-students-summary-lbl">Submitted</span>
                                        </div>
                                        {avgScore != null && (
                                          <div className="ta2-students-summary-item">
                                            <span className="ta2-students-summary-val" style={{
                                              color: avgScore >= 75 ? '#00D4AA' : avgScore >= 50 ? '#FFB830' : '#FF6B8A'
                                            }}>{avgScore}%</span>
                                            <span className="ta2-students-summary-lbl">Class Average</span>
                                          </div>
                                        )}
                                        <div className="ta2-students-summary-item">
                                          <span className="ta2-students-summary-val" style={{ color: '#00D4AA' }}>
                                            {submittedSubs.filter(s => (s.percentage ?? 0) >= 75).length}
                                          </span>
                                          <span className="ta2-students-summary-lbl">Passed</span>
                                        </div>
                                        <div className="ta2-students-summary-item">
                                          <span className="ta2-students-summary-val" style={{ color: '#FF6B8A' }}>
                                            {submittedSubs.filter(s => s.percentage != null && (s.percentage ?? 0) < 75).length}
                                          </span>
                                          <span className="ta2-students-summary-lbl">Below 75%</span>
                                        </div>
                                      </div>

                                      <div className="ta2-students-list">
                                        <div className="ta2-students-list-header">
                                          <span>Student</span>
                                          <span>Score</span>
                                          <span>Status</span>
                                        </div>
                                        {submittedSubs
                                          .sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))
                                          .map((sub, idx) => (
                                            <motion.div
                                              key={sub.id}
                                              className="ta2-student-row"
                                              initial={{ opacity: 0, x: -8 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: idx * 0.04, duration: 0.2 }}
                                            >
                                              <div className="ta2-student-rank">
                                                {idx === 0 ? <Award size={13} color="#FFB830" /> : <span>{idx + 1}</span>}
                                              </div>
                                              <div className="ta2-student-info">
                                                <div className="ta2-student-avatar">
                                                  {(sub.studentName ?? 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                  <p className="ta2-student-name">{sub.studentName ?? 'Loading…'}</p>
                                                  {sub.studentUsername && (
                                                    <p className="ta2-student-username">@{sub.studentUsername}</p>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="ta2-student-score">
                                                <ScoreBadge percentage={sub.percentage} />
                                                {sub.score != null && a.total_points > 0 && (
                                                  <span className="ta2-student-raw">{sub.score}/{a.total_points} pts</span>
                                                )}
                                              </div>
                                              <div className="ta2-student-result">
                                                {sub.percentage == null ? (
                                                  <span className="ta2-result-pending">Pending</span>
                                                ) : sub.percentage >= 75 ? (
                                                  <span className="ta2-result-pass"><CheckCircle2 size={11} /> Pass</span>
                                                ) : (
                                                  <span className="ta2-result-fail"><XCircle size={11} /> Fail</span>
                                                )}
                                              </div>
                                            </motion.div>
                                          ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ── File Preview Modal ── */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="ta2-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              className="ta2-preview-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="ta2-preview-header">
                <div className="ta2-preview-title">
                  <span className="ta2-preview-emoji">{fileEmoji(preview.file.file_type)}</span>
                  <div>
                    <p className="ta2-preview-filename">{preview.file.file_name}</p>
                    <p className="ta2-preview-student">Submitted by {preview.studentName}</p>
                  </div>
                </div>
                <div className="ta2-preview-header-actions">
                  <button
                    className="ta2-file-dl-btn"
                    onClick={() => handleDownload(preview.file)}
                    disabled={downloading === preview.file.id}
                  >
                    {downloading === preview.file.id
                      ? <Loader2 size={12} className="ta2-spin" />
                      : <Download size={12} />}
                    Download
                  </button>
                  <button className="ta2-preview-close" onClick={() => setPreview(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="ta2-preview-body">
                {renderPreviewContent(preview)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="ta2-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
