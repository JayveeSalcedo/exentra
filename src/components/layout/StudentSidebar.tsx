import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Gamepad2, Trophy, Star,
  User, LogOut, ChevronRight, Zap, ClipboardList, FolderOpen, ChevronDown, Brain, BarChart2,
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useState, useEffect } from 'react'
import './Sidebar.css'

interface NavChild {
  to: string
  icon: React.ElementType
  label: string
}

interface NavItem {
  to?: string
  icon: React.ElementType
  label: string
  badge?: number
  children?: NavChild[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/student/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/student/courses',      icon: BookOpen,         label: 'Courses'      },
  {
    icon: ClipboardList,
    label: 'Assessments',
    children: [
      { to: '/student/assessments', icon: ClipboardList, label: 'Assessments'    },
      { to: '/student/submissions', icon: FolderOpen,    label: 'My Submissions' },
    ],
  },
  { to: '/student/progress',      icon: BarChart2,  label: 'Progress' },
  { to: '/student/games',         icon: Gamepad2,   label: 'Games'    },
  {
    icon: Brain,
    label: 'Practice',
    children: [
      { to: '/student/problems', icon: Brain, label: 'Problem Bank' },
    ],
  },
  { to: '/student/leaderboard',  icon: Trophy, label: 'Leaderboard'          },
  { to: '/student/achievements', icon: Star,   label: 'Achievements'         },
  { to: '/student/profile',      icon: User,   label: 'Profile'              },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function StudentSidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Track which group items are expanded
  const assessmentPaths = ['/student/assessments', '/student/submissions']
  const practicePaths   = ['/student/problems']
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (assessmentPaths.some(p => location.pathname.startsWith(p))) initial.add('Assessments')
    if (practicePaths.some(p => location.pathname.startsWith(p)))   initial.add('Practice')
    return initial
  })

  useEffect(() => {
    if (assessmentPaths.some(p => location.pathname.startsWith(p))) {
      setOpenGroups(prev => new Set(prev).add('Assessments'))
    }
    if (practicePaths.some(p => location.pathname.startsWith(p))) {
      setOpenGroups(prev => new Set(prev).add('Practice'))
    }
  }, [location.pathname])

  function toggleGroup(label: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="#00D4AA" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="sidebar-logo-text"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <span className="sidebar-brand">EXENTRA</span>
              <span className="sidebar-dept">IT Department</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* School block */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="sidebar-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sidebar-block-icon">
              <img src="/PSU%20LOGO.png" alt="PSU" className="sidebar-block-logo" />
            </div>
            <div className="sidebar-block-info">
              <span className="sidebar-block-name">Pangasinan State University</span>
              <span className="sidebar-block-sub">IT Department</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav label */}
      {!collapsed && <p className="sidebar-nav-label">NAVIGATION</p>}

      {/* Nav items */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          // Group item (has children)
          if (item.children) {
            const Icon = item.icon
            const isGroupOpen = openGroups.has(item.label)
            const isGroupActive = item.children.some(c => location.pathname.startsWith(c.to))

            return (
              <div key={item.label}>
                {/* Group header button */}
                <button
                  className={`sidebar-link sidebar-group-btn ${
                    isGroupActive ? 'active' : ''
                  } ${collapsed ? 'collapsed' : ''}`}
                  onClick={() => !collapsed && toggleGroup(item.label)}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="sidebar-link-icon">
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        className="sidebar-link-label"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      className="sidebar-group-chevron"
                      animate={{ rotate: isGroupOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={13} />
                    </motion.div>
                  )}
                </button>

                {/* Children — shown expanded or when sidebar is collapsed (always show as icons) */}
                <AnimatePresence initial={false}>
                  {(isGroupOpen || collapsed) && (
                    <motion.div
                      key="children"
                      initial={collapsed ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      {item.children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            `sidebar-link sub-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
                          }
                          title={collapsed ? child.label : undefined}
                        >
                          <div className="sidebar-link-icon">
                            <child.icon size={16} strokeWidth={1.8} />
                          </div>
                          <AnimatePresence>
                            {!collapsed && (
                              <motion.span
                                className="sidebar-link-label"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15 }}
                              >
                                {child.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          }

          // Regular item
          const { to, icon: Icon, label, badge } = item as NavItem & { to: string }
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
              }
            >
              <div className="sidebar-link-icon">
                <Icon size={18} strokeWidth={1.8} />
                {badge && collapsed && (
                  <span className="sidebar-badge-dot" />
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="sidebar-link-label"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && badge && (
                <span className="sidebar-badge">{badge}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="sidebar-footer">
        <div className={`sidebar-user ${collapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-avatar">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                className="sidebar-user-info"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                <span className="sidebar-user-name">{user?.firstName} {user?.lastName}</span>
                <span className="sidebar-user-id">{user?.schoolId}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          className={`sidebar-logout ${collapsed ? 'collapsed' : ''}`}
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={16} strokeWidth={1.8} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <motion.button
        className="sidebar-toggle"
        onClick={onToggle}
        animate={{ rotate: collapsed ? 0 : 180 }}
        transition={{ duration: 0.3 }}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <ChevronRight size={14} />
      </motion.button>
    </motion.aside>
  )
}
