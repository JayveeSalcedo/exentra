import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import { Lock, CheckCircle2, Play, Zap, BookOpen } from 'lucide-react'
import './Quests.css'

const QUESTS = [
  { order: 1, title: 'Arrays & Array Lists',   desc: 'Master static/dynamic arrays, indexing, insertion, and deletion operations.',       icon: '[ ]', color: '#6C8EF5', xp: 200, lessons: 3, tag: 'Fundamentals' },
  { order: 2, title: 'Lists & Linked Lists',   desc: 'Explore singly, doubly, and circular linked lists with pointer manipulation.',       icon: '→',   color: '#00D4AA', xp: 220, lessons: 3, tag: 'Linear'        },
  { order: 3, title: 'Stacks',                 desc: 'Understand LIFO structures, push/pop operations, and real-world stack applications.', icon: '≡',   color: '#FFB830', xp: 180, lessons: 2, tag: 'Linear'        },
  { order: 4, title: 'Queues',                 desc: 'Learn FIFO queues, priority queues, and deques with enqueue/dequeue operations.',    icon: '⊏',   color: '#FF6B8A', xp: 180, lessons: 2, tag: 'Linear'        },
  { order: 5, title: 'Trees',                  desc: 'Dive into binary trees, BSTs, AVL trees, and tree traversal algorithms.',             icon: '△',   color: '#4FC3F7', xp: 280, lessons: 4, tag: 'Non-Linear'    },
  { order: 6, title: 'Graphs',                 desc: 'Explore directed/undirected graphs, BFS, DFS, Dijkstra, and topological sort.',       icon: '◈',   color: '#81C784', xp: 300, lessons: 4, tag: 'Non-Linear'    },
  { order: 7, title: 'Sorting & Searching',    desc: 'Study bubble, merge, quick, and heap sort. Binary search and search strategies.',    icon: '⇅',   color: '#FFB830', xp: 250, lessons: 4, tag: 'Algorithms'    },
  { order: 8, title: 'Hashing',                desc: 'Master hash tables, hash functions, collision resolution strategies.',               icon: '#',   color: '#FF6B8A', xp: 240, lessons: 3, tag: 'Advanced'      },
]

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
})

