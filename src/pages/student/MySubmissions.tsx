import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Download, Clock, CheckCircle2,
  Loader2, FolderOpen, ChevronDown, ChevronUp, Award,
  Paperclip, Eye, X,
} from 'lucide-react'
import './MySubmissions.css'

interface FileSubmission {
  id: string
  file_name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  uploaded_at: string
}

interface Submission {
  id: string
  submitted_at: string
  score: number | null
  percentage: number | null
  xp_earned: number | null
  assessment: {
    id: string
    title: string
    type: string
    total_points: number
    due_date: string | null
    module_topic: string | null
  }
  fileSubmissions: FileSubmission[]
}

const TYPE_COLOR: Record<string, string> = {
  quiz: '#6C8EF5', activity: '#00D4AA', assignment: '#FFB830', exam: '#FF6B8A',
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.26, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
})

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtBytes(b: number | null) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function fileEmoji(type: string | null) {
  if (!type) return '📁'
  if (type.includes('pdf')) return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('image')) return '🖼️'
  if (type.includes('presentation') || type.includes('powerpoint')) return '📊'
  return '📁'
}

function gradeInfo(pct: number | null): { color: string; label: string } {
  if (pct === null) return { color: '#FFB830', label: 'Pending' }
  if (pct >= 90) return { color: '#00D4AA', label: 'Excellent' }
  if (pct >= 75) return { color: '#60a5fa', label: 'Good' }
  if (pct >= 60) return { color: '#FFB830', label: 'Passing' }
  return { color: '#FF6B8A', label: 'Needs Work' }
}

interface PreviewState {
  file: FileSubmission
  url: string
}

