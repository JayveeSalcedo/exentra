import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, ChevronDown, Play, Download,
  Lock, CheckCircle2, Clock, FileText, Video, Paperclip,
  Zap, Search, ExternalLink, ArrowRight, Target
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import './LearningMaterials.css'

interface Lesson {
  id: string
  title: string
  duration_minutes: number
  order_index: number
}

interface Material {
  id: string
  title: string
  file_url: string
  file_type: string
  created_at: string
}

interface Module {
  id: string
  title: string
  description: string
  order_index: number
  xp_reward: number
  lessons: Lesson[]
  materials: Material[]
}

interface StudentProgress {
  lesson_id: string
  completed: boolean
}

const YT_LINKS: Record<number, { title: string; url: string }[]> = {
  1: [
    { title: 'Arrays in Java – Bro Code', url: 'https://www.youtube.com/watch?v=ei_4Nt7XWkw' },
    { title: 'ArrayList vs Array – Alex Lee', url: 'https://www.youtube.com/watch?v=NbYgm0r7u6o' },
  ],
  2: [
    { title: 'Linked Lists Explained – freeCodeCamp', url: 'https://www.youtube.com/watch?v=F8AbOfQwl1c' },
    { title: 'Singly vs Doubly Linked List', url: 'https://www.youtube.com/watch?v=UwplnKiHPCk' },
  ],
  3: [
    { title: 'Stack Data Structure – mycodeschool', url: 'https://www.youtube.com/watch?v=F1Zzww9Loos' },
    { title: 'Queue Data Structure – mycodeschool', url: 'https://www.youtube.com/watch?v=okr-XE8yTO8' },
  ],
  4: [
    { title: 'Binary Trees – freeCodeCamp', url: 'https://www.youtube.com/watch?v=fAAZixBzIAI' },
    { title: 'BST Insert/Delete – mycodeschool', url: 'https://www.youtube.com/watch?v=gcULXE7ViZw' },
  ],
  5: [
    { title: 'Graphs for Beginners – CS Dojo', url: 'https://www.youtube.com/watch?v=gXgEDyodOJU' },
    { title: 'BFS and DFS – freeCodeCamp', url: 'https://www.youtube.com/watch?v=tWVWeAqZ0WU' },
  ],
  6: [
    { title: 'Sorting Algorithms Visualized', url: 'https://www.youtube.com/watch?v=kPRA0W1kECg' },
    { title: 'Searching Algorithms – CS50', url: 'https://www.youtube.com/watch?v=DSffdCT4lSY' },
  ],
  7: [
    { title: 'Binary Search – freeCodeCamp', url: 'https://www.youtube.com/watch?v=P3YID7liBug' },
    { title: 'Linear vs Binary Search', url: 'https://www.youtube.com/watch?v=C46QfTjVCNU' },
  ],
  8: [
    { title: 'Hashing Explained – CS Dojo', url: 'https://www.youtube.com/watch?v=KyUTuwz_b7Q' },
    { title: 'Hash Tables – Paul Programming', url: 'https://www.youtube.com/watch?v=MfhjkfocRR0' },
  ],
}

