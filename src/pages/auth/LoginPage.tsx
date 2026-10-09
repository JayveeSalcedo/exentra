import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, LogIn } from 'lucide-react'
import SignUpPage from './SignUpPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import './LoginPage.css'
import FormField from '../../components/ui/FormField'
import TextInput from '../../components/ui/TextInput'
import PasswordInput from '../../components/ui/PasswordInput'
import ModalShell from '../../components/ui/ModalShell'

const loginSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const MAX_ATTEMPTS = 3

const BUBBLE_MESSAGES = [
  'Hey there! Ready to level up? 🚀',
  'Welcome back, coder! 💻',
  'Let\'s conquer some DSA today! 🧠',
  'Your streak is waiting for you! 🔥',
  'Time to climb the leaderboard! 🏆',
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = useAuth()

  // Auto-navigate when user is loaded
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}/dashboard`)
    }
  }, [user, navigate])
  const [showPassword, setShowPassword] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [bubbleMessage, setBubbleMessage] = useState(
    () => BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)]
  )
  const [bubbleVisible, setBubbleVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbleVisible(false)
      setTimeout(() => {
        setBubbleMessage(BUBBLE_MESSAGES[Math.floor(Math.random() * BUBBLE_MESSAGES.length)])
        setBubbleVisible(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    if (isLocked) return
    setIsLoading(true)
    setLoginError('')

    const { error } = await login(data.schoolId, data.password)

    if (error) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true)
      } else {
        setLoginError(
          `Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempt${
            MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'
          } remaining.`
        )
      }
      setIsLoading(false)
    }
    // On success, onAuthStateChange in AuthContext handles navigation
  }

  return (
    <div className="login-root">
      {/* Background — PSU campus photo */}
      <div className="login-bg" />

      <div className="login-layout">
        {/* Left panel — branding */}
        <motion.div
          className="login-brand"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="brand-logo">
            <img src="/ex-big.png" alt="Exentra logo" className="brand-logo-img" />
          </div>
          <h1 className="brand-name">EXENTRA</h1>
          <p className="brand-sub">DSA LEARNING SYSTEM</p>

          <p className="brand-school">Pangasinan State University · IT Department</p>
        </motion.div>

        {/* Right panel — form */}
        <motion.div
          className="login-form-wrap"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="login-card">
            <AnimatePresence mode="wait">
              {isLocked ? (
                <motion.div
                  key="locked"
                  className="locked-screen"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="locked-icon">
                    <AlertTriangle size={36} color="#FF6B8A" />
                  </div>
                  <h2 className="locked-title">Account Locked</h2>
                  <p className="locked-desc">
                    Too many failed attempts. Please contact your professor or admin to unlock your account.
                  </p>
                  <div className="locked-badge">3 / 3 attempts used</div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="form-header">
                    <h2 className="form-title">Welcome back</h2>
                    <p className="form-sub">Sign in to continue your DSA journey</p>
                  </div>

                  {/* Attempt indicator */}
                  {attempts > 0 && (
                    <motion.div
                      className="attempt-dots"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                        <div
                          key={i}
                          className={`attempt-dot ${i < attempts ? 'used' : ''}`}
                        />
                      ))}
                      <span className="attempt-text">
                        {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} left
                      </span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
                    {/* School ID */}
                    <FormField label="School ID" htmlFor="login-school-id" error={errors.schoolId?.message}>
                      <TextInput
                        id="login-school-id"
                        {...register('schoolId')}
                        hasError={Boolean(errors.schoolId)}
                        placeholder="e.g. 23as1000"
                        autoComplete="username"
                      />
                    </FormField>

                    {/* Password */}
                    <FormField label="Password" htmlFor="login-password" error={errors.password?.message}>
                      <PasswordInput
                        id="login-password"
                        {...register('password')}
                        hasError={Boolean(errors.password)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        show={showPassword}
                        onToggle={() => setShowPassword((v) => !v)}
                      />
                    </FormField>

                    {/* Login error */}
                    <AnimatePresence>
                      {loginError && (
                        <motion.div
                          className="login-error"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          <AlertTriangle size={14} />
                          {loginError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="forgot-link"
                        onClick={() => setIsForgotOpen(true)}
                      >
                        Forgot password?
                      </button>
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      className="submit-btn"
                      disabled={isLoading}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isLoading ? (
                        <span className="btn-loading">
                          <span className="spinner" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="btn-content">
                          <LogIn size={16} />
                          Sign In
                        </span>
                      )}
                    </motion.button>

                    <p className="signup-link">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        className="signup-link-btn"
                        onClick={() => setIsSignupOpen(true)}
                      >
                        Sign up
                      </button>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <ModalShell
        isOpen={isSignupOpen}
        ariaLabel="Create account"
        onClose={() => setIsSignupOpen(false)}
      >
        <SignUpPage onRequestClose={() => setIsSignupOpen(false)} />
      </ModalShell>

      <ModalShell
        isOpen={isForgotOpen}
        ariaLabel="Reset password"
        onClose={() => setIsForgotOpen(false)}
      >
        <ForgotPasswordPage
          onRequestClose={() => setIsForgotOpen(false)}
          onBackToLogin={() => setIsForgotOpen(false)}
        />
      </ModalShell>

      {/* Mascot peeking from bottom right */}
      <motion.div
        className="mascot-peek"
        initial={{ y: 180 }}
        animate={{ y: 0 }}
        transition={{ delay: 1, duration: 0.7, type: 'spring', stiffness: 120, damping: 14 }}
      >
        {/* Speech bubble */}
        <motion.div
          className="mascot-bubble"
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: bubbleVisible ? 1 : 0, scale: bubbleVisible ? 1 : 0.8, y: bubbleVisible ? 0 : 6 }}
          transition={{ duration: 0.3, type: 'spring' }}
        >
          <span className="bubble-text">{bubbleMessage}</span>
          <div className="bubble-tail" />
        </motion.div>

        <motion.img
          src="/mascot.png"
          alt="Algie mascot"
          className="mascot-img"
          animate={{
            y: [0, -12, 0, -6, 0],
            rotate: [-1, 1, -1, 0.5, -1],
            scale: [1, 1.03, 1, 1.01, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

    </div>
  )
}