export default function MySubmissions() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<string | null>(null)
  const [previewing, setPreviewing]   = useState<string | null>(null)
  const [preview, setPreview]         = useState<PreviewState | null>(null)

  useEffect(() => { if (user) fetchSubmissions() }, [user])

  async function fetchSubmissions() {
    setLoading(true)
    try {
      // Get all submitted submissions that have file_submissions
      const { data: subs, error: subErr } = await supabase
        .from('submissions')
        .select(`
          id, submitted_at, score, percentage, xp_earned,
          assessments ( id, title, type, total_points, due_date, module_topic )
        `)
        .eq('student_id', user!.id)
        .eq('is_submitted', true)
        .order('submitted_at', { ascending: false })

      if (subErr) throw subErr

      if (!subs || subs.length === 0) {
        setSubmissions([])
        setLoading(false)
        return
      }

      // Fetch file_submissions for all these submission IDs
      const subIds = subs.map((s: any) => s.id)
      const { data: files } = await supabase
        .from('file_submissions')
        .select('id, submission_id, file_name, file_url, file_type, uploaded_at')
        .in('submission_id', subIds)

      // Group files by submission
      const fileMap: Record<string, FileSubmission[]> = {}
      ;(files ?? []).forEach((f: any) => {
        if (!fileMap[f.submission_id]) fileMap[f.submission_id] = []
        fileMap[f.submission_id].push(f)
      })

      // Only keep submissions that have files
      const mapped: Submission[] = subs
        .filter((s: any) => fileMap[s.id]?.length > 0)
        .map((s: any) => ({
          id: s.id,
          submitted_at: s.submitted_at,
          score: s.score,
          percentage: s.percentage,
          xp_earned: s.xp_earned,
          assessment: {
            id: s.assessments?.id,
            title: s.assessments?.title ?? 'Unknown',
            type: s.assessments?.type ?? 'assignment',
            total_points: s.assessments?.total_points ?? 0,
            due_date: s.assessments?.due_date ?? null,
            module_topic: s.assessments?.module_topic ?? null,
          },
          fileSubmissions: fileMap[s.id] ?? [],
        }))

      setSubmissions(mapped)
    } catch (err) {
      console.error('Error fetching submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
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

  async function handlePreview(file: FileSubmission) {
    setPreviewing(file.id)
    try {
      const url = await getSignedUrl(file)
      setPreview({ file, url })
    } catch (err) {
      console.error('Preview error:', err)
      alert('Could not load preview. Try downloading instead.')
    } finally {
      setPreviewing(null)
    }
  }

  async function handleDownload(file: FileSubmission) {
    setDownloading(file.id)
    try {
      const url = await getSignedUrl(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      a.click()
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download file. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const stats = {
    total:   submissions.length,
    graded:  submissions.filter(s => s.score !== null).length,
    pending: submissions.filter(s => s.score === null).length,
  }

  if (loading) {
    return (
      <div className="msub-loading">
        <Loader2 size={30} className="msub-spin" />
        <p>Loading your submissions…</p>
      </div>
    )
  }

  function renderPreviewContent(p: PreviewState) {
    const { file, url } = p
    const type = file.file_type ?? ''
    const name = file.file_name.toLowerCase()

    if (type.includes('image')) {
      return <img src={url} alt={file.file_name} className="msub-preview-img" />
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return <iframe src={url} className="msub-preview-iframe" title={file.file_name} />
    }
    // Office docs / other: use Google Docs Viewer
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    return <iframe src={viewerUrl} className="msub-preview-iframe" title={file.file_name} />
  }

  return (
    <div className="msub-root">
      {/* Header */}
      <motion.div className="msub-header" {...stagger(0)}>
        <div className="msub-header-left">
          <FolderOpen size={26} color="#FFB830" />
          <div>
            <p className="msub-header-label">STUDENT FILES</p>
            <h1 className="msub-header-title">My Submissions</h1>
            <p className="msub-header-sub">All your uploaded assignment files</p>
          </div>
        </div>
        <div className="msub-stats">
          {[
            { label: 'Total',   value: stats.total,   color: '#6C8EF5', icon: Paperclip },
            { label: 'Graded',  value: stats.graded,  color: '#00D4AA', icon: CheckCircle2 },
            { label: 'Pending', value: stats.pending, color: '#FFB830', icon: Clock },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="msub-stat">
              <div className="msub-stat-icon" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={14} color={color} />
              </div>
              <div>
                <p className="msub-stat-val">{value}</p>
                <p className="msub-stat-lbl">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Empty state */}
      {submissions.length === 0 && (
        <motion.div className="msub-empty" {...stagger(1)}>
          <FolderOpen size={56} color="#2D3748" />
          <h2>No file submissions yet</h2>
          <p>Files you upload for assignments will appear here.</p>
        </motion.div>
      )}

      {/* File Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="msub-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              className="msub-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="msub-modal-header">
                <div className="msub-modal-title">
                  <span className="msub-file-emoji">{fileEmoji(preview.file.file_type)}</span>
                  <span>{preview.file.file_name}</span>
                </div>
                <div className="msub-modal-actions">
                  <button
                    className="msub-download-btn"
                    onClick={() => handleDownload(preview.file)}
                  >
                    <Download size={13} /> Download
                  </button>
                  <button className="msub-modal-close" onClick={() => setPreview(null)}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="msub-modal-body">
                {renderPreviewContent(preview)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="msub-list">
        <AnimatePresence>
          {submissions.map((sub, i) => {
            const isOpen    = expanded.has(sub.id)
            const isGraded  = sub.score !== null
            const { color: gradeColor, label: gradeLabel } = gradeInfo(sub.percentage)
            const typeColor = TYPE_COLOR[sub.assessment.type] ?? '#6C8EF5'

            return (
              <motion.div
                key={sub.id}
                className="msub-card"
                {...stagger(i + 1)}
                layout
              >
                {/* Accent */}
                <div className="msub-card-accent" style={{ background: isGraded ? '#00D4AA' : '#FFB830' }} />

                {/* Header row */}
                <div
                  className="msub-card-header"
                  onClick={() => toggleExpand(sub.id)}
                >
                  <div className="msub-card-left">
                    <div className="msub-status-icon" style={{ color: isGraded ? '#00D4AA' : '#FFB830' }}>
                      {isGraded ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                    </div>
                    <div className="msub-card-info">
                      <div className="msub-card-badges">
                        <span className="msub-type-badge"
                          style={{ color: typeColor, borderColor: `${typeColor}35`, background: `${typeColor}10` }}>
                          {sub.assessment.type.toUpperCase()}
                        </span>
                        {sub.assessment.module_topic && (
                          <span className="msub-module-badge">{sub.assessment.module_topic}</span>
                        )}
                      </div>
                      <h3 className="msub-card-title">{sub.assessment.title}</h3>
                      <p className="msub-card-date">
                        Submitted {fmt(sub.submitted_at)} ·{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {sub.fileSubmissions.length} file{sub.fileSubmissions.length !== 1 ? 's' : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="msub-card-right">
                    {/* Grade badge */}
                    <div className="msub-grade-badge" style={{
                      color: gradeColor,
                      borderColor: `${gradeColor}35`,
                      background: `${gradeColor}10`,
                    }}>
                      {isGraded ? (
                        <>
                          <span className="msub-grade-score">
                            {sub.score}/{sub.assessment.total_points}
                          </span>
                          <span className="msub-grade-label">{gradeLabel}</span>
                        </>
                      ) : (
                        <span className="msub-grade-label">Not graded yet</span>
                      )}
                    </div>

                    {/* XP badge */}
                    {sub.xp_earned != null && sub.xp_earned > 0 && (
                      <div className="msub-xp-badge">
                        <Award size={11} /> +{sub.xp_earned} XP
                      </div>
                    )}

                    <button className="msub-expand-btn">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Score bar */}
                {isGraded && sub.percentage !== null && (
                  <div className="msub-score-bar-wrap">
                    <div className="msub-score-bar-track">
                      <motion.div
                        className="msub-score-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${sub.percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}aa)` }}
                      />
                    </div>
                    <span className="msub-score-pct">{sub.percentage}%</span>
                  </div>
                )}

                {/* Expanded files */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      className="msub-files"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <p className="msub-files-label">Uploaded Files</p>
                      {sub.fileSubmissions.map(file => (
                        <div key={file.id} className="msub-file-row">
                          <span className="msub-file-emoji">{fileEmoji(file.file_type)}</span>
                          <div className="msub-file-info">
                            <span className="msub-file-name">{file.file_name}</span>
                            <span className="msub-file-meta">
                              {fmtBytes(file.file_size)} · {fmt(file.uploaded_at)}
                            </span>
                          </div>
                          <button
                            className="msub-view-btn"
                            onClick={e => { e.stopPropagation(); handlePreview(file) }}
                            disabled={previewing === file.id}
                          >
                            {previewing === file.id
                              ? <Loader2 size={13} className="msub-spin" />
                              : <Eye size={13} />
                            }
                            {previewing === file.id ? 'Loading…' : 'View'}
                          </button>
                          <button
                            className="msub-download-btn"
                            onClick={e => { e.stopPropagation(); handleDownload(file) }}
                            disabled={downloading === file.id}
                          >
                            {downloading === file.id
                              ? <Loader2 size={13} className="msub-spin" />
                              : <Download size={13} />
                            }
                            {downloading === file.id ? 'Downloading…' : 'Download'}
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
