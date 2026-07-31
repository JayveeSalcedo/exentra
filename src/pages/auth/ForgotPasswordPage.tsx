import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, Check, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import FormField from '../../components/ui/FormField'
import TextInput from '../../components/ui/TextInput'
import './ForgotPasswordPage.css'

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type EmailForm = z.infer<typeof emailSchema>

type ForgotPasswordPageProps = {
  onRequestClose?: () => void
  onBackToLogin?: () => void
}

const STEPS = ['enter_email', 'sent'] as const
type Step = typeof STEPS[number]

export default function ForgotPasswordPage({ onRequestClose, onBackToLogin }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<Step>('enter_email')
  const [isLoading, setIsLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async (data: EmailForm) => {
    setIsLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      alert(error.message)
      setIsLoading(false)
      return
    }
    setSentEmail(data.email)
    setIsLoading(false)
    setStep('sent')
  }

  return (
    <div className="fp-root">
      {/* Back button */}
      <motion.button
        className="fp-back-btn"
        onClick={onBackToLogin ?? onRequestClose}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ArrowLeft size={16} />
        Back to Sign In
      </motion.button>

      <AnimatePresence mode="wait">
        {step === 'enter_email' ? (
          <motion.div
            key="enter"
            className="fp-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Icon */}
            <motion.div
              className="fp-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
            >
              <Mail size={28} color="#00D4AA" />
            </motion.div>

            <h2 className="fp-title">Forgot Password?</h2>
            <p className="fp-desc">
              No worries! Enter your registered email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="fp-form" noValidate>
              <FormField label="Email Address" htmlFor="fp-email" error={errors.email?.message}>
                <TextInput
                  id="fp-email"
                  {...register('email')}
                  hasError={Boolean(errors.email)}
                  placeholder="e.g. juan@psu.edu.ph"
                  autoComplete="email"
                  type="email"
                />
              </FormField>

              <motion.button
                type="submit"
                className="fp-submit-btn"
                disabled={isLoading}
                whileTap={{ scale: 0.97 }}
              >
                {isLoading ? (
                  <span className="fp-btn-inner">
                    <span className="spinner" /> Sending...
                  </span>
                ) : (
                  <span className="fp-btn-inner">
                    <Send size={15} /> Send Reset Link
                  </span>
                )}
              </motion.button>
            </form>
          </motion.div>

        ) : (
          <motion.div
            key="sent"
            className="fp-content fp-sent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, type: 'spring' }}
          >
            {/* Success icon */}
            <motion.div
              className="fp-success-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            >
              <Check size={32} color="#00D4AA" />
            </motion.div>

            <h2 className="fp-title">Check your email!</h2>
            <p className="fp-desc">
              We sent a password reset link to
            </p>
            <p className="fp-email-highlight">{sentEmail}</p>
            <p className="fp-desc fp-desc-sm">
              Didn't receive it? Check your spam folder or try again.
            </p>

            {/* Resend */}
            <motion.button
              type="button"
              className="fp-resend-btn"
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep('enter_email')}
            >
              Try a different email
            </motion.button>

            <motion.button
              type="button"
              className="fp-submit-btn"
              whileTap={{ scale: 0.97 }}
              onClick={onBackToLogin ?? onRequestClose}
            >
              <span className="fp-btn-inner">
                Back to Sign In
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