export default function Quests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [completedOrders, setCompletedOrders] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from('student_progress')
        .select('modules(order_index)')
        .eq('student_id', user.id)
        .eq('completed', true)

      const set = new Set<number>()
      data?.forEach((p: any) => {
        if (p.modules?.order_index) set.add(p.modules.order_index)
      })
      setCompletedOrders(set)
      setLoading(false)
    }
    fetch()
  }, [user])

  const getState = (order: number) => {
    if (completedOrders.has(order)) return 'done'
    if (order === 1 || completedOrders.has(order - 1)) return 'active'
    return 'locked'
  }

  const done = completedOrders.size

  return (
    <div className="qst-root">
      {/* Header */}
      <motion.div className="qst-header" {...stagger(0)}>
        <div>
          <p className="qst-header-label">STUDENT</p>
          <h1 className="qst-header-title">Quest Board</h1>
          <p className="qst-header-sub">Complete all 8 DSA modules to master the course</p>
        </div>
        <div className="qst-header-stats">
          <div className="qst-header-stat">
            <span className="qst-header-num" style={{ color: '#00D4AA' }}>{done}</span>
            <span className="qst-header-lbl">Completed</span>
          </div>
          <div className="qst-header-divider" />
          <div className="qst-header-stat">
            <span className="qst-header-num" style={{ color: '#6C8EF5' }}>{8 - done}</span>
            <span className="qst-header-lbl">Remaining</span>
          </div>
        </div>
      </motion.div>

      {/* Overall progress */}
      <motion.div className="qst-progress-bar-wrap" {...stagger(1)}>
        <div className="qst-progress-label">
          <span>Quest Completion</span>
          <span style={{ color: '#00D4AA' }}>{done}/8 modules</span>
        </div>
        <div className="qst-progress-track">
          <motion.div
            className="qst-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(done / 8) * 100}%` }}
            transition={{ duration: 1, delay: 0.4 }}
          />
        </div>
      </motion.div>

      {/* Quest list */}
      <div className="qst-list">
        {QUESTS.map((q, i) => {
          const state = loading ? 'locked' : getState(q.order)
          const isActive = state === 'active'
          const isDone = state === 'done'
          const isLocked = state === 'locked'

          return (
            <motion.div
              key={q.order}
              className={`qst-card ${state}`}
              {...stagger(i + 2)}
              style={isDone ? { borderColor: `${q.color}25` } : isActive ? { borderColor: `${q.color}35` } : {}}
              onClick={() => !isLocked && navigate('/student/courses')}
            >
              {/* Left: number + connector */}
              <div className="qst-left">
                <div
                  className="qst-num"
                  style={isDone
                    ? { background: `${q.color}20`, border: `2px solid ${q.color}`, color: q.color }
                    : isActive
                    ? { background: `${q.color}15`, border: `2px solid ${q.color}60`, color: q.color }
                    : { background: 'var(--surface-03)', border: '2px solid var(--surface-08)', color: 'var(--text-muted)' }
                  }
                >
                  {isDone ? <CheckCircle2 size={18} /> : isLocked ? <Lock size={16} /> : q.order}
                </div>
                {i < QUESTS.length - 1 && (
                  <div className={`qst-connector ${isDone ? 'done' : ''}`} />
                )}
              </div>

              {/* Card body */}
              <div className={`qst-body ${isLocked ? 'locked' : ''}`}>
                <div className="qst-body-left">
                  {/* Icon + tag */}
                  <div className="qst-icon-row">
                    <div
                      className="qst-icon"
                      style={isLocked
                        ? { color: 'var(--text-muted)', borderColor: 'var(--surface-06)', background: 'var(--surface-02)' }
                        : { color: q.color, borderColor: `${q.color}30`, background: `${q.color}12` }
                      }
                    >
                      {q.icon}
                    </div>
                    <span
                      className="qst-tag"
                      style={isLocked
                        ? { color: 'var(--text-muted)', borderColor: 'var(--surface-06)', background: 'transparent' }
                        : { color: q.color, borderColor: `${q.color}30`, background: `${q.color}10` }
                      }
                    >
                      {q.tag}
                    </span>
                  </div>

                  <h3
                    className="qst-title"
                    style={{ color: isLocked ? 'var(--text-muted)' : isDone ? 'var(--text-soft)' : 'var(--text-primary)' }}
                  >
                    {q.title}
                  </h3>
                  <p className="qst-desc" style={{ color: isLocked ? '#2D3748' : 'var(--text-secondary)' }}>
                    {q.desc}
                  </p>

                  {/* Meta */}
                  <div className="qst-meta">
                    <span style={{ color: isLocked ? '#2D3748' : 'var(--text-muted)' }}>
                      <BookOpen size={11} /> {q.lessons} lessons
                    </span>
                    <span style={{ color: isLocked ? '#2D3748' : '#FFB830' }}>
                      <Zap size={11} /> {q.xp} XP
                    </span>
                  </div>
                </div>

                {/* Right: CTA */}
                <div className="qst-cta">
                  {isDone ? (
                    <div className="qst-done-badge">
                      <CheckCircle2 size={14} color="#00D4AA" />
                      <span>Completed</span>
                    </div>
                  ) : isActive ? (
                    <motion.button
                      className="qst-start-btn"
                      style={{ background: `linear-gradient(135deg, ${q.color}cc, ${q.color}88)` }}
                      whileTap={{ scale: 0.96 }}
                      onClick={e => { e.stopPropagation(); navigate('/student/courses') }}
                    >
                      <Play size={13} /> Start
                    </motion.button>
                  ) : (
                    <div className="qst-locked-badge">
                      <Lock size={12} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
