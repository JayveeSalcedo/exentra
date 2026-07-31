import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { Sparkles, ClipboardList, Users, BarChart2, BookOpen, Zap, Layers } from 'lucide-react'

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
})

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const quickActions = [
    {
      label: 'Generate AI Quiz',
      sub: 'Create assessments with Llama 3',
      icon: Sparkles,
      color: '#9B7ED4',
      to: '/teacher/assessments/generate',
      highlight: true,
    },
    {
      label: 'Blocks',
      sub: 'Manage sections & rosters',
      icon: Layers,
      color: '#4FC3F7',
      to: '/teacher/blocks',
    },
    {
      label: 'Assessments',
      sub: 'View & manage all assessments',
      icon: ClipboardList,
      color: '#00D4AA',
      to: '/teacher/assessments',
    },
    {
      label: 'Students',
      sub: 'View student roster',
      icon: Users,
      color: '#FFB830',
      to: '/teacher/students',
    },
    {
      label: 'Progress',
      sub: 'Class performance overview',
      icon: BarChart2,
      color: '#FF6B8A',
      to: '/teacher/progress',
    },
    {
      label: 'Materials',
      sub: 'Manage DSA learning content',
      icon: BookOpen,
      color: '#4FC3F7',
      to: '/teacher/materials',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>
      {/* Welcome */}
      <motion.div
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(124,92,191,0.08))',
          border: '1px solid rgba(124,92,191,0.2)',
          borderRadius: 16,
          padding: '28px 28px',
        }}
        {...stagger(0)}
      >
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 2, color: '#9B7ED4', margin: '0 0 6px', textTransform: 'uppercase' }}>
          Welcome back
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          {user?.firstName} {user?.lastName} 👨‍🏫
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Manage your DSA class, generate AI-powered assessments, and track student progress.
        </p>
      </motion.div>

      {/* Quick actions */}
      <motion.div {...stagger(1)}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: 2,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Quick Actions
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {quickActions.map((action, i) => (
            <motion.button
              key={action.to}
              onClick={() => navigate(action.to)}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -3 }}
              {...stagger(i + 2)}
              style={{
                background: action.highlight
                  ? 'linear-gradient(135deg, rgba(124,92,191,0.15), rgba(0,212,170,0.06))'
                  : 'var(--bg-card)',
                border: action.highlight
                  ? '1px solid rgba(124,92,191,0.35)'
                  : '1px solid var(--surface-06)',
                borderRadius: 14,
                padding: '18px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 10,
                textAlign: 'left',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${action.color}15`,
                border: `1px solid ${action.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <action.icon size={18} color={action.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {action.label}
                  {action.highlight && (
                    <span style={{
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      background: 'rgba(155,126,212,0.15)',
                      border: '1px solid rgba(155,126,212,0.3)',
                      color: '#9B7ED4',
                      borderRadius: 99,
                      padding: '1px 6px',
                    }}>
                      AI
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {action.sub}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Generate Quiz highlight card */}
      <motion.div
        {...stagger(quickActions.length + 2)}
        style={{
          background: 'linear-gradient(135deg, var(--bg-card), rgba(0,212,170,0.04))',
          border: '1px solid rgba(0,212,170,0.15)',
          borderRadius: 16,
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, rgba(124,92,191,0.2), rgba(0,212,170,0.1))',
            border: '1px solid rgba(124,92,191,0.3)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={22} color="#9B7ED4" />
          </div>
          <div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              AI Quiz Generator
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
              Generate DSA quizzes instantly — pick a module, difficulty, and question count.
              Powered by <span style={{ color: '#00D4AA' }}>Llama 3 70B</span> via Groq.
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/teacher/assessments/generate')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #7C5CBF, #00D4AA)',
            border: 'none',
            borderRadius: 10,
            padding: '11px 20px',
            fontFamily: 'Syne, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            color: 'white',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <Zap size={15} /> Generate Quiz
        </motion.button>
      </motion.div>
    </div>
  )
}
