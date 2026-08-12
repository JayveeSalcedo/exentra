import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { supabase } from '../../lib/supabase'
import { Trophy, Lock, CheckCircle2, Zap, Flame, BookOpen, Star, Shield, Brain, Target } from 'lucide-react'
import './Achievements.css'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as const },
})

interface AchievementDef {
  id: string
  title: string
  description: string
  icon: any
  color: string
  xpRequired?: number
  levelRequired?: number
  streakRequired?: number
  modulesRequired?: number
  assessmentsRequired?: number
  category: 'xp' | 'streak' | 'modules' | 'assessments' | 'special'
}

const ACHIEVEMENTS: AchievementDef[] = [
  // XP milestones
  { id: 'xp_100',   title: 'First Steps',     description: 'Earn your first 100 XP',       icon: Zap,       color: '#FFB830', xpRequired: 100,   category: 'xp'          },
  { id: 'xp_500',   title: 'Getting Started', description: 'Reach 500 XP',                  icon: Zap,       color: '#FFB830', xpRequired: 500,   category: 'xp'          },
  { id: 'xp_1000',  title: 'Century Mark',    description: 'Reach 1,000 XP',                icon: Zap,       color: '#FFB830', xpRequired: 1000,  category: 'xp'          },
  { id: 'xp_2500',  title: 'On Fire',         description: 'Reach 2,500 XP',                icon: Star,      color: '#FF6B8A', xpRequired: 2500,  category: 'xp'          },
  { id: 'xp_5000',  title: 'XP Legend',       description: 'Reach 5,000 XP',                icon: Trophy,    color: '#FFB830', xpRequired: 5000,  category: 'xp'          },

  // Streak milestones
  { id: 'str_3',    title: 'Consistent',      description: 'Maintain a 3-day streak',       icon: Flame,     color: '#FF6B8A', streakRequired: 3,  category: 'streak'      },
  { id: 'str_7',    title: 'Week Warrior',    description: 'Maintain a 7-day streak',        icon: Flame,     color: '#FF6B8A', streakRequired: 7,  category: 'streak'      },
  { id: 'str_14',   title: 'Two Week Grind',  description: 'Maintain a 14-day streak',       icon: Flame,     color: '#FF6B8A', streakRequired: 14, category: 'streak'      },
  { id: 'str_30',   title: 'Month Master',    description: 'Maintain a 30-day streak',       icon: Flame,     color: '#FF6B8A', streakRequired: 30, category: 'streak'      },

  // Module milestones
  { id: 'mod_1',    title: 'First Module',    description: 'Complete your first DSA module', icon: BookOpen,  color: '#6C8EF5', modulesRequired: 1, category: 'modules'     },
  { id: 'mod_4',    title: 'Halfway There',   description: 'Complete 4 modules',             icon: BookOpen,  color: '#6C8EF5', modulesRequired: 4, category: 'modules'     },
  { id: 'mod_8',    title: 'DSA Graduate',    description: 'Complete all 8 DSA modules',     icon: Shield,    color: '#00D4AA', modulesRequired: 8, category: 'modules'     },

  // Assessment milestones
  { id: 'ass_1',    title: 'Quiz Starter',    description: 'Submit your first assessment',   icon: Target,    color: '#4FC3F7', assessmentsRequired: 1,  category: 'assessments' },
  { id: 'ass_5',    title: 'Assessment Pro',  description: 'Submit 5 assessments',           icon: Target,    color: '#4FC3F7', assessmentsRequired: 5,  category: 'assessments' },
  { id: 'ass_10',   title: 'Overachiever',    description: 'Submit 10 assessments',          icon: Target,    color: '#4FC3F7', assessmentsRequired: 10, category: 'assessments' },

  // Level milestones
  { id: 'lv_3',     title: 'Rising',          description: 'Reach Level 3',                  icon: Brain,     color: '#00D4AA', levelRequired: 3,  category: 'special'     },
  { id: 'lv_5',     title: 'Expert Coder',    description: 'Reach Level 5',                  icon: Brain,     color: '#00D4AA', levelRequired: 5,  category: 'special'     },
  { id: 'lv_10',    title: 'DSA Grandmaster', description: 'Reach Level 10',                 icon: Trophy,    color: '#FFB830', levelRequired: 10, category: 'special'     },
]

const CATEGORY_LABELS: Record<string, string> = {
  xp: '⚡ XP', streak: '🔥 Streak', modules: '📚 Modules', assessments: '🎯 Assessments', special: '🏆 Special',
}