const MOCK_MODULES: Module[] = [
  {
    id: '1', title: 'Arrays & Array Lists', order_index: 1, xp_reward: 380,
    description: 'Understand contiguous memory storage, indexing, and dynamic resizing through ArrayList.',
    lessons: [
      { id: 'l1-1', title: 'Introduction to Arrays', duration_minutes: 15, order_index: 1 },
      { id: 'l1-2', title: 'Array Operations (CRUD)', duration_minutes: 20, order_index: 2 },
      { id: 'l1-3', title: 'Multi-dimensional Arrays', duration_minutes: 18, order_index: 3 },
      { id: 'l1-4', title: 'ArrayList & Dynamic Arrays', duration_minutes: 22, order_index: 4 },
    ],
    materials: [],
  },
  {
    id: '2', title: 'Lists & Linked Lists', order_index: 2, xp_reward: 350,
    description: 'Master singly and doubly linked list structures, pointers, and common operations.',
    lessons: [
      { id: 'l2-1', title: 'Singly Linked Lists', duration_minutes: 20, order_index: 1 },
      { id: 'l2-2', title: 'Doubly Linked Lists', duration_minutes: 22, order_index: 2 },
      { id: 'l2-3', title: 'Circular Linked Lists', duration_minutes: 18, order_index: 3 },
      { id: 'l2-4', title: 'List Operations & Complexity', duration_minutes: 15, order_index: 4 },
    ],
    materials: [],
  },
  {
    id: '3', title: 'Stacks', order_index: 3, xp_reward: 350,
    description: 'Explore LIFO structures, stack-based problem solving, and real-world applications.',
    lessons: [
      { id: 'l3-1', title: 'Stack Fundamentals', duration_minutes: 15, order_index: 1 },
      { id: 'l3-2', title: 'Push, Pop, Peek Operations', duration_minutes: 18, order_index: 2 },
      { id: 'l3-3', title: 'Stack Applications', duration_minutes: 20, order_index: 3 },
    ],
    materials: [],
  },
  {
    id: '4', title: 'Queues', order_index: 4, xp_reward: 350,
    description: 'Learn FIFO structures, circular queues, priority queues, and dequeues.',
    lessons: [
      { id: 'l4-1', title: 'Queue Fundamentals', duration_minutes: 15, order_index: 1 },
      { id: 'l4-2', title: 'Circular Queue', duration_minutes: 18, order_index: 2 },
      { id: 'l4-3', title: 'Priority Queue & Dequeue', duration_minutes: 20, order_index: 3 },
    ],
    materials: [],
  },
  {
    id: '5', title: 'Trees', order_index: 5, xp_reward: 450,
    description: 'Understand tree hierarchy, binary trees, BST, traversals, and balanced trees.',
    lessons: [
      { id: 'l5-1', title: 'Tree Terminology', duration_minutes: 12, order_index: 1 },
      { id: 'l5-2', title: 'Binary Search Trees', duration_minutes: 25, order_index: 2 },
      { id: 'l5-3', title: 'Tree Traversals (In/Pre/Post)', duration_minutes: 22, order_index: 3 },
      { id: 'l5-4', title: 'AVL & Balanced Trees', duration_minutes: 28, order_index: 4 },
    ],
    materials: [],
  },
  {
    id: '6', title: 'Graphs', order_index: 6, xp_reward: 480,
    description: 'Explore graph representations, traversal algorithms (BFS/DFS), and shortest paths.',
    lessons: [
      { id: 'l6-1', title: 'Graph Representations', duration_minutes: 18, order_index: 1 },
      { id: 'l6-2', title: 'BFS & DFS', duration_minutes: 25, order_index: 2 },
      { id: 'l6-3', title: 'Shortest Path – Dijkstra', duration_minutes: 28, order_index: 3 },
    ],
    materials: [],
  },
  {
    id: '7', title: 'Sorting & Searching', order_index: 7, xp_reward: 400,
    description: 'Study classic sorting algorithms, their complexities, and searching strategies.',
    lessons: [
      { id: 'l7-1', title: 'Bubble & Selection Sort', duration_minutes: 18, order_index: 1 },
      { id: 'l7-2', title: 'Merge Sort & Quick Sort', duration_minutes: 25, order_index: 2 },
      { id: 'l7-3', title: 'Linear & Binary Search', duration_minutes: 18, order_index: 3 },
    ],
    materials: [],
  },
  {
    id: '8', title: 'Hashing', order_index: 8, xp_reward: 420,
    description: 'Understand hash functions, collision handling, and hash table applications.',
    lessons: [
      { id: 'l8-1', title: 'Hash Functions', duration_minutes: 18, order_index: 1 },
      { id: 'l8-2', title: 'Collision Resolution', duration_minutes: 22, order_index: 2 },
      { id: 'l8-3', title: 'Hash Tables in Practice', duration_minutes: 20, order_index: 3 },
    ],
    materials: [],
  },
]

