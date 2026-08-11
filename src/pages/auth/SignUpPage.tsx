import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import './SignUpPage.css'
import FormField from '../../components/ui/FormField'
import TextInput from '../../components/ui/TextInput'
import PasswordInput from '../../components/ui/PasswordInput'
import { supabase } from '../../lib/supabase'

const step1Schema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  studentType: z.enum(['regular', 'irregular'], { error: 'Please select a student type' }),
})

const step2Schema = z.object({
  username: z
    .string()
    .min(4, 'Username must be at least 4 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>

type SignUpPageProps = {
  onRequestClose?: () => void
}

export default function SignUpPage({ onRequestClose }: SignUpPageProps) {
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [formData, setFormData] = useState<Partial<Step1 & Step2>>({})

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: formData })
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: formData })

  const selectedType = form1.watch('studentType')

  const onStep1 = (data: Step1) => {
    setFormData((p) => ({ ...p, ...data }))
    setStep(1)
  }

  const onStep2 = async (data: Step2) => {
    setIsLoading(true)
    const final = { ...formData, ...data }

    const email = `${final.schoolId}@psu.edu.ph`
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: data.password,
    })

    if (signUpError || !authData.user) {
      setIsLoading(false)
      alert(signUpError?.message ?? 'Sign up failed. Please try again.')
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      school_id: final.schoolId,
      first_name: final.firstName,
      last_name: final.lastName,
      username: data.username,
      year_level: '2nd Year',
      course: 'BSIT',
      student_type: final.studentType,
      role: 'student',
    })

    if (profileError) {
      setIsLoading(false)
      alert('Failed to create profile: ' + profileError.message)
      return
    }

    setIsLoading(false)
    setDone(true)
    setTimeout(() => {
      onRequestClose?.()
    }, 2500)
  }

  const getPasswordStrength = (pw: string) => {
    if (!pw) return 0
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^a-zA-Z0-9]/.test(pw)) score++
    return score
  }

  const pw = form2.watch('password') ?? ''
  const pwStrength = getPasswordStrength(pw)
  const pwColors = ['#FF6B8A', '#FFB830', '#00D4AA', '#00D4AA']
  const pwLabels = ['Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="signup-root">
      <div className="signup-layout">
        <motion.div
          className="signup-form-wrap"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="signup-card">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="done"
                  className="su-success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <motion.div
                    className="su-success-icon"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  >
                    <Check size={36} color="#00D4AA" />
                  </motion.div>
                  <h2 className="su-success-title">Account Created!</h2>
                  <p className="su-success-desc">Welcome to Exentra! Redirecting to login...</p>
                </motion.div>

              ) : step === 0 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <div className="su-form-header">
                    <h2 className="su-form-title">Personal Info</h2>
                    <p className="su-form-sub">Let's start with the basics</p>
                  </div>
                  <form onSubmit={form1.handleSubmit(onStep1)} className="su-form" noValidate>
                    <FormField label="School ID" htmlFor="signup-school-id" error={form1.formState.errors.schoolId?.message}>
                      <TextInput
                        id="signup-school-id"
                        {...form1.register('schoolId')}
                        hasError={Boolean(form1.formState.errors.schoolId)}
                        placeholder="e.g. 22as1000"
                      />
                    </FormField>
                    <div className="su-name-row">
                      <FormField label="First Name" htmlFor="signup-first-name" error={form1.formState.errors.firstName?.message}>
                        <TextInput
                          id="signup-first-name"
                          {...form1.register('firstName')}
                          hasError={Boolean(form1.formState.errors.firstName)}
                          placeholder="Juan"
                        />
                      </FormField>
                      <FormField label="Last Name" htmlFor="signup-last-name" error={form1.formState.errors.lastName?.message}>
                        <TextInput
                          id="signup-last-name"
                          {...form1.register('lastName')}
                          hasError={Boolean(form1.formState.errors.lastName)}
                          placeholder="Dela Cruz"
                        />
                      </FormField>
                    </div>

                    <FormField label="Student Type" htmlFor="signup-student-type" error={form1.formState.errors.studentType?.message}>
                      <div className="su-type-toggle">
                        <label
                          className={`su-type-option ${selectedType === 'regular' ? 'su-type-active' : ''}`}
                          onClick={() => form1.setValue('studentType', 'regular', { shouldValidate: true })}
                        >
                          <input type="radio" value="regular" {...form1.register('studentType')} className="su-type-radio" />
                          <span className="su-type-label">Regular</span>
                        </label>
                        <label
                          className={`su-type-option ${selectedType === 'irregular' ? 'su-type-active' : ''}`}
                          onClick={() => form1.setValue('studentType', 'irregular', { shouldValidate: true })}
                        >
                          <input type="radio" value="irregular" {...form1.register('studentType')} className="su-type-radio" />
                          <span className="su-type-label">Irregular</span>
                        </label>
                      </div>
                    </FormField>

                    <motion.button type="submit" className="su-next-btn" whileTap={{ scale: 0.97 }}>
                      Next <ChevronRight size={16} />
                    </motion.button>
                  </form>
                </motion.div>

              ) : (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <div className="su-form-header">
                    <h2 className="su-form-title">Account Setup</h2>
                    <p className="su-form-sub">Create your login credentials</p>
                  </div>
                  <form onSubmit={form2.handleSubmit(onStep2)} className="su-form" noValidate>
                    <FormField label="Username" htmlFor="signup-username" error={form2.formState.errors.username?.message}>
                      <TextInput
                        id="signup-username"
                        {...form2.register('username')}
                        hasError={Boolean(form2.formState.errors.username)}
                        placeholder="e.g. juan_delacruz"
                      />
                    </FormField>
                    <FormField label="Password" htmlFor="signup-password" error={form2.formState.errors.password?.message}>
                      <PasswordInput
                        id="signup-password"
                        {...form2.register('password')}
                        hasError={Boolean(form2.formState.errors.password)}
                        placeholder="••••••••"
                        show={showPassword}
                        onToggle={() => setShowPassword(v => !v)}
                      />
                      {pw && (
                        <div className="pw-strength">
                          <div className="pw-bars">
                            {[0,1,2,3].map(i => (
                              <div key={i} className="pw-bar" style={{ background: i < pwStrength ? pwColors[pwStrength - 1] : 'var(--surface-08)' }} />
                            ))}
                          </div>
                          <span className="pw-label" style={{ color: pwColors[pwStrength - 1] }}>{pwLabels[pwStrength - 1]}</span>
                        </div>
                      )}
                    </FormField>
                    <FormField label="Confirm Password" htmlFor="signup-confirm-password" error={form2.formState.errors.confirmPassword?.message}>
                      <PasswordInput
                        id="signup-confirm-password"
                        {...form2.register('confirmPassword')}
                        hasError={Boolean(form2.formState.errors.confirmPassword)}
                        placeholder="••••••••"
                        show={showConfirm}
                        onToggle={() => setShowConfirm(v => !v)}
                      />
                    </FormField>
                    <div className="su-btn-row">
                      <motion.button type="button" className="su-back-btn" whileTap={{ scale: 0.97 }} onClick={() => setStep(0)}>
                        <ChevronLeft size={16} /> Back
                      </motion.button>
                      <motion.button type="submit" className="su-next-btn" disabled={isLoading} whileTap={{ scale: 0.97 }}>
                        {isLoading ? <><span className="spinner" /> Creating...</> : <><UserPlus size={15} /> Create Account</>}
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {onRequestClose && (
              <p className="su-login-link">
                Already have an account?{' '}
                <button type="button" className="su-login-btn" onClick={onRequestClose}>Sign in</button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
