import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, Flame, X, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'
import './Topbar.css'

interface TopbarProps {
  pageTitle: string
  breadcrumb?: string
}

export default function Topbar({ pageTitle, breadcrumb }: TopbarProps) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  return (
    <header className="topbar">
      {/* Left — breadcrumb + title */}
      <div className="topbar-left">
        {breadcrumb && (
          <span className="topbar-breadcrumb">{breadcrumb} /&nbsp;</span>
        )}
        <h1 className="topbar-title">
          Welcome back, {user?.firstName}!
          <span className="topbar-wave"> 👋</span>
        </h1>
      </div>

      {/* Right — streak, search, notifs, avatar */}
      <div className="topbar-right">
        {/* Streak */}
        <motion.div
          className="topbar-streak"
          whileHover={{ scale: 1.05 }}
        >
          <Flame size={14} color="#FFB830" />
          <span>7-day streak</span>
        </motion.div>

        {/* Search */}
        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              className="topbar-search-wrap"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Search size={14} color="var(--text-secondary)" className="topbar-search-icon" />
              <input
                autoFocus
                className="topbar-search-input"
                placeholder="Search topics..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
              <button
                className="topbar-search-close"
                onClick={() => { setSearchOpen(false); setSearchVal('') }}
              >
                <X size={12} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              className="topbar-icon-btn"
              onClick={() => setSearchOpen(true)}
              whileTap={{ scale: 0.95 }}
              title="Search"
            >
              <Search size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Notifications */}
        <motion.button
          className="topbar-icon-btn notif-btn"
          whileTap={{ scale: 0.95 }}
          title="Notifications"
        >
          <Bell size={16} />
          <span className="notif-dot" />
        </motion.button>

        {/* Theme toggle */}
        <motion.button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          whileTap={{ scale: 0.95 }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>

        {/* Avatar */}
        <motion.div
          className="topbar-avatar"
          whileHover={{ scale: 1.05 }}
          title={`${user?.firstName} ${user?.lastName}`}
        >
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </motion.div>
      </div>
    </header>
  )
}
