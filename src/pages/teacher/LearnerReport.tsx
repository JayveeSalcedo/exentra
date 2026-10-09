import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ClipboardCheck, Flag, TrendingUp, TrendingDown, Target,
  AlertTriangle, CheckCircle2, Star, BookOpen, Clock, Lock,
} from 'lucide-react'
import { PASSING_SCORE, TOTAL_LESSONS, TOTAL_MODULES, fetchLearnerReport, type LearnerReport as Report } from '../../lib/analytics'
import ScoreBarChart from '../../components/charts/ScoreBarChart'
import './TeacherAnalytics.css'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
})

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function LearnerReport() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    fetchLearnerReport(studentId)
      .then(r => { if (!cancelled) { setReport(r); setState(r ? 'ready' : 'missing') } })
      .catch(err => { console.error(err); if (!cancelled) setState('missing') })
    return () => { cancelled = true }
  }, [studentId])

  const back = () => navigate('/teacher/analytics')

  if (state !== 'ready' || !report) {
    return (
      <div className="tan-root">
        <div className="tan-card tan-center">
          <p className="tan-empty">{state === 'loading' ? 'Loading learner report…' : 'This student could not be found.'}</p>
          {state === 'missing' && <button className="tan-back-btn solid" onClick={back}><ArrowLeft size={14} /> Back to Analytics</button>}
        </div>
      </div>
    )
  }

  const r = report
  const improvementUp = (r.improvement ?? 0) >= 0
  const tiles = [
    {
      label: 'First score', icon: ClipboardCheck, tone: 'blue',
      value: r.firstScore === null ? '—' : `${r.firstScore}%`,
      sub: r.attempts.length ? `${r.attempts[0].title}` : 'No assessments yet',
    },
    {
      label: 'Latest score', icon: Flag, tone: r.latestScore !== null && r.latestScore < PASSING_SCORE ? 'red' : 'green',
      value: r.latestScore === null ? '—' : `${r.latestScore}%`,
      sub: r.attempts.length ? r.attempts[r.attempts.length - 1].title : 'No assessments yet',
    },
    {
      label: 'Improvement', icon: improvementUp ? TrendingUp : TrendingDown, tone: r.improvement === null ? 'blue' : improvementUp ? 'green' : 'red',
      value: r.improvement === null ? '—' : `${r.improvement > 0 ? '+' : ''}${r.improvement} pts`,
      sub: r.improvement === null ? 'Needs at least 2 assessments' : 'From first to latest score',
    },
    {
      label: 'Completion', icon: Target, tone: 'violet',
      value: `${r.completionPct}%`,
      sub: `${r.lessonsDone}/${TOTAL_LESSONS} lessons · ${r.modulesDone}/${TOTAL_MODULES} modules`,
    },
  ]

  const moduleBars = r.moduleScores.map(m => ({
    key: String(m.order),
    label: `M${m.order}`,
    name: `Module ${m.order} – ${m.title}`,
    value: m.avg,
    detail: m.count ? `${m.count} attempt${m.count === 1 ? '' : 's'}` : 'Not assessed yet',
  }))
  const recentAttempts = r.attempts.slice(-12)
  const attemptBars = recentAttempts.map((a, i) => ({
    key: a.id,
    label: `#${r.attempts.length - recentAttempts.length + i + 1}`,
    name: a.title,
    value: a.percentage,
    detail: [a.moduleTitle, fmtDate(a.submittedAt)].filter(Boolean).join(' · '),
  }))

  return (
    <div className="tan-root">
      <motion.div className="tan-report-hero" {...stagger(0)}>
        <span className="tan-report-avatar">
          {r.avatarUrl ? <img src={r.avatarUrl} alt="" /> : (r.firstName[0] ?? '?').toUpperCase()}
        </span>
        <div className="tan-report-id">
          <p className="tan-eyebrow light">Learner report</p>
          <h1>{r.firstName} {r.lastName}</h1>
          <p>
            {r.schoolId}@psu.edu.ph · Joined {fmtDate(r.joinedAt)}
            {r.blockName ? ` · ${r.blockName}` : ''}
            {r.lastActive ? ` · Last active ${fmtDate(r.lastActive)}` : ''}
          </p>
        </div>
        <button className="tan-back-btn" onClick={back}><ArrowLeft size={14} /> Back to Analytics</button>
      </motion.div>

      <motion.div className="tan-tiles" {...stagger(1)}>
        {tiles.map(t => (
          <div key={t.label} className="tan-tile">
            <div className={`tan-tile-icon ${t.tone}`}><t.icon size={18} /></div>
            <div className="tan-tile-text">
              <p className="tan-tile-label">{t.label}</p>
              <p className={`tan-tile-value tone-${t.tone}`}>{t.value}</p>
              <p className="tan-tile-sub" title={t.sub}>{t.sub}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="tan-grid-2">
        <motion.section className="tan-card" {...stagger(2)}>
          <header className="tan-card-head">
            <h2><i className="tan-dot green" /> Module Scores</h2>
            <p>Average assessment score per module (passing ≥{PASSING_SCORE}%)</p>
          </header>
          <ScoreBarChart bars={moduleBars} colorMode="status" threshold={PASSING_SCORE} ariaLabel="Average score per module" emptyText="No graded assessments yet." />
        </motion.section>

        <motion.section className="tan-card" {...stagger(3)}>
          <header className="tan-card-head">
            <h2><i className="tan-dot blue" /> Assessment Scores</h2>
            <p>{r.attempts.length > 12 ? `Latest 12 of ${r.attempts.length} attempts` : 'All assessment attempts, oldest first'}</p>
          </header>
          <ScoreBarChart bars={attemptBars} colorMode="series" ariaLabel="Score for each assessment attempt" emptyText="No assessment attempts yet." />
        </motion.section>
      </div>

      <div className="tan-grid-2">
        <motion.section className="tan-card" {...stagger(4)}>
          <header className="tan-card-head"><h2><i className="tan-dot red" /> Weak Areas</h2></header>
          {r.weakAreas.length === 0 ? (
            <p className="tan-ok"><CheckCircle2 size={14} /> No weak areas detected</p>
          ) : (
            <ul className="tan-weak">
              {r.weakAreas.map(w => (
                <li key={w.title}>
                  <AlertTriangle size={13} />
                  <span><strong>{w.title}</strong><em>{w.detail}</em></span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section className="tan-card" {...stagger(5)}>
          <header className="tan-card-head"><h2><i className="tan-dot green" /> Strong Areas</h2></header>
          {r.strongAreas.length === 0 ? (
            <p className="tan-empty small">No strong areas identified yet.</p>
          ) : (
            <ul className="tan-strong">
              {r.strongAreas.map(w => (
                <li key={w.title}>
                  <Star size={13} />
                  <span><strong>{w.title}</strong><em>{w.detail}</em></span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      <div className="tan-grid-2">
        <motion.section className="tan-card" {...stagger(6)}>
          <header className="tan-card-head">
            <h2><i className="tan-dot green" /> Lesson Progress</h2>
            <p>Lessons completed in each study guide module</p>
          </header>
          <ul className="tan-progress-list">
            {r.courseProgress.map(mp => {
              const pct = mp.lessons.length ? Math.round(mp.completedCount / mp.lessons.length * 100) : 0
              return (
                <li key={mp.module.order}>
                  <span className="tan-progress-name">
                    {mp.state === 'locked' ? <Lock size={11} /> : mp.state === 'done' ? <CheckCircle2 size={11} className="ok" /> : <BookOpen size={11} />}
                    Module {mp.module.order} – {mp.module.title}
                  </span>
                  <div className="tan-meter wide">
                    <div className="tan-meter-track"><div className="tan-meter-fill" style={{ width: `${pct}%` }} /></div>
                    <span>{mp.completedCount}/{mp.lessons.length}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </motion.section>

        <motion.section className="tan-card" {...stagger(7)}>
          <header className="tan-card-head">
            <h2><i className="tan-dot blue" /> Recent Submissions</h2>
            <p>Latest 5 graded assessments</p>
          </header>
          {r.attempts.length === 0 ? (
            <p className="tan-empty">No submissions yet.</p>
          ) : (
            <ul className="tan-recent">
              {[...r.attempts].reverse().slice(0, 5).map(a => (
                <li key={a.id}>
                  <span className="tan-recent-main">
                    <strong>{a.title}</strong>
                    <em>{[a.type.toUpperCase(), a.moduleTitle].filter(Boolean).join(' · ')}</em>
                  </span>
                  <span className="tan-recent-side">
                    <span className={`tan-score ${a.percentage >= PASSING_SCORE ? 'pass' : 'fail'}`}>{a.percentage}%</span>
                    <em><Clock size={10} /> {fmtDate(a.submittedAt)}</em>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  )
}