export default function Achievements() {
  const { user } = useAuth()
  const [modulesCompleted, setModulesCompleted] = useState(0)
  const [assessmentsDone, setAssessmentsDone] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const [{ count: mods }, { count: asses }] = await Promise.all([
        supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('student_id', user.id).eq('completed', true),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('student_id', user.id).eq('is_submitted', true),
      ])
      setModulesCompleted(mods ?? 0)
      setAssessmentsDone(asses ?? 0)
      setLoading(false)
    }
    fetchData()
  }, [user])

  const isUnlocked = (a: AchievementDef) => {
    if (!user) return false
    if (a.xpRequired        && user.xp       < a.xpRequired)        return false
    if (a.levelRequired      && user.level    < a.levelRequired)      return false
    if (a.streakRequired     && user.streak   < a.streakRequired)     return false
    if (a.modulesRequired    && modulesCompleted < a.modulesRequired) return false
    if (a.assessmentsRequired && assessmentsDone < a.assessmentsRequired) return false
    return true
  }

  const getProgress = (a: AchievementDef): { value: number; max: number } | null => {
    if (!user) return null
    if (a.xpRequired)          return { value: user.xp,          max: a.xpRequired }
    if (a.levelRequired)       return { value: user.level,       max: a.levelRequired }
    if (a.streakRequired)      return { value: user.streak,      max: a.streakRequired }
    if (a.modulesRequired)     return { value: modulesCompleted, max: a.modulesRequired }
    if (a.assessmentsRequired) return { value: assessmentsDone,  max: a.assessmentsRequired }
    return null
  }

  const categories = ['xp', 'streak', 'modules', 'assessments', 'special'] as const
  const unlockedCount = ACHIEVEMENTS.filter(isUnlocked).length

  return (
    <div className="ach-root">
      {/* Header */}
      <motion.div className="ach-header" {...stagger(0)}>
        <div>
          <p className="ach-header-label">STUDENT</p>
          <h1 className="ach-header-title">Achievements</h1>
          <p className="ach-header-sub">Unlock badges by mastering DSA topics and staying consistent</p>
        </div>
        <div className="ach-header-count">
          <Trophy size={28} color="#FFB830" />
          <div>
            <span className="ach-count-num">{unlockedCount}</span>
            <span className="ach-count-label">/ {ACHIEVEMENTS.length} Unlocked</span>
          </div>
        </div>
      </motion.div>

      {/* Progress bar */}
      <motion.div className="ach-overall-bar" {...stagger(1)}>
        <div className="ach-bar-track">
          <motion.div
            className="ach-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
        <span className="ach-bar-label">{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}% complete</span>
      </motion.div>

      {/* Categories */}
      {categories.map((cat, ci) => {
        const items = ACHIEVEMENTS.filter(a => a.category === cat)
        return (
          <motion.div key={cat} {...stagger(ci + 2)}>
            <p className="ach-cat-label">{CATEGORY_LABELS[cat]}</p>
            <div className="ach-grid">
              {items.map((ach, i) => {
                const unlocked = !loading && isUnlocked(ach)
                const prog = getProgress(ach)
                const pct = prog ? Math.min(100, Math.round((prog.value / prog.max) * 100)) : 0

                return (
                  <motion.div
                    key={ach.id}
                    className={`ach-card ${unlocked ? 'unlocked' : 'locked'}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    style={unlocked ? { borderColor: `${ach.color}35` } : {}}
                  >
                    {/* Icon */}
                    <div
                      className="ach-icon"
                      style={unlocked
                        ? { background: `${ach.color}18`, border: `1px solid ${ach.color}35`, color: ach.color }
                        : { background: 'var(--surface-03)', border: '1px solid var(--surface-06)', color: 'var(--text-muted)' }
                      }
                    >
                      {unlocked
                        ? <ach.icon size={22} />
                        : <Lock size={18} />
                      }
                    </div>

                    {/* Info */}
                    <div className="ach-info">
                      <div className="ach-title-row">
                        <span className="ach-title" style={{ color: unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {ach.title}
                        </span>
                        {unlocked && <CheckCircle2 size={13} color={ach.color} />}
                      </div>
                      <p className="ach-desc">{ach.description}</p>

                      {!unlocked && prog && (
                        <div className="ach-prog-row">
                          <div className="ach-prog-track">
                            <div className="ach-prog-fill" style={{ width: `${pct}%`, background: ach.color }} />
                          </div>
                          <span className="ach-prog-label" style={{ color: ach.color }}>
                            {Math.min(prog.value, prog.max)}/{prog.max}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
