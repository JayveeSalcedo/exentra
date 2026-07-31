import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import StudentSidebar from './StudentSidebar'
import Topbar from './Topbar'
import ChatBot from '../ui/ChatBot'
import './AppLayout.css'

const PAGE_TITLES: Record<string, string> = {
  '/student/dashboard':    'Dashboard',
  '/student/courses':      'Courses',
  '/student/quests':       'Quests',
  '/student/leaderboard':  'Leaderboard',
  '/student/achievements': 'Achievements',
  '/student/profile':      'Profile',
}

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const pageTitle = location.pathname.startsWith('/student/courses/')
    ? 'Interactive Lesson'
    : PAGE_TITLES[location.pathname] ?? 'Exentra'

  return (
    <div className="app-layout">
      <StudentSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <div className="app-main">
        <Topbar
          pageTitle={pageTitle}
          breadcrumb="Dashboard"
        />
        <motion.main
          className="app-content"
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.main>
      </div>

      {/* AI Chatbot — fixed bottom-right, appears on all student pages */}
      <ChatBot />
    </div>
  )
}