const MOCK_LESSONS_BY_ORDER: Record<number, Lesson[]> = Object.fromEntries(
  MOCK_MODULES.map(m => [m.order_index, m.lessons])
)

const MOCK_UNLOCK_STATE: Record<string, 'done' | 'active' | 'locked'> = {
  '1': 'done', '2': 'done', '3': 'active',
  '4': 'locked', '5': 'locked', '6': 'locked', '7': 'locked', '8': 'locked',
}

const MODULE_ICONS: Record<number, string> = {
  1: '[ ]', 2: '→', 3: '≡', 4: '⊏', 5: '△', 6: '◈', 7: '⇅', 8: '#',
}

const easeOut = [0.16, 1, 0.3, 1] as const

export default function LearningMaterials() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState<Module[]>(MOCK_MODULES)
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [expandedModule, setExpandedModule] = useState<string | null>(MOCK_MODULES[0].id)
  const [activeTab, setActiveTab] = useState<'lessons' | 'materials' | 'videos'>('lessons')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: dbModules, error: modErr } = await supabase
          .from('modules')
          .select(`
            id, title, description, order_index, xp_reward,
            lessons (id, title, duration_minutes, order_index)
          `)
          .order('order_index')

        if (modErr) console.error('modules error:', modErr)

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
        }

        const visibleMaterials = (dbMaterials ?? []).filter((mat: any) =>
          !mat.block_id || mat.block_id === myBlockId
        )

        if (user) {
          const { data: dbProgress } = await supabase
            .from('student_progress')
            .select('lesson_id, completed')
            .eq('student_id', user.id)
          if (dbProgress) setProgress(dbProgress)
        }

        if (dbModules && dbModules.length > 0) {
          const merged = dbModules.map((m: any) => {
            // Always use hardcoded lesson IDs so they match what LessonPlayer saves to student_progress
            const lessons = MOCK_LESSONS_BY_ORDER[m.order_index] ?? m.lessons ?? []
            return {
              ...m,
              lessons,
              materials: visibleMaterials.filter((mat: any) => mat.module_id === m.id),
            }
          })
          setModules(merged)
          setExpandedModule(merged[0].id)
        }
      } catch (err) {
        console.error('fetchData error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const getModuleState = (mod: Module): 'done' | 'active' | 'locked' => {
    const lessonIds = mod.lessons.map(l => l.id)
    const completedCount = progress.filter(p => lessonIds.includes(p.lesson_id) && p.completed).length
    if (lessonIds.length > 0 && completedCount === lessonIds.length) return 'done'
    if (completedCount > 0) return 'active'
    // Module 1 is always unlocked
    if (mod.order_index === 1) return 'active'
    // Unlock this module only if the previous module is fully done
    const prevMod = modules.find(m => m.order_index === mod.order_index - 1)
    if (prevMod) {
      const prevLessonIds = prevMod.lessons.map(l => l.id)
      const prevCompleted = progress.filter(p => prevLessonIds.includes(p.lesson_id) && p.completed).length
      if (prevLessonIds.length > 0 && prevCompleted === prevLessonIds.length) return 'active'
    }
    return 'locked'
  }

  const getLessonState = (lesson: Lesson, mod: Module, modState: string): 'done' | 'active' | 'locked' => {
    if (modState === 'locked') return 'locked'
    if (progress.find(p => p.lesson_id === lesson.id && p.completed)) return 'done'
    // Find first incomplete lesson in this module — only that one is active
    const firstIncomplete = mod.lessons
      .slice().sort((a, b) => a.order_index - b.order_index)
      .find(l => !progress.find(p => p.lesson_id === l.id && p.completed))
    if (firstIncomplete?.id === lesson.id) return 'active'
    return 'locked'
  }

  // Find the first incomplete lesson in a module for the Resume button
  const getFirstIncompleteLesson = (mod: Module): Lesson | null => {
    const state = getModuleState(mod)
    if (state === 'locked') return null
    return mod.lessons.find(l => !progress.find(p => p.lesson_id === l.id && p.completed)) ?? null
  }

  const filteredModules = modules.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.lessons.some(l => l.title.toLowerCase().includes(search.toLowerCase()))
  )

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progress.filter(p => p.completed).length
  const overallPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 13

  // Derived stats for the summary bar
  const completedModulesCount = modules.filter(m => getModuleState(m) === 'done').length
  const totalMinutes = modules.reduce((acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration_minutes, 0), 0)
  const completedMinutes = modules.reduce((acc, m) => {
    return acc + m.lessons
      .filter(l => progress.find(p => p.lesson_id === l.id && p.completed))
      .reduce((a, l) => a + l.duration_minutes, 0)
  }, 0)
  const hoursCompleted = Math.round(completedMinutes / 60 * 10) / 10

  const expandedMod = modules.find(m => m.id === expandedModule)
  const expandedState = expandedMod ? getModuleState(expandedMod) : 'locked'

  // First incomplete lesson in the detail panel's module
  const detailFirstIncomplete = expandedMod ? getFirstIncompleteLesson(expandedMod) : null

  // Completed lesson count for detail panel
  const detailCompletedCount = expandedMod
    ? progress.filter(p => expandedMod.lessons.some(l => l.id === p.lesson_id) && p.completed).length
    : 0

  const handleStartLesson = (moduleId: string, lessonId: string, lessonState: 'done' | 'active' | 'locked') => {
    if (lessonState === 'locked') return
    navigate(`/student/courses/${moduleId}/lessons/${lessonId}`)
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
            <p className="lm-subtitle">CC 104 – Data Structures & Algorithms</p>
          </div>
        </div>
        <div className="lm-header-stats">
          <div className="lm-header-stat">
            <span className="lm-header-stat-val">{overallPct}%</span>
            <span className="lm-header-stat-label">Complete</span>
          </div>
          <div className="lm-header-stat">
            <span className="lm-header-stat-val">{completedLessons || 6}/{totalLessons}</span>
            <span className="lm-header-stat-label">Lessons</span>
          </div>
          <div className="lm-header-stat">
            <span className="lm-header-stat-val">8</span>
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
          { label: 'Modules Done',    value: `${completedModulesCount} / ${modules.length}`, color: '#00D4AA' },
          { label: 'Lessons Done',    value: `${completedLessons || 6} / ${totalLessons}`,    color: '#9B7ED4' },
          { label: 'Hours Completed', value: `${hoursCompleted}h`,                            color: '#FFB830' },
          { label: 'Total XP',        value: (user?.xp ?? 0).toLocaleString(),                color: '#FF6B8A' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="lm-stat-card"
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
            {filteredModules.map((mod, i) => {
              const state = getModuleState(mod)
              const isExpanded = expandedModule === mod.id
              const completedInMod = progress.filter(
                p => mod.lessons.some(l => l.id === p.lesson_id) && p.completed
              ).length
              const pct = mod.lessons.length
                ? Math.round((completedInMod / mod.lessons.length) * 100)
                : state === 'done' ? 100 : 0
              const firstIncomplete = getFirstIncompleteLesson(mod)
              const remainingMins = mod.lessons
                .filter(l => !progress.find(p => p.lesson_id === l.id && p.completed))
                .reduce((a, l) => a + l.duration_minutes, 0)

              // Locked hint: find the previous module's title
              const prevMod = modules.find(m => m.order_index === mod.order_index - 1)

              return (
                <motion.div
                  key={mod.id}
                  className={`lm-mod-card ${state} ${isExpanded ? 'expanded' : ''}`}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: easeOut }}
                >
                  <button
                    className="lm-mod-header"
                    onClick={() => { if (state !== 'locked') setExpandedModule(isExpanded ? null : mod.id) }}
                    disabled={state === 'locked'}
                  >
                    <div className="lm-mod-icon">{MODULE_ICONS[mod.order_index]}</div>
                    <div className="lm-mod-info">
                      <div className="lm-mod-top-row">
                        <span className="lm-mod-num">Module {mod.order_index}</span>
                        {state === 'done' && <CheckCircle2 size={13} color="#00D4AA" />}
                        {state === 'locked' && <Lock size={11} color="var(--text-muted)" />}
                        {state === 'active' && <span className="lm-mod-active-badge">IN PROGRESS</span>}
                      </div>
                      <span className="lm-mod-title">{mod.title}</span>
                      <div className="lm-mod-meta">
                        <span>
                          <Clock size={10} />
                          {state === 'locked'
                            ? `${mod.lessons.reduce((a, l) => a + l.duration_minutes, 0)} min total`
                            : state === 'done'
                            ? `${mod.lessons.reduce((a, l) => a + l.duration_minutes, 0)} min`
                            : remainingMins > 0 ? `${remainingMins} min left` : 'Almost done'}
                        </span>
                        <span><Zap size={10} color="#FFB830" /> {mod.xp_reward} XP</span>
                        <span>{completedInMod}/{mod.lessons.length} lessons</span>
                      </div>
                    </div>
                    {state !== 'locked' && (
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25 }} className="lm-mod-chevron">
                        <ChevronDown size={16} />
                      </motion.div>
                    )}
                  </button>

                  {/* Locked hint */}
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
                        style={{ background: state === 'done' ? '#00D4AA' : 'linear-gradient(90deg,#7C5CBF,#00D4AA)' }}
                      />
                    </div>
                  )}

                  {/* Resume button — only on active modules, outside the accordion */}
                  {state === 'active' && firstIncomplete && !isExpanded && (
                    <div className="lm-mod-resume-row">
                      <button
                        className="lm-mod-resume-btn"
                        onClick={e => {
                          e.stopPropagation()
                          handleStartLesson(mod.id, firstIncomplete.id, 'active')
                        }}
                      >
                        <Play size={11} /> Resume — {firstIncomplete.title}
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {isExpanded && state !== 'locked' && (
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
                          {mod.lessons.map(lesson => {
                            const ls = getLessonState(lesson, mod, state)
                            return (
                              <div key={lesson.id} className={`lm-lesson-item ${ls}`}>
                                <div className="lm-lesson-indicator">
                                  {ls === 'done'    ? <CheckCircle2 size={14} color="#00D4AA" />
                                   : ls === 'locked' ? <Lock size={12} color="var(--text-muted)" />
                                   : <div className="lm-lesson-dot" />}
                                </div>
                                <div className="lm-lesson-body">
                                  <span className="lm-lesson-title">{lesson.title}</span>
                                  <span className="lm-lesson-meta">
                                    <Clock size={10} /> {lesson.duration_minutes} min
                                  </span>
                                </div>
                                {ls !== 'locked' && (
                                  <button
                                    className="lm-lesson-play"
                                    onClick={() => handleStartLesson(mod.id, lesson.id, ls)}
                                  >
                                    <Play size={11} />
                                  </button>
                                )}
                              </div>
                            )
                          })}
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
          {expandedMod ? (
            <motion.div key={expandedMod.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <div className="lm-detail-header">
                <span className="lm-detail-icon">{MODULE_ICONS[expandedMod.order_index]}</span>
                <div style={{ flex: 1 }}>
                  <p className="lm-detail-module-num">Module {expandedMod.order_index} of 8</p>
                  <h2 className="lm-detail-title">{expandedMod.title}</h2>
                </div>
                {/* Lesson ratio badge */}
                <div className="lm-detail-ratio-badge">
                  <Target size={11} />
                  {detailCompletedCount} / {expandedMod.lessons.length} done
                </div>
              </div>

              <p className="lm-detail-desc">{expandedMod.description}</p>

              {/* Continue CTA — only when module is active and has an incomplete lesson */}
              {expandedState === 'active' && detailFirstIncomplete && (
                <motion.div
                  className="lm-detail-cta"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="lm-detail-cta-left">
                    <span className="lm-detail-cta-label">Up next</span>
                    <span className="lm-detail-cta-lesson">{detailFirstIncomplete.title}</span>
                    <span className="lm-detail-cta-meta">
                      <Clock size={10} /> {detailFirstIncomplete.duration_minutes} min
                    </span>
                  </div>
                  <button
                    className="lm-detail-cta-btn"
                    onClick={() => handleStartLesson(expandedMod.id, detailFirstIncomplete.id, 'active')}
                  >
                    <Play size={13} /> Continue
                    <ArrowRight size={13} />
                  </button>
                </motion.div>
              )}

              {/* Done CTA — all lessons complete */}
              {expandedState === 'done' && (
                <div className="lm-detail-cta lm-detail-cta--done">
                  <CheckCircle2 size={16} color="#00D4AA" />
                  <span className="lm-detail-cta-done-text">Module complete! All lessons finished.</span>
                </div>
              )}

              <div className="lm-tabs">
                {(['lessons', 'materials', 'videos'] as const).map(tab => (
                  <button key={tab} className={`lm-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                    {tab === 'lessons'   && <><Play size={12} /> Lessons</>}
                    {tab === 'materials' && (
                      <>
                        <FileText size={12} /> Materials
                        {expandedMod.materials.length > 0 && (
                          <span className="lm-tab-badge">{expandedMod.materials.length}</span>
                        )}
                      </>
                    )}
                    {tab === 'videos'    && <><Video size={12} /> Video Links</>}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'lessons' && (
                  <motion.div key="lessons" className="lm-tab-content"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  >
                    {expandedMod.lessons.map((lesson, i) => {
                      const ls = getLessonState(lesson, expandedMod, expandedState)
                      return (
                        <div key={lesson.id} className={`lm-detail-lesson ${ls}`}>
                          <div className="lm-detail-lesson-num">{i + 1}</div>
                          <div className="lm-detail-lesson-info">
                            <span className="lm-detail-lesson-title">{lesson.title}</span>
                            <div className="lm-detail-lesson-meta">
                              <Clock size={11} /> {lesson.duration_minutes} min
                            </div>
                          </div>
                          <div className="lm-detail-lesson-right">
                            {ls === 'done'   && <CheckCircle2 size={16} color="#00D4AA" />}
                            {ls === 'active' && (
                              <button
                                className="lm-detail-play-btn"
                                onClick={() => handleStartLesson(expandedMod.id, lesson.id, ls)}
                              >
                                <Play size={12} /> Start
                              </button>
                            )}
                            {ls === 'locked' && <Lock size={14} color="var(--text-muted)" />}
                          </div>
                        </div>
                      )
                    })}
                  </motion.div>
                )}

                {activeTab === 'materials' && (
                  <motion.div key="materials" className="lm-tab-content"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  >
                    {expandedMod.materials.length === 0 ? (
                      <div className="lm-empty-state">
                        <Paperclip size={28} color="var(--text-muted)" />
                        <p>No materials uploaded yet for this module.</p>
                        <span>Your instructor will upload files here.</span>
                      </div>
                    ) : (
                      expandedMod.materials.map(mat => (
                        <div key={mat.id} className="lm-material-item">
                          <div className="lm-material-icon">
                            <FileText size={16} color="#7C5CBF" />
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

                {activeTab === 'videos' && (
                  <motion.div key="videos" className="lm-tab-content"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  >
                    {(YT_LINKS[expandedMod.order_index] ?? []).map((vid, i) => (
                      <a key={i} href={vid.url} target="_blank" rel="noopener noreferrer" className="lm-video-item">
                        <div className="lm-video-thumb"><Play size={18} color="white" /></div>
                        <span className="lm-video-title">{vid.title}</span>
                        <ExternalLink size={13} color="var(--text-muted)" className="lm-video-ext" />
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="lm-detail-reward">
                <Zap size={14} color="#FFB830" />
                <span>Complete all lessons to earn <strong>{expandedMod.xp_reward} XP</strong></span>
              </div>
            </motion.div>
          ) : (
            <div className="lm-detail-empty">
              <BookOpen size={36} color="var(--text-muted)" />
              <p>Select a module to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
