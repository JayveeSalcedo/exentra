import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Lightbulb, Code2,
  CheckCircle2, Play, Zap, ChevronRight, ChevronLeft,
} from 'lucide-react'
import CodeEditor from '../../components/ui/CodeEditor'
import ConceptVisualizer from '../../components/visualizers/ConceptVisualizer'
import { LESSONS, getLessonsForModule } from '../../lessons/index'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import '../../components/visualizers/visualizers.css'
import './LessonPlayer.css'

/* ─── helpers ─────────────────────────────────────────────────────────── */
function CheckItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <motion.div
      className={`lp-check-item ${passed ? 'passed' : ''}`}
      animate={{ borderColor: passed ? 'rgba(0,212,170,0.5)' : 'rgba(59,91,219,0.2)' }}
    >
      <CheckCircle2 size={14} className={passed ? 'check-icon-pass' : 'check-icon-idle'} />
      <span>{label}</span>
    </motion.div>
  )
}

/* ─── component ───────────────────────────────────────────────────────── */
export default function LessonPlayer() {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const savedRef = useRef(false) // prevent double-save

  const lesson = LESSONS[lessonId ?? '']
  // `moduleId` from the URL may be the static key ("module1".."module8")
  // OR a real DB modules.id (uuid) — LearningMaterials.tsx passes whichever
  // is on the merged Module object it's rendering. The static lesson data
  // is always keyed by lesson.moduleId ("module1" etc.), so derive from
  // there for anything that needs to match it (lookups, display), and keep
  // the raw `moduleId` param only for building URLs / writing to Supabase.
  const staticModuleId = lesson?.moduleId ?? moduleId ?? ''
  const moduleNumber = staticModuleId.replace(/^module/i, '') || moduleId
  const moduleLessons = getLessonsForModule(staticModuleId)
  const lessonIdx = moduleLessons.findIndex(l => l.id === lessonId)
  const prevLesson = lessonIdx > 0 ? moduleLessons[lessonIdx - 1] : null
  const nextLesson = lessonIdx >= 0 && lessonIdx < moduleLessons.length - 1
    ? moduleLessons[lessonIdx + 1]
    : null

  /* section state */
  const SECTION_KEYS = ['overview', 'keypoints', 'steps', 'challenge'] as const
  type SectionKey = typeof SECTION_KEYS[number]
  const [section, setSection] = useState<SectionKey>('overview')
  const sectionIdx = SECTION_KEYS.indexOf(section)

  /* practice state */
  const [showPractice, setShowPractice] = useState(false)
  const [code, setCode] = useState('')
  const [showHints, setShowHints] = useState(false)

  useEffect(() => {
    if (!lesson) return
    setSection('overview')
    setShowPractice(false)
    setCode(lesson.starterCode)
    setShowHints(false)
    savedRef.current = false // reset save flag on new lesson
  }, [lessonId, lesson])

  // Mark lesson as complete in Supabase
  const markLessonComplete = async () => {
    if (!user || !lessonId || savedRef.current) return
    savedRef.current = true
    try {
      // Upsert progress row
      await supabase.from('student_progress').upsert({
        student_id: user.id,
        lesson_id: lessonId,
        module_id: moduleId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,lesson_id' })

      // Award XP (+30 per lesson)
      await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 30 })
    } catch (e) {
      console.error('Failed to save progress:', e)
      savedRef.current = false
    }
  }

  if (!lesson) {
    return (
      <div className="lp-not-found">
        <p>Lesson not found.</p>
        <button className="lp-back-btn" onClick={() => navigate('/student/courses')}>
          ← Back to Modules
        </button>
      </div>
    )
  }

  /* check-marks live-evaluated */
  const checkResults = lesson.challenge.checks.map(c => ({
    ...c,
    passed: c.test(code),
  }))
  const allPassed = checkResults.every(c => c.passed)

  /* section labels */
  const SECTION_LABELS: Record<SectionKey, string> = {
    overview:   'Overview',
    keypoints:  'Key Points',
    steps:      'Guided Steps',
    challenge:  'Check Your Understanding',
  }
  const SECTION_ICONS: Record<SectionKey, React.ReactNode> = {
    overview:  <BookOpen  size={14} />,
    keypoints: <Lightbulb size={14} />,
    steps:     <Code2     size={14} />,
    challenge: <CheckCircle2 size={14} />,
  }

  const goNext = () => {
    const next = SECTION_KEYS[sectionIdx + 1]
    if (next) setSection(next)
  }
  const goPrev = () => {
    const prev = SECTION_KEYS[sectionIdx - 1]
    if (prev) setSection(prev)
  }

  return (
    <div className="lp-root">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.header
        className="lp-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button className="lp-back-btn" onClick={() => navigate('/student/courses')}>
          <ArrowLeft size={14} /> Modules
        </button>

        <div className="lp-header-center">
          <span className="lp-module-badge">Module {moduleNumber}</span>
          <h1 className="lp-lesson-title">{lesson.title}</h1>
          <p className="lp-lesson-summary">{lesson.summary}</p>
        </div>

        <div className="lp-header-right">
          {lesson.complexityNote && (
            <span className="lp-complexity-badge">
              <Zap size={11} />{lesson.complexityNote}
            </span>
          )}
          <div className="lp-progress">
            <div
              className="lp-progress-fill"
              style={{ width: `${((sectionIdx + 1) / SECTION_KEYS.length) * 100}%` }}
            />
          </div>
          <span className="lp-progress-text">{sectionIdx + 1} / {SECTION_KEYS.length}</span>
        </div>
      </motion.header>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="lp-grid">

        {/* Left — content panel */}
        <div className="lp-content-col">

          {/* Section tabs */}
          <div className="lp-tabs">
            {SECTION_KEYS.map(key => (
              <button
                key={key}
                className={`lp-tab ${section === key ? 'active' : ''}`}
                onClick={() => setSection(key)}
              >
                {SECTION_ICONS[key]}
                {SECTION_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Section body */}
          <div className="lp-section-card">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="lp-section-body"
              >
                {/* OVERVIEW */}
                {section === 'overview' && (
                  <>
                    <div className="lp-objective-badge">
                      🎯 {lesson.objective}
                    </div>
                    <p className="lp-description">{lesson.description}</p>
                  </>
                )}

                {/* KEY POINTS */}
                {section === 'keypoints' && (
                  <ul className="lp-keypoints">
                    {lesson.keyPoints.map((pt, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <span className="lp-kp-bullet">▸</span>
                        {pt}
                      </motion.li>
                    ))}
                  </ul>
                )}

                {/* GUIDED STEPS */}
                {section === 'steps' && (
                  <ol className="lp-steps">
                    {lesson.steps.map((step, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <span className="lp-step-num">{i + 1}</span>
                        {step}
                      </motion.li>
                    ))}
                  </ol>
                )}

                {/* CHALLENGE */}
                {section === 'challenge' && (
                  <>
                    <p className="lp-challenge-prompt">{lesson.challenge.prompt}</p>
                    <div className="lp-checklist">
                      {checkResults.map(c => (
                        <CheckItem key={c.id} label={c.label} passed={c.passed} />
                      ))}
                    </div>
                    {allPassed && (
                      <motion.div
                        className="lp-all-passed"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        ✅ All checks passed — great work!
                      </motion.div>
                    )}
                    <button
                      className="lp-hint-toggle"
                      onClick={() => setShowHints(v => !v)}
                    >
                      {showHints ? 'Hide hints' : '💡 Show hints'}
                    </button>
                    <AnimatePresence>
                      {showHints && (
                        <motion.ul
                          className="lp-hints"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {lesson.hints.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Section navigation */}
          <div className="lp-section-nav">
            <button
              className="lp-nav-btn secondary"
              onClick={goPrev}
              disabled={sectionIdx === 0}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {section !== 'challenge' ? (
              <button className="lp-nav-btn primary" onClick={goNext}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                className="lp-nav-btn primary"
                onClick={() => setShowPractice(true)}
              >
                <Code2 size={14} /> Practice
              </button>
            )}
          </div>
        </div>

        {/* Right — concept visualizer */}
        <div className="lp-viz-col">
          <ConceptVisualizer type={lesson.visualizerType} lessonId={lesson.id} />
        </div>
      </div>

      {/* ── Practice panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPractice && (
          <motion.div
            className="lp-practice"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="lp-practice-header">
              <div>
                <h2>Practice <span className="lp-lang-badge">Java</span></h2>
                <p>Write your solution and watch the checks update live.</p>
              </div>
              <button className="lp-close-practice" onClick={() => setShowPractice(false)}>✕</button>
            </div>

            <div className="lp-practice-grid">
              {/* Editor */}
              <div className="lp-editor-card">
                <div className="lp-editor-topbar">
                  <div className="lp-editor-dots">
                    <span /><span /><span />
                  </div>
                  <span className="lp-editor-filename">Main.java</span>
                  <button
                    className="lp-run-btn"
                    onClick={() => setCode(lesson.starterCode)}
                    title="Reset to starter code"
                  >
                    <Play size={11} /> Reset
                  </button>
                </div>
                <CodeEditor value={code} onChange={setCode} language="java" />
              </div>

              {/* Right: expected output + live checks */}
              <div className="lp-output-col">
                <div className="lp-output-card">
                  <div className="lp-output-label">Expected Output</div>
                  <pre className="lp-output-pre">{lesson.expectedOutput}</pre>
                </div>

                <div className="lp-livechecks-card">
                  <div className="lp-output-label">Live Checks</div>
                  {checkResults.map(c => (
                    <CheckItem key={c.id} label={c.label} passed={c.passed} />
                  ))}
                  {allPassed && (
                    <motion.div
                      className="lp-all-passed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      ✅ All checks passed!
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Lesson navigation at the bottom */}
            <div className="lp-lesson-nav">
              {prevLesson ? (
                <button
                  className="lp-nav-btn secondary"
                  onClick={() => navigate(`/student/courses/${moduleId}/lessons/${prevLesson.id}`)}
                >
                  <ChevronLeft size={14} /> {prevLesson.title}
                </button>
              ) : <span />}

              {nextLesson ? (
                <button
                  className="lp-nav-btn primary"
                  onClick={async () => {
                    await markLessonComplete()
                    navigate(`/student/courses/${moduleId}/lessons/${nextLesson.id}`)
                  }}
                >
                  {nextLesson.title} <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  className="lp-nav-btn primary"
                  onClick={async () => {
                    await markLessonComplete()
                    navigate('/student/courses')
                  }}
                >
                  Finish Module ✓
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
