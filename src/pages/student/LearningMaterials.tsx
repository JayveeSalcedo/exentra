import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen, ChevronDown, Play, Download,
  Lock, CheckCircle2, Clock, FileText, Paperclip,
  Zap, Search, ExternalLink, ArrowRight, Target, User, ListChecks, Video,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import { COURSE_MODULES, COURSE_NAME, TOTAL_MODULES } from '../../lessons/course'
import { TOTAL_LESSONS } from '../../lessons/index'
import { computeCourseProgress, completedLessonSet, type UnlockState } from '../../lessons/progress'
import type { Lesson } from '../../lessons/types'
import ConfirmModal from '../../components/ui/ConfirmModal'
import './LearningMaterials.css'

interface Material {
  id: string
  title: string
  file_url: string
  file_type: string
  created_at: string
}

type DetailTab = 'lessons' | 'materials' | 'guide'

const easeOut = [0.16, 1, 0.3, 1] as const

export default function LearningMaterials() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openMaterialId = searchParams.get('open')
  const [highlightMaterialId, setHighlightMaterialId] = useState<string | null>(null)
  const materialRefs = useRef<Record<string, HTMLDivElement | null>>({})

  /** order_index → public.modules.id, so teacher uploads and progress rows line up */
  const [dbModuleIds, setDbModuleIds] = useState<Record<number, string>>({})
  const [materialsByOrder, setMaterialsByOrder] = useState<Record<number, Material[]>>({})
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  /** Module the student opened; undefined until they pick one (then we show their current module) */
  const [pickedOrder, setPickedOrder] = useState<number | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<DetailTab>('lessons')
  const [search, setSearch] = useState('')
  const [instructorName, setInstructorName] = useState<string | null>(null)
  const [pendingYoutubeUrl, setPendingYoutubeUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: dbModules, error: modErr } = await supabase
          .from('modules')
          .select('id, order_index')
          .order('order_index')
        if (modErr) console.error('modules error:', modErr)

        const idByOrder: Record<number, string> = {}
        const orderById: Record<string, number> = {}
        ;(dbModules ?? []).forEach((m: any) => {
          idByOrder[m.order_index] = m.id
          orderById[m.id] = m.order_index
        })
        setDbModuleIds(idByOrder)

        const { data: dbMaterials, error: matErr } = await supabase
          .from('materials')
          .select('id, title, file_url, file_type, module_id, created_at, block_id')
          .order('created_at', { ascending: false })
        if (matErr) console.error('materials error:', matErr)

        let myBlockId: string | null = null
        if (user) {
          const { data: enrollment } = await supabase
            .from('block_enrollments')
            .select('block_id')
            .eq('student_id', user.id)
            .eq('status', 'active')
            .maybeSingle()
          myBlockId = enrollment?.block_id ?? null

          if (myBlockId) {
            const { data: block } = await supabase
              .from('blocks')
              .select('teacher_id')
              .eq('id', myBlockId)
              .single()
            if (block?.teacher_id) {
              const { data: teacher } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', block.teacher_id)
                .single()
              if (teacher) setInstructorName(`${teacher.first_name} ${teacher.last_name}`.trim())
            }
          }

          const { data: dbProgress } = await supabase
            .from('student_progress')
            .select('lesson_id, completed')
            .eq('student_id', user.id)
          setCompleted(completedLessonSet(dbProgress))
        }

        const grouped: Record<number, Material[]> = {}
        ;(dbMaterials ?? [])
          .filter((mat: any) => !mat.block_id || mat.block_id === myBlockId)
          .forEach((mat: any) => {
            const order = orderById[mat.module_id]
            if (!order) return
            ;(grouped[order] ??= []).push(mat)
          })
        setMaterialsByOrder(grouped)

        // Deep link from a notification (?open=<material_id>) — expand the
        // module that contains it and jump straight to the Materials tab.
        if (openMaterialId) {
          const owning = Object.entries(grouped).find(([, mats]) => mats.some(m => m.id === openMaterialId))
          if (owning) {
            setPickedOrder(Number(owning[0]))
            setActiveTab('materials')
            setHighlightMaterialId(openMaterialId)
            setTimeout(() => {
              materialRefs.current[openMaterialId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 200)
            setTimeout(() => setHighlightMaterialId(null), 2500)
          }
          searchParams.delete('open')
          setSearchParams(searchParams, { replace: true })
        }
      } catch (err) {
        console.error('fetchData error:', err)
      }
    }
    fetchData()
  }, [user])

  const progress = useMemo(() => computeCourseProgress(completed), [completed])

  // Until the student picks a module, open the first one that still has something to do
  const expandedOrder = pickedOrder !== undefined
    ? pickedOrder
    : progress.find(p => p.state === 'active')?.module.order ?? 1

  const q = search.trim().toLowerCase()
  const filtered = progress.filter(p =>
    !q ||
    p.module.title.toLowerCase().includes(q) ||
    p.lessons.some(l => l.lesson.title.toLowerCase().includes(q))
  )

  const completedLessons = progress.reduce((acc, p) => acc + p.completedCount, 0)
  const overallPct = TOTAL_LESSONS ? Math.round((completedLessons / TOTAL_LESSONS) * 100) : 0
  const completedModulesCount = progress.filter(p => p.state === 'done').length
  const completedMinutes = progress.reduce((acc, p) =>
    acc + p.lessons.filter(l => l.state === 'done').reduce((a, l) => a + l.lesson.durationMinutes, 0), 0)
  const hoursCompleted = Math.round((completedMinutes / 60) * 10) / 10

  const expanded = progress.find(p => p.module.order === expandedOrder) ?? null
  const expandedMaterials = expanded ? materialsByOrder[expanded.module.order] ?? [] : []

  const moduleKey = (order: number) => dbModuleIds[order] ?? String(order)

  const handleStartLesson = (order: number, lesson: Lesson, state: UnlockState) => {
    if (state === 'locked') return
    navigate(`/student/courses/${moduleKey(order)}/lessons/${lesson.id}`)
  }

  return (
    <div className="lm-root">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div className="lm-header"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <div className="lm-header-left">
          <div className="lm-header-icon">
            <BookOpen size={20} color="#00D4AA" />
          </div>
          <div>
            <h1 className="lm-title">Learning Materials</h1>
            <p className="lm-subtitle">{COURSE_NAME}</p>
            {instructorName && (
              <p className="lm-instructor"><User size={12} /> {instructorName}</p>
            )}
          </div>
        </div>
        <div className="lm-header-stats">
          <div className="lm-header-stat">
            <span className="lm-header-stat-val">{overallPct}%</span>
            <span className="lm-header-stat-label">Complete</span>
          </div>
          <div className="lm-header-stat">
            <span className="lm-header-stat-val">{completedLessons}/{TOTAL_LESSONS}</span>
            <span className="lm-header-stat-label">Lessons</span>
          </div>
          <div className="lm-header-stat">
            <span className="lm-header-stat-val">{TOTAL_MODULES}</span>
            <span className="lm-header-stat-label">Modules</span>
          </div>
        </div>
      </motion.div>

      {/* ── Summary stats bar ──────────────────────────────────────────── */}
      <motion.div
        className="lm-stats-bar"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: easeOut }}
      >
        {[
          { label: 'Modules Done',    value: `${completedModulesCount} / ${TOTAL_MODULES}`, color: '#00D4AA' },
          { label: 'Lessons Done',    value: `${completedLessons} / ${TOTAL_LESSONS}`,     color: '#6C8EF5' },
          { label: 'Hours Completed', value: `${hoursCompleted}h`,                          color: '#FFB830' },
          { label: 'Total XP',        value: (user?.xp ?? 0).toLocaleString(),              color: '#FF6B8A' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="lm-stat-card"
            style={{ '--tile-accent': stat.color } as React.CSSProperties}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease: easeOut }}
          >
            <span className="lm-stat-val" style={{ color: stat.color }}>{stat.value}</span>
            <span className="lm-stat-label">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Overall progress bar ───────────────────────────────────────── */}
      <motion.div className="lm-progress-bar-card"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: easeOut }}
      >
        <div className="lm-progress-bar-header">
          <span className="lm-progress-bar-label">Course Progress</span>
          <span className="lm-progress-bar-pct">{overallPct}%</span>
        </div>
        <div className="lm-progress-track">
          <motion.div className="lm-progress-fill"
            initial={{ width: 0 }} animate={{ width: `${overallPct}%` }}
            transition={{ duration: 1.2, delay: 0.4, ease: easeOut }}
          />
        </div>
      </motion.div>

      <div className="lm-layout">

        {/* ── Module list panel ──────────────────────────────────────────── */}
        <div className="lm-modules-panel">
          <div className="lm-search-row">
            <div className="lm-search-box">
              <Search size={14} color="var(--text-muted)" />
              <input
                className="lm-search-input"
                placeholder="Search modules or lessons…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="lm-module-list">
            {filtered.map((mp, i) => {
              const { module: mod, state, lessons, completedCount, nextLesson } = mp
              const isExpanded = expandedOrder === mod.order
              const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0
              const totalMins = lessons.reduce((a, l) => a + l.lesson.durationMinutes, 0)
              const remainingMins = lessons.filter(l => l.state !== 'done').reduce((a, l) => a + l.lesson.durationMinutes, 0)
              const prevMod = COURSE_MODULES.find(m => m.order === mod.order - 1)

              return (
                <motion.div
                  key={mod.order}
                  className={`lm-mod-card ${state} ${isExpanded ? 'expanded' : ''}`}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: easeOut }}
                >
                  <button
                    className="lm-mod-header"
                    onClick={() => setPickedOrder(isExpanded ? null : mod.order)}
                  >
                    <div className="lm-mod-icon" style={{ color: state === 'locked' ? undefined : mod.color }}>{mod.icon}</div>
                    <div className="lm-mod-info">
                      <div className="lm-mod-top-row">
                        <span className="lm-mod-num">Module {mod.order}</span>
                        {state === 'done' && <CheckCircle2 size={13} color="#00D4AA" />}
                        {state === 'locked' && <Lock size={11} color="var(--text-muted)" />}
                        {state === 'active' && <span className="lm-mod-active-badge">{completedCount > 0 ? 'IN PROGRESS' : 'UNLOCKED'}</span>}
                      </div>
                      <span className="lm-mod-title">{mod.title}</span>
                      <div className="lm-mod-meta">
                        <span>
                          <Clock size={10} />
                          {state === 'active' && completedCount > 0 ? `${remainingMins} min left` : `${totalMins} min`}
                        </span>
                        <span><Zap size={10} color="#FFB830" /> {mod.xpReward} XP</span>
                        <span>{completedCount}/{lessons.length} lessons</span>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25 }} className="lm-mod-chevron">
                      <ChevronDown size={16} />
                    </motion.div>
                  </button>

                  {state === 'locked' && prevMod && (
                    <div className="lm-mod-lock-hint">
                      Complete <strong>{prevMod.title}</strong> to unlock
                    </div>
                  )}

                  {state !== 'locked' && (
                    <div className="lm-mod-mini-bar-track">
                      <motion.div
                        className="lm-mod-mini-bar-fill"
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                        style={{ background: state === 'done' ? '#00D4AA' : 'linear-gradient(90deg,#3B5BDB,#00D4AA)' }}
                      />
                    </div>
                  )}

                  {state === 'active' && nextLesson && !isExpanded && (
                    <div className="lm-mod-resume-row">
                      <button
                        className="lm-mod-resume-btn"
                        onClick={e => {
                          e.stopPropagation()
                          handleStartLesson(mod.order, nextLesson, 'active')
                        }}
                      >
                        <Play size={11} /> {completedCount > 0 ? 'Resume' : 'Start'} — {nextLesson.title}
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        className="lm-mod-lessons"
                        key="lessons-dropdown"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {lessons.map(({ lesson, state: ls }) => (
                            <div key={lesson.id} className={`lm-lesson-item ${ls}`}>
                              <div className="lm-lesson-indicator">
                                {ls === 'done'    ? <CheckCircle2 size={14} color="#00D4AA" />
                                 : ls === 'locked' ? <Lock size={12} color="var(--text-muted)" />
                                 : <div className="lm-lesson-dot" />}
                              </div>
                              <div className="lm-lesson-body">
                                <span className="lm-lesson-title">{lesson.title}</span>
                                <span className="lm-lesson-meta">
                                  <Clock size={10} /> {lesson.durationMinutes} min
                                </span>
                              </div>
                              {ls !== 'locked' && (
                                <button
                                  className="lm-lesson-play"
                                  onClick={() => handleStartLesson(mod.order, lesson, ls)}
                                >
                                  <Play size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* ── Detail panel ───────────────────────────────────────────────── */}
        <div className="lm-detail-panel">
          {expanded ? (
            <motion.div key={expanded.module.order}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <div className="lm-detail-header">
                <span className="lm-detail-icon" style={{ color: expanded.module.color }}>{expanded.module.icon}</span>
                <div style={{ flex: 1 }}>
                  <p className="lm-detail-module-num">Module {expanded.module.order} of {TOTAL_MODULES} · {expanded.module.tag}</p>
                  <h2 className="lm-detail-title">{expanded.module.title}</h2>
                </div>
                <div className="lm-detail-ratio-badge">
                  <Target size={11} />
                  {expanded.completedCount} / {expanded.lessons.length} done
                </div>
              </div>

              <p className="lm-detail-desc">{expanded.module.description}</p>

              <a
                className="lm-guide-pdf-btn"
                href={expanded.module.pdf}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={13} /> Open Study Guide (PDF)
                <ExternalLink size={12} />
              </a>

              {expanded.state === 'active' && expanded.nextLesson && (
                <motion.div
                  className="lm-detail-cta"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="lm-detail-cta-left">
                    <span className="lm-detail-cta-label">Up next</span>
                    <span className="lm-detail-cta-lesson">{expanded.nextLesson.title}</span>
                    <span className="lm-detail-cta-meta">
                      <Clock size={10} /> {expanded.nextLesson.durationMinutes} min
                    </span>
                  </div>
                </motion.div>
              )}

              {expanded.state === 'done' && (
                <div className="lm-detail-cta lm-detail-cta--done">
                  <CheckCircle2 size={16} color="#00D4AA" />
                  <span className="lm-detail-cta-done-text">Module complete! All lessons finished.</span>
                </div>
              )}

              {expanded.state === 'locked' && (
                <div className="lm-detail-cta lm-detail-cta--locked">
                  <Lock size={15} color="var(--text-muted)" />
                  <span className="lm-detail-cta-done-text">
                    Finish Module {expanded.module.order - 1} to unlock these lessons. You can still read the study guide.
                  </span>
                </div>
              )}

              <div className="lm-tabs">
                {(['lessons', 'materials', 'guide'] as const).map(tab => (
                  <button key={tab} className={`lm-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                    {tab === 'lessons' && <><Play size={12} /> Lessons</>}
                    {tab === 'materials' && (
                      <>
                        <Paperclip size={12} /> Materials
                        {expandedMaterials.length > 0 && (
                          <span className="lm-tab-badge">{expandedMaterials.length}</span>
                        )}
                      </>
                    )}
                    {tab === 'guide' && <><ListChecks size={12} /> Study Guide</>}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'lessons' && (
                  <motion.div key="lessons" className="lm-tab-content"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  >
                    {expanded.lessons.map(({ lesson, state: ls }, i) => (
                      <div key={lesson.id} className={`lm-detail-lesson ${ls}`}>
                        <div className="lm-detail-lesson-num">{i + 1}</div>
                        <div className="lm-detail-lesson-info">
                          <span className="lm-detail-lesson-title">{lesson.title}</span>
                          <div className="lm-detail-lesson-meta">
                            <Clock size={11} /> {lesson.durationMinutes} min · Study Guide pp. {lesson.source.pages}
                          </div>
                        </div>
                        <div className="lm-detail-lesson-right">
                          {lesson.youtubeUrl && (
                            <button
                              type="button"
                              className="lm-lesson-yt-btn"
                              title="Watch on YouTube"
                              onClick={() => setPendingYoutubeUrl(lesson.youtubeUrl!)}
                            >
                              <Video size={14} />
                            </button>
                          )}
                          {ls === 'done' && (
                            <button
                              className="lm-detail-review-btn"
                              onClick={() => handleStartLesson(expanded.module.order, lesson, ls)}
                              title="Review lesson"
                            >
                              <CheckCircle2 size={16} color="#00D4AA" />
                            </button>
                          )}
                          {ls === 'active' && (
                            <button
                              className="lm-detail-play-btn"
                              onClick={() => handleStartLesson(expanded.module.order, lesson, ls)}
                            >
                              <Play size={12} /> Start
                            </button>
                          )}
                          {ls === 'locked' && <Lock size={14} color="var(--text-muted)" />}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'materials' && (
                  <motion.div key="materials" className="lm-tab-content"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  >
                    {expandedMaterials.length === 0 ? (
                      <div className="lm-empty-state">
                        <Paperclip size={28} color="var(--text-muted)" />
                        <p>No materials uploaded yet for this module.</p>
                        <span>Your instructor will upload files here.</span>
                      </div>
                    ) : (
                      expandedMaterials.map(mat => (
                        <div
                          key={mat.id}
                          ref={el => { materialRefs.current[mat.id] = el }}
                          className={`lm-material-item ${mat.id === highlightMaterialId ? 'lm-material-highlight' : ''}`}
                        >
                          <div className="lm-material-icon">
                            <FileText size={16} color="#3B5BDB" />
                          </div>
                          <div className="lm-material-info">
                            <span className="lm-material-title">{mat.title}</span>
                            <span className="lm-material-meta">
                              {mat.file_type.toUpperCase()} · Uploaded {new Date(mat.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="lm-material-dl">
                            <Download size={14} />
                          </a>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {activeTab === 'guide' && (
                  <motion.div key="guide" className="lm-tab-content lm-guide-content"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  >
                    <section className="lm-guide-section">
                      <h4>Module Overview</h4>
                      <p>{expanded.module.overview}</p>
                    </section>
                    <section className="lm-guide-section">
                      <h4>Learning Objectives</h4>
                      <ul>{expanded.module.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                    </section>
                    <section className="lm-guide-section">
                      <h4>Learning Points</h4>
                      <ul>{expanded.module.learningPoints.map((o, i) => <li key={i}>{o}</li>)}</ul>
                    </section>
                    <section className="lm-guide-section">
                      <h4>Learning Activities</h4>
                      <ol>{expanded.module.learningActivities.map((o, i) => <li key={i}>{o}</li>)}</ol>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="lm-detail-empty">
              <BookOpen size={36} color="var(--text-muted)" />
              <p>Select a module to view its content</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!pendingYoutubeUrl}
        icon={<Video size={24} strokeWidth={1.8} />}
        title="Leave Exentra?"
        description="This will open YouTube in a new tab."
        confirmLabel="Continue to YouTube"
        onConfirm={() => {
          if (pendingYoutubeUrl) window.open(pendingYoutubeUrl, '_blank', 'noopener,noreferrer')
          setPendingYoutubeUrl(null)
        }}
        onCancel={() => setPendingYoutubeUrl(null)}
      />
    </div>
  )
}
