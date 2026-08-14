import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import TeacherSidebar from './TeacherSidebar'
import Topbar from './Topbar'
import './AppLayout.css'

const PAGE_TITLES: Record<string, string> = {
  '/teacher/dashboard':            'Dashboard',
  '/teacher/blocks':               'Blocks & Sections',
  '/teacher/materials':            'Learning Materials',
  '/teacher/assessments':          'Assessments',
  '/teacher/assessments/generate': 'Generate Quiz',
  '/teacher/assessments/create':   'Create Assessment',
  '/teacher/students':             'Student Roster',
  '/teacher/progress':             'Class Progress',
  '/teacher/activity-log':         'Activity Log',
}

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Exentra'

  // Close the mobile drawer automatically whenever the route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="app-layout">
      <TeacherSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-main">
        <Topbar
          pageTitle={pageTitle}
          breadcrumb="Dashboard"
          onMenuClick={() => setMobileOpen(true)}
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
    </div>
  )
}
