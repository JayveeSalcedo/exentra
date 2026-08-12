import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, ClipboardList, Layers,
  Users, BarChart2, LogOut, ChevronRight, Sparkles, ScrollText
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useState } from 'react'
import LogoutModal from '../ui/LogoutModal'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/teacher/dashboard',              icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/teacher/blocks',                 icon: Layers,           label: 'Blocks'         },
  { to: '/teacher/materials',              icon: BookOpen,         label: 'Materials'      },
  { to: '/teacher/assessments',            icon: ClipboardList,    label: 'Assessments'    },
  { to: '/teacher/assessments/generate',   icon: Sparkles,         label: 'Generate Quiz', sub: true },
  { to: '/teacher/students',               icon: Users,            label: 'Students'       },
  { to: '/teacher/progress',               icon: BarChart2,        label: 'Progress'       },
  { to: '/teacher/activity-log',           icon: ScrollText,       label: 'Activity Log'   },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function TeacherSidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)

  const handleLogout = () => {
    setIsLogoutOpen(true)
  }

  const confirmLogout = () => {
    setIsLogoutOpen(false)
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
          <img src="/ex-big.png" alt="Exentra" className="sidebar-logo-img" />
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
        {NAV_ITEMS.map(({ to, icon: Icon, label, sub }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/teacher/assessments'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''} ${sub ? 'sub-link' : ''}`
            }
          >
            <div className="sidebar-link-icon">
              <Icon size={sub ? 15 : 18} strokeWidth={1.8} />
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
                  {sub && !collapsed && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      background: 'rgba(108,142,245,0.15)',
                      border: '1px solid rgba(108,142,245,0.3)',
                      color: '#6C8EF5',
                      borderRadius: 99,
                      padding: '1px 6px',
                      letterSpacing: '0.5px'
                    }}>AI</span>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Teacher role badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="sidebar-role-badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span> Teacher Account</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User + logout */}
      <div className="sidebar-footer">
        <div className={`sidebar-user ${collapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" className="sidebar-avatar-img" />
              : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>}
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

      <LogoutModal
        isOpen={isLogoutOpen}
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutOpen(false)}
      />
    </motion.aside>
  )
}
