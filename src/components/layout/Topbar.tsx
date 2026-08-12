import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Moon, Sun, ClipboardList, BookOpen,
  Award, CalendarClock, CheckCheck, Inbox, FileCheck2,
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'
import { supabase } from '../../lib/supabase'
import './Topbar.css'

interface TopbarProps {
  pageTitle: string
  breadcrumb?: string
}

type NotificationType = 'assessment_posted' | 'material_posted' | 'grade_released' | 'due_soon' | 'student_submitted'

interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

const NOTIF_ICON: Record<NotificationType, any> = {
  assessment_posted: ClipboardList,
  material_posted: BookOpen,
  grade_released: Award,
  due_soon: CalendarClock,
  student_submitted: FileCheck2,
}

const NOTIF_COLOR: Record<NotificationType, string> = {
  assessment_posted: '#6C8EF5',
  material_posted: '#00D4AA',
  grade_released: '#FFB830',
  due_soon: '#FF6B8A',
  student_submitted: '#00D4AA',
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function Topbar({ pageTitle, breadcrumb }: TopbarProps) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setNotifications(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Realtime — new notifications push straight into the bell
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as AppNotification, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen])

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  }

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.is_read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    }
    setPanelOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <header className="topbar">
      {/* Left — breadcrumb + title */}
      <div className="topbar-left">
        {breadcrumb && (
          <span className="topbar-breadcrumb">{breadcrumb} /&nbsp;</span>
        )}
        <h1 className="topbar-title">
          {pageTitle}
          
        </h1>
      </div>

      {/* Right — notifs, theme, avatar */}
      <div className="topbar-right">
        <div className="topbar-notif-wrap" ref={panelRef}>
          <motion.button
            className="topbar-icon-btn notif-btn"
            whileTap={{ scale: 0.95 }}
            title="Notifications"
            onClick={() => setPanelOpen(v => !v)}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </motion.button>

          <AnimatePresence>
            {panelOpen && (
              <motion.div
                className="notif-panel"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="notif-panel-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="notif-mark-all" onClick={markAllRead}>
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="notif-panel-list">
                  {loading ? (
                    <div className="notif-panel-empty">
                      <span className="notif-panel-spinner" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notif-panel-empty">
                      <Inbox size={22} color="var(--text-muted)" />
                      <p>You're all caught up</p>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const Icon = NOTIF_ICON[n.type] ?? Bell
                      const color = NOTIF_COLOR[n.type] ?? '#6C8EF5'
                      return (
                        <button
                          key={n.id}
                          className={`notif-item ${n.is_read ? '' : 'unread'}`}
                          onClick={() => handleNotifClick(n)}
                        >
                          <span className="notif-item-icon" style={{ background: `${color}14`, border: `1px solid ${color}25` }}>
                            <Icon size={13} color={color} />
                          </span>
                          <span className="notif-item-body">
                            <span className="notif-item-title">{n.title}</span>
                            {n.body && <span className="notif-item-desc">{n.body}</span>}
                            <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                          </span>
                          {!n.is_read && <span className="notif-item-unread-dot" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" className="topbar-avatar-img" />
            : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>}
        </motion.div>
      </div>
    </header>
  )
}
