import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  ArrowLeft, Clock, Zap, CheckCircle2,
  AlertTriangle, Trophy, XCircle, BookOpen,
  ShieldAlert, ChevronRight, Upload, FileText,
  Image, File, Paperclip, ArrowRight, ClipboardList,
  CalendarClock, Info, Volume2, VolumeX
} from 'lucide-react'
import { sfx, music, useSfxToggle } from '../../lib/sfx'
import './TakeAssessment.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Choice = {
  id: string
  choice_text: string
  is_correct: boolean
  order_index: number
}

type Question = {
  id: string
  order_index: number
  question_text: string
  question_type: string
  points: number
  explanation: string | null
  correct_choice_index: number | null
  choices: Choice[]
}

type Assessment = {
  id: string
  title: string
  description: string | null
  type: string
  total_points: number
  xp_reward: number
  time_limit: number | null
  due_date: string | null
  difficulty: string | null
  module_topic: string | null
  total_questions: number | null
}

type Phase = 'loading' | 'lobby' | 'quiz' | 'file_submission' | 'submitting' | 'results' | 'error' | 'already_done'

const TYPE_COLOR: Record<string, string> = {
  quiz: '#9B7ED4', activity: '#00D4AA', assignment: '#FFB830', exam: '#FF6B8A',
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const ACCEPTED_EXTS = '.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp'
const MAX_FILE_MB = 20

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatDue(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={18} color="#00D4AA" />
  if (type === 'application/pdf') return <FileText size={18} color="#FF6B8A" />
  if (type.includes('word')) return <FileText size={18} color="#9B7ED4" />
  if (type.includes('presentation') || type.includes('powerpoint')) return <FileText size={18} color="#FFB830" />
  return <File size={18} color="var(--text-secondary)" />
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Types that use file submission (no questions)
function isFileType(type: string) {
  return type === 'assignment' || type === 'activity'
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TakeAssessment() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [phase, setPhase]           = useState<Phase>('loading')
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions]   = useState<Question[]>([])
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [current, setCurrent]       = useState(0)
  const [timeLeft, setTimeLeft]     = useState(0)
  const [tabWarnings, setTabWarnings] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)

  // Results
  const [score, setScore]       = useState(0)
  const [total, setTotal]       = useState(0)
  const [pct, setPct]           = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [reviewMode, setReviewMode] = useState(false)

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploading, setUploading]         = useState(false)
  const [uploadError, setUploadError]     = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submittedFileNames, setSubmittedFileNames] = useState<string[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_WARNINGS = 3
  const { muted: sfxMuted, toggle: toggleSfx } = useSfxToggle()

  // ── Load assessment ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return
    load()
  }, [id, user])

  const load = async () => {
    try {
      const { data: existingSub } = await supabase
        .from('submissions')
        .select('id, score, total_points, percentage, xp_earned, is_submitted')
        .eq('assessment_id', id)
        .eq('student_id', user!.id)
        .single()

      if (existingSub?.is_submitted) {
        setScore(existingSub.score ?? 0)
        setTotal(existingSub.total_points ?? 0)
        setPct(existingSub.percentage ?? 0)
        setXpEarned(existingSub.xp_earned ?? 0)
        setSubmissionId(existingSub.id)

        // Load assessment so AlreadyDone / Review screens have it
        const { data: aData } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', id)
          .single()
        if (aData) setAssessment(aData)

        // Load questions only for quiz/exam types
        if (aData && !isFileType(aData.type)) {
          const { data: qData } = await supabase
            .from('questions')
            .select('*, choices(*)')
            .eq('assessment_id', id)
            .order('order_index')

          const qs: Question[] = (qData ?? []).map(q => ({
            ...q,
            choices: [...(q.choices ?? [])].sort((a: Choice, b: Choice) => a.order_index - b.order_index),
          }))
          setQuestions(qs)

          const { data: prevAnswers } = await supabase
            .from('answers')
            .select('question_id, choice_id')
            .eq('submission_id', existingSub.id)

          const answerMap: Record<string, string> = {}
          for (const a of prevAnswers ?? []) {
            if (a.choice_id) answerMap[a.question_id] = a.choice_id
          }
          setAnswers(answerMap)
        }

        // Load submitted file names for file-based already_done screen
        const { data: fileSubs } = await supabase
          .from('file_submissions')
          .select('file_name')
          .eq('submission_id', existingSub.id)
        setSubmittedFileNames((fileSubs ?? []).map((f: any) => f.file_name))

        setPhase('already_done')
        return
      }

      const { data: aData, error: aErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single()
      if (aErr) throw aErr
      setAssessment(aData)

      // Only load questions for quiz/exam types
      if (!isFileType(aData.type)) {
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('*, choices(*)')
          .eq('assessment_id', id)
          .order('order_index')
        if (qErr) throw qErr

        const qs: Question[] = (qData ?? []).map(q => ({
          ...q,
          choices: [...(q.choices ?? [])].sort((a: Choice, b: Choice) => a.order_index - b.order_index),
        }))
        setQuestions(qs)
      }

      if (aData.time_limit) setTimeLeft(aData.time_limit * 60)
      setPhase('lobby')
    } catch (err) {
      console.error(err)
      setPhase('error')
    }
  }

  // ── Timer ────────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (!assessment?.time_limit) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleSubmit(true)
          return 0
        }
        if (prev - 1 <= 5) sfx.tick()
        return prev - 1
      })
    }, 1000)
  }, [assessment])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])
  useEffect(() => () => { music.stop() }, [])

  // ── Anti-cheat: tab visibility (quiz/exam only) ────────────────────────────
  useEffect(() => {
    if (phase !== 'quiz') return

    const handleVisibility = () => {
      if (document.hidden) {
        sfx.warning()
        setTabWarnings(prev => {
          const next = prev + 1
          setShowWarning(true)
          setTimeout(() => setShowWarning(false), 3000)
          if (next >= MAX_WARNINGS) handleSubmit(true)
          return next
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [phase])

  // ── Start ─────────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      const { data: sub, error } = await supabase
        .from('submissions')
        .upsert({
          assessment_id: id,
          student_id: user!.id,
          is_submitted: false,
          total_points: assessment!.total_points,
        }, { onConflict: 'assessment_id,student_id' })
        .select()
        .single()
      if (error) throw error
      setSubmissionId(sub.id)

      if (isFileType(assessment!.type)) {
        music.play()
        setPhase('file_submission')
      } else {
        music.play()
        setPhase('quiz')
        startTimer()
      }
    } catch (err) {
      console.error(err)
      setPhase('error')
    }
  }

  // ── Quiz answer selection ─────────────────────────────────────────────────────
  const selectAnswer = (questionId: string, choiceId: string) => {
    sfx.select()
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }))
  }

  // ── Quiz submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (auto = false) => {
    if (timerRef.current) clearInterval(timerRef.current)
    music.stop()
    sfx.submit()
    setPhase('submitting')

    try {
      let earnedScore = 0
      const totalPts = questions.reduce((s, q) => s + q.points, 0)
      const answerRows: any[] = []

      for (const q of questions) {
        const choiceId = answers[q.id] ?? null
        const choice = q.choices.find(c => c.id === choiceId)
        const correct = choice?.is_correct ?? false
        const pts = correct ? q.points : 0
        earnedScore += pts

        answerRows.push({
          submission_id: submissionId,
          question_id: q.id,
          choice_id: choiceId,
          is_correct: correct,
          points_earned: pts,
        })
      }

      const percentage = totalPts > 0 ? Math.round((earnedScore / totalPts) * 100) : 0
      const xp = correct_xp(percentage, assessment!.xp_reward)

      if (answerRows.length > 0) {
        await supabase.from('answers').insert(answerRows)
      }

      await supabase
        .from('submissions')
        .update({
          score: earnedScore,
          total_points: totalPts,
          xp_earned: xp,
          is_submitted: true,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

      if (xp > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp, level')
          .eq('id', user!.id)
          .single()
        if (profile) {
          const newXp = (profile.xp ?? 0) + xp
          const newLevel = Math.floor(newXp / 1000) + 1
          await supabase
            .from('profiles')
            .update({ xp: newXp, level: newLevel, last_active: new Date().toISOString() })
            .eq('id', user!.id)
        }
      }

      setScore(earnedScore)
      setTotal(totalPts)
      setPct(percentage)
      setXpEarned(xp)
      setPhase('results')
      if (percentage >= 60) sfx.success()
      else sfx.needsWork()
    } catch (err) {
      console.error(err)
      setPhase('error')
    }
  }

  // ── File submission (assignment + activity) ───────────────────────────────────
  const handleFileSubmit = async () => {
    if (uploadedFiles.length === 0) {
      setUploadError('Please attach at least one file before submitting.')
      return
    }
    setUploadError('')
    setUploading(true)
    setUploadProgress(0)
    music.stop()

    try {
      const fileRows: any[] = []
      const totalFiles = uploadedFiles.length
      const folder = assessment!.type === 'activity' ? 'activities' : 'assignments'

      console.log('[FileSubmit] submissionId:', submissionId)
      console.log('[FileSubmit] userId:', user!.id)
      console.log('[FileSubmit] assessmentId:', id)

      // Step 1: Upload files to Storage
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i]
        const ext = file.name.split('.').pop()
        const path = `${folder}/${user!.id}/${id}/${Date.now()}_${i}.${ext}`
        console.log('[FileSubmit] uploading to path:', path)

        const { data: storageData, error: upErr } = await supabase.storage
          .from('submissions')
          .upload(path, file, { upsert: true })

        if (upErr) {
          console.error('[FileSubmit] Storage upload error:', upErr)
          throw new Error(`Storage upload failed: ${upErr.message}`)
        }
        console.log('[FileSubmit] uploaded ok:', storageData)

        const { data: urlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(path)

        fileRows.push({
          submission_id: submissionId,
          student_id: user!.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
        })

        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
      }

      // Step 2: Insert file_submissions rows
      console.log('[FileSubmit] inserting file_submissions:', fileRows)
      const { data: fsData, error: fsErr } = await supabase
        .from('file_submissions')
        .insert(fileRows)
        .select()
      if (fsErr) {
        console.error('[FileSubmit] file_submissions insert error:', fsErr)
        throw new Error(`DB insert failed: ${fsErr.message}`)
      }
      console.log('[FileSubmit] file_submissions inserted:', fsData)

      // Step 3: Mark submission as submitted
      const { error: subErr } = await supabase
        .from('submissions')
        .update({
          score: 0,
          total_points: assessment!.total_points,
          xp_earned: 0,
          is_submitted: true,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
      if (subErr) {
        console.error('[FileSubmit] submission update error:', subErr)
        throw new Error(`Submission update failed: ${subErr.message}`)
      }

      // Step 4: Award XP
      const xp = Math.round(assessment!.xp_reward * 0.25)
      if (xp > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp, level')
          .eq('id', user!.id)
          .single()
        if (profile) {
          const newXp = (profile.xp ?? 0) + xp
          const newLevel = Math.floor(newXp / 1000) + 1
          await supabase
            .from('profiles')
            .update({ xp: newXp, level: newLevel, last_active: new Date().toISOString() })
            .eq('id', user!.id)
        }
      }

      setXpEarned(xp)
      setSubmittedFileNames(uploadedFiles.map(f => f.name))
      setPhase('results')
    } catch (err: any) {
      console.error('[FileSubmit] FAILED:', err)
      setUploadError(err.message ?? 'Upload failed. Please try again.')
      setUploading(false)
    } finally {
      setUploading(false)
    }
  }

  function correct_xp(pct: number, base: number) {
    if (pct >= 90) return base
    if (pct >= 75) return Math.round(base * 0.75)
    if (pct >= 50) return Math.round(base * 0.5)
    return Math.round(base * 0.25)
  }

  const answered = Object.keys(answers).length
  const timerDanger = timeLeft > 0 && timeLeft <= 60

  // ── Render ────────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="ta-loading">
      <span className="ta-spinner" />
      <p>Loading assessment…</p>
    </div>
  )

  if (phase === 'error') return (
    <div className="ta-error">
      <XCircle size={40} color="#FF6B8A" />
      <p>Failed to load this assessment.</p>
      <button onClick={() => navigate('/student/assessments')}>Go back</button>
    </div>
  )

  if (phase === 'already_done') return (
    <div className="ta-root">
      <AlreadyDone
        assessment={assessment}
        score={score} total={total} pct={pct} xpEarned={xpEarned}
        submittedFileNames={submittedFileNames}
        onBack={() => navigate('/student/assessments')}
        onReview={() => { setReviewMode(true); setPhase('results') }}
      />
    </div>
  )

  if (phase === 'submitting') return (
    <div className="ta-loading">
      <span className="ta-spinner" />
      <p>{isFileType(assessment?.type ?? '') ? 'Uploading your files…' : 'Grading your answers…'}</p>
    </div>
  )

  if (phase === 'results') return (
    <div className="ta-root">
      <Results
        assessment={assessment!}
        questions={questions}
        answers={answers}
        score={score} total={total} pct={pct} xpEarned={xpEarned}
        reviewMode={reviewMode}
        submittedFileNames={submittedFileNames}
        onBack={() => navigate('/student/assessments')}
        onReview={() => setReviewMode(true)}
      />
    </div>
  )

  // ── Lobby ─────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    const type = assessment?.type ?? 'quiz'
    const color = TYPE_COLOR[type] ?? '#9B7ED4'
    const isFile = isFileType(type)
    return (
      <div className="ta-root">
        <motion.div
          className="ta-lobby"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="ta-lobby-topbar">
            <button className="ta-back-btn" style={{ marginBottom: 0 }} onClick={() => navigate('/student/assessments')}>
              <ArrowLeft size={15} /> Back
            </button>
            <button className="ta-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound & music' : 'Mute sound & music'}>
              {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          <div className="ta-lobby-icon" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <BookOpen size={28} color={color} />
          </div>

          <span className="ta-lobby-type" style={{ color, borderColor: `${color}35`, background: `${color}10` }}>
            {type.toUpperCase()}
          </span>

          <h1 className="ta-lobby-title">{assessment?.title}</h1>
          {assessment?.description && <p className="ta-lobby-desc">{assessment.description}</p>}

          <div className="ta-lobby-meta">
            {!isFile && questions.length > 0 && (
              <div className="ta-meta-chip">
                <BookOpen size={13} color="#9B7ED4" />
                <span>{questions.length} Questions</span>
              </div>
            )}
            {isFile && (
              <div className="ta-meta-chip">
                <Paperclip size={13} color={color} />
                <span>File Submission</span>
              </div>
            )}
            {assessment?.time_limit && (
              <div className="ta-meta-chip">
                <Clock size={13} color="#FFB830" />
                <span>{assessment.time_limit} min limit</span>
              </div>
            )}
            <div className="ta-meta-chip">
              <Zap size={13} color="#00D4AA" />
              <span>{assessment?.xp_reward} XP reward</span>
            </div>
          </div>

          {isFile ? (
            <div className="ta-lobby-rules" style={{ background: `${color}08`, borderColor: `${color}25` }}>
              <p className="ta-rules-title" style={{ color }}>
                <Upload size={14} /> Submission Instructions
              </p>
              <ul>
                <li>Upload your work as a PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), or image (JPG, PNG).</li>
                <li>Maximum file size: {MAX_FILE_MB} MB per file. You may attach multiple files.</li>
                <li>You can only submit once — review your files carefully before confirming.</li>
                {assessment?.due_date && (
                  <li>Due: {new Date(assessment.due_date).toLocaleString()}</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="ta-lobby-rules">
              <p className="ta-rules-title"><ShieldAlert size={14} /> Rules</p>
              <ul>
                <li>Do not switch or close this tab — it will be counted as a violation.</li>
                <li>After {MAX_WARNINGS} tab-switch warnings, the quiz auto-submits.</li>
                {assessment?.time_limit && <li>You have {assessment.time_limit} minutes to complete this assessment.</li>}
                <li>You can only submit once. Make sure you've answered everything.</li>
              </ul>
            </div>
          )}

          <motion.button
            className="ta-start-btn"
            onClick={handleStart}
            whileTap={{ scale: 0.97 }}
            style={isFile ? { background: `linear-gradient(135deg, ${color}CC, ${color}88)` } : {}}
          >
            {isFile ? 'Open Submission' : 'Start Assessment'}
            <ChevronRight size={16} />
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ── File submission (activity / assignment) ───────────────────────────────────
  if (phase === 'file_submission') {
    return (
      <div className="ta-root">
        <FileSubmission
          assessment={assessment!}
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          uploading={uploading}
          uploadError={uploadError}
          setUploadError={setUploadError}
          uploadProgress={uploadProgress}
          onSubmit={handleFileSubmit}
          onBack={() => navigate('/student/assessments')}
        />
      </div>
    )
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────────
  const q = questions[current]
  if (!q) return (
    <div className="ta-error">
      <XCircle size={40} color="#FF6B8A" />
      <p>No questions found for this assessment.</p>
      <button onClick={() => navigate('/student/assessments')}>Go back</button>
    </div>
  )

  const progress = ((current + 1) / questions.length) * 100

  return (
    <div className="ta-root">
      <AnimatePresence>
        {showWarning && (
          <motion.div
            className="ta-anticheat-toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AlertTriangle size={16} color="#FFB830" />
            Tab switch detected! Warning {tabWarnings}/{MAX_WARNINGS}
            {tabWarnings >= MAX_WARNINGS - 1 && ' — next violation auto-submits!'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ta-quiz-header">
        <div className="ta-quiz-header-left">
          <span className="ta-quiz-title">{assessment?.title}</span>
          <span className="ta-quiz-progress-text">{current + 1} / {questions.length}</span>
        </div>
        <div className="ta-quiz-header-right">
          <button className="ta-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound & music' : 'Mute sound & music'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          {tabWarnings > 0 && (
            <span className="ta-warn-badge">
              <AlertTriangle size={12} /> {tabWarnings}/{MAX_WARNINGS}
            </span>
          )}
          {assessment?.time_limit && (
            <div className={`ta-timer ${timerDanger ? 'danger' : ''}`}>
              <Clock size={14} />
              {fmt(timeLeft)}
            </div>
          )}
        </div>
      </div>

      <div className="ta-progress-track">
        <motion.div
          className="ta-progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="ta-quiz-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            className="ta-question-card"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="ta-question-num">
              Q{current + 1}
              <span className="ta-question-pts">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
            </div>
            <p className="ta-question-text">{q.question_text}</p>

            <div className="ta-choices">
              {q.choices.map((c, ci) => {
                const selected = answers[q.id] === c.id
                return (
                  <motion.button
                    key={c.id}
                    className={`ta-choice ${selected ? 'selected' : ''}`}
                    onClick={() => selectAnswer(q.id, c.id)}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.05 }}
                  >
                    <span className="ta-choice-label">{['A','B','C','D'][ci]}</span>
                    <span className="ta-choice-text">{c.choice_text}</span>
                    {selected && <CheckCircle2 size={16} className="ta-choice-check" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="ta-quiz-nav">
          <button
            className="ta-nav-btn"
            onClick={() => { sfx.nav(); setCurrent(p => Math.max(0, p - 1)) }}
            disabled={current === 0}
          >
            <ArrowLeft size={15} /> Previous
          </button>

          <div className="ta-dot-nav">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                className={`ta-dot ${i === current ? 'active' : ''} ${answers[qq.id] ? 'answered' : ''}`}
                onClick={() => { sfx.nav(); setCurrent(i) }}
                title={`Q${i + 1}`}
              />
            ))}
          </div>

          {current < questions.length - 1 ? (
            <button
              className="ta-nav-btn primary"
              onClick={() => { sfx.nav(); setCurrent(p => Math.min(questions.length - 1, p + 1)) }}
            >
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button
              className="ta-nav-btn submit"
              onClick={() => handleSubmit(false)}
            >
              Submit <CheckCircle2 size={15} />
            </button>
          )}
        </div>

        <p className="ta-answered-count">
          {answered} of {questions.length} answered
          {answered < questions.length && <span className="ta-unanswered"> · {questions.length - answered} unanswered</span>}
        </p>
      </div>
    </div>
  )
}

// ── File Submission Page (activity & assignment) ───────────────────────────────
function FileSubmission({
  assessment, uploadedFiles, setUploadedFiles,
  uploading, uploadError, setUploadError, uploadProgress, onSubmit, onBack,
}: {
  assessment: Assessment
  uploadedFiles: File[]
  setUploadedFiles: (files: File[]) => void
  uploading: boolean
  uploadError: string
  setUploadError: (e: string) => void
  uploadProgress: number
  onSubmit: () => void
  onBack: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const isActivity = assessment.type === 'activity'
  const accentColor = isActivity ? '#00D4AA' : '#FFB830'
  const typeLabel   = isActivity ? 'ACTIVITY' : 'ASSIGNMENT'

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid: File[] = []
    const errors: string[] = []
    Array.from(incoming).forEach(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        errors.push(`"${f.name}" is not a supported file type.`)
      } else if (f.size > MAX_FILE_MB * 1024 * 1024) {
        errors.push(`"${f.name}" exceeds the ${MAX_FILE_MB} MB limit.`)
      } else {
        valid.push(f)
      }
    })
    if (errors.length) setUploadError(errors.join(' '))
    else setUploadError('')
    setUploadedFiles([...uploadedFiles, ...valid])
  }

  const removeFile = (idx: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))
  }

  return (
    <motion.div
      className="ta-submission-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── GClassroom-style header bar ── */}
      <div className="ta-sub-topbar" style={{ borderBottomColor: `${accentColor}30` }}>
        <button className="ta-back-btn" style={{ marginBottom: 0 }} onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="ta-sub-topbar-title">
          <span className="ta-lobby-type" style={{ color: accentColor, borderColor: `${accentColor}35`, background: `${accentColor}10` }}>
            {typeLabel}
          </span>
          <span className="ta-sub-topbar-name">{assessment.title}</span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="ta-sub-layout">

        {/* Left — details panel */}
        <div className="ta-sub-details">
          <div className="ta-sub-details-header" style={{ borderLeftColor: accentColor }}>
            <h2 className="ta-sub-details-title">{assessment.title}</h2>
            {assessment.module_topic && (
              <p className="ta-sub-details-topic">
                <BookOpen size={12} /> {assessment.module_topic}
              </p>
            )}
          </div>

          {/* Meta row */}
          <div className="ta-sub-meta-row">
            {assessment.due_date && (
              <div className="ta-sub-meta-item">
                <CalendarClock size={14} color={accentColor} />
                <div>
                  <p className="ta-sub-meta-label">Due date</p>
                  <p className="ta-sub-meta-value">{formatDue(assessment.due_date)}</p>
                </div>
              </div>
            )}
            <div className="ta-sub-meta-item">
              <ClipboardList size={14} color={accentColor} />
              <div>
                <p className="ta-sub-meta-label">Total points</p>
                <p className="ta-sub-meta-value">{assessment.total_points} pts</p>
              </div>
            </div>
            <div className="ta-sub-meta-item">
              <Zap size={14} color={accentColor} />
              <div>
                <p className="ta-sub-meta-label">XP reward</p>
                <p className="ta-sub-meta-value">{assessment.xp_reward} XP</p>
              </div>
            </div>
          </div>

          {/* Description / instructions */}
          {assessment.description && (
            <div className="ta-sub-instructions">
              <p className="ta-sub-instructions-label"><Info size={13} /> Instructions</p>
              <p className="ta-sub-instructions-body">{assessment.description}</p>
            </div>
          )}

          {/* Accepted formats */}
          <div className="ta-sub-formats">
            <p className="ta-sub-formats-label">Accepted formats</p>
            <div className="ta-sub-formats-chips">
              {['PDF', 'DOC / DOCX', 'PPT / PPTX', 'JPG / PNG'].map(f => (
                <span key={f} className="ta-sub-format-chip">{f}</span>
              ))}
            </div>
            <p className="ta-sub-formats-limit">Max {MAX_FILE_MB} MB per file</p>
          </div>
        </div>

        {/* Right — submission panel */}
        <div className="ta-sub-panel">
          <div className="ta-sub-panel-header">
            <span className="ta-sub-panel-title">Your submission</span>
            <span className="ta-sub-panel-count">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} attached
            </span>
          </div>

          {/* Drop zone */}
          <div
            className={`ta-sub-dropzone ${dragging ? 'dragging' : ''}`}
            style={dragging ? { borderColor: accentColor, background: `${accentColor}08` } : {}}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTS}
              style={{ display: 'none' }}
              onChange={e => addFiles(e.target.files)}
            />
            <div className="ta-sub-dropzone-icon" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}25` }}>
              <Upload size={22} color={dragging ? accentColor : 'var(--text-muted)'} />
            </div>
            <p className="ta-sub-dropzone-title">
              {dragging ? 'Release to attach' : 'Add files'}
            </p>
            <p className="ta-sub-dropzone-hint">
              Drag & drop or click to browse
            </p>
          </div>

          {/* File list */}
          <AnimatePresence>
            {uploadedFiles.map((f, i) => (
              <motion.div
                key={`${f.name}-${i}`}
                className="ta-sub-file-row"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="ta-sub-file-icon">{fileIcon(f.type)}</div>
                <div className="ta-sub-file-info">
                  <span className="ta-file-name">{f.name}</span>
                  <span className="ta-file-size">{fmtBytes(f.size)}</span>
                </div>
                <button
                  className="ta-file-remove"
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  title="Remove"
                >
                  <XCircle size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {uploadError && (
              <motion.div
                className="ta-upload-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <AlertTriangle size={13} /> {uploadError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload progress */}
          {uploading && (
            <div className="ta-upload-progress-wrap">
              <div className="ta-upload-progress-bar">
                <motion.div
                  className="ta-upload-progress-fill"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }}
                />
              </div>
              <span className="ta-upload-pct">{uploadProgress}%</span>
            </div>
          )}

          {/* Submit button */}
          <motion.button
            className="ta-sub-submit-btn"
            style={{
              background: uploadedFiles.length === 0 || uploading
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${accentColor}CC, ${accentColor}88)`,
              color: uploadedFiles.length === 0 || uploading ? 'var(--text-muted)' : '#0A0F1E',
              cursor: uploadedFiles.length === 0 || uploading ? 'not-allowed' : 'pointer',
            }}
            onClick={onSubmit}
            disabled={uploading || uploadedFiles.length === 0}
            whileTap={uploadedFiles.length > 0 && !uploading ? { scale: 0.98 } : {}}
          >
            {uploading
              ? <><span className="ta-spinner" style={{ width: 14, height: 14, borderTopColor: accentColor }} /> Uploading…</>
              : <><CheckCircle2 size={16} /> Turn In</>}
          </motion.button>

          <p className="ta-sub-once-note">
            You can only submit once. Review your files before turning in.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Already Done screen ───────────────────────────────────────────────────────
function AlreadyDone({ assessment, score, total, pct, xpEarned, submittedFileNames, onBack, onReview }: any) {
  const isFile = isFileType(assessment?.type ?? '')
  return (
    <motion.div className="ta-lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="ta-lobby-icon" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)' }}>
        <CheckCircle2 size={28} color="#00D4AA" />
      </div>
      <h1 className="ta-lobby-title">Already Submitted</h1>
      <p className="ta-lobby-desc">
        {isFile
          ? 'Your submission has been turned in. Grades will be posted by your teacher.'
          : "You've already completed this assessment."}
      </p>

      {isFile && submittedFileNames?.length > 0 && (
        <div className="ta-submitted-files">
          <p className="ta-submitted-files-label"><Paperclip size={13} /> Submitted files</p>
          {submittedFileNames.map((name: string, i: number) => (
            <div key={i} className="ta-submitted-file-chip">
              <FileText size={13} /> {name}
            </div>
          ))}
        </div>
      )}

      {!isFile && (
        <div className="ta-lobby-meta">
          <div className="ta-meta-chip"><Trophy size={13} color="#FFB830" /><span>{score}/{total} pts</span></div>
          <div className="ta-meta-chip"><CheckCircle2 size={13} color="#00D4AA" /><span>{pct}%</span></div>
          <div className="ta-meta-chip"><Zap size={13} color="#9B7ED4" /><span>{xpEarned} XP earned</span></div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="ta-nav-btn" onClick={onBack}><ArrowLeft size={15} /> Back</button>
        {!isFile && (
          <button className="ta-nav-btn primary" onClick={onReview}><BookOpen size={15} /> Review Answers</button>
        )}
      </div>
    </motion.div>
  )
}

// ── Results screen ────────────────────────────────────────────────────────────
function Results({ assessment, questions, answers, score, total, pct, xpEarned, reviewMode, submittedFileNames, onBack, onReview }: any) {
  const isFile = isFileType(assessment?.type ?? '')

  // File submission confirmation screen
  if (isFile) {
    const isActivity = assessment?.type === 'activity'
    const accentColor = isActivity ? '#00D4AA' : '#FFB830'
    return (
      <motion.div className="ta-results" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <div className="ta-lobby-icon" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}28`, width: 72, height: 72 }}>
          <CheckCircle2 size={32} color={accentColor} />
        </div>
        <h2 className="ta-results-title">Turned In!</h2>
        <p className="ta-lobby-desc" style={{ marginTop: 0 }}>
          Your files have been received. Your teacher will review and post your grade.
        </p>

        {submittedFileNames?.length > 0 && (
          <div className="ta-submitted-files">
            <p className="ta-submitted-files-label" style={{ color: accentColor }}>
              <Paperclip size={13} /> Submitted files
            </p>
            {submittedFileNames.map((name: string, i: number) => (
              <div key={i} className="ta-submitted-file-chip" style={{ borderColor: `${accentColor}20`, background: `${accentColor}08` }}>
                <FileText size={13} /> {name}
              </div>
            ))}
          </div>
        )}

        <div className="ta-results-chips">
          <div className="ta-result-chip"><Zap size={14} color="#9B7ED4" /><span>+{xpEarned} XP (submission bonus)</span></div>
        </div>

        <div className="ta-results-actions">
          <button className="ta-nav-btn primary" onClick={onBack}><ArrowLeft size={15} /> Back to Assessments</button>
        </div>
      </motion.div>
    )
  }

  // Quiz results
  const grade = pct >= 90 ? 'Excellent!' : pct >= 75 ? 'Great job!' : pct >= 50 ? 'Keep it up!' : 'Needs work'
  const gradeColor = pct >= 90 ? '#00D4AA' : pct >= 75 ? '#9B7ED4' : pct >= 50 ? '#FFB830' : '#FF6B8A'

  if (reviewMode) {
    return (
      <div className="ta-review">
        <div className="ta-review-header">
          <button className="ta-back-btn" onClick={onBack}><ArrowLeft size={15} /> Back to Assessments</button>
          <h2 className="ta-review-title">Answer Review — {assessment.title}</h2>
          <span className="ta-review-score">{score}/{total} ({pct}%)</span>
        </div>
        <div className="ta-review-list">
          {questions.map((q: Question, i: number) => {
            const selectedId = answers[q.id]
            const selected = q.choices.find((c: Choice) => c.id === selectedId)
            const isCorrect = selected?.is_correct ?? false
            return (
              <div key={q.id} className={`ta-review-card ${isCorrect ? 'correct' : 'wrong'}`}>
                <div className="ta-review-q-top">
                  <span className="ta-question-num" style={{ fontSize: 12 }}>Q{i + 1}</span>
                  {isCorrect
                    ? <CheckCircle2 size={16} color="#00D4AA" />
                    : <XCircle size={16} color="#FF6B8A" />}
                </div>
                <p className="ta-question-text" style={{ fontSize: 14, marginBottom: 12 }}>{q.question_text}</p>
                <div className="ta-choices" style={{ gap: 6 }}>
                  {q.choices.map((c: Choice, ci: number) => {
                    const isSelected = c.id === selectedId
                    const isCorrectChoice = c.is_correct
                    let cls = 'ta-choice review'
                    if (isCorrectChoice) cls += ' review-correct'
                    else if (isSelected && !isCorrectChoice) cls += ' review-wrong'
                    return (
                      <div key={c.id} className={cls}>
                        <span className="ta-choice-label">{['A','B','C','D'][ci]}</span>
                        <span className="ta-choice-text">{c.choice_text}</span>
                        {isCorrectChoice && <CheckCircle2 size={13} color="#00D4AA" />}
                        {isSelected && !isCorrectChoice && <XCircle size={13} color="#FF6B8A" />}
                      </div>
                    )
                  })}
                </div>
                {(q as any).explanation && (
                  <div className="ta-review-explanation">
                    <span>Explanation:</span> {(q as any).explanation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <motion.div className="ta-results" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
      <div className="ta-score-circle" style={{ borderColor: gradeColor, boxShadow: `0 0 40px ${gradeColor}20` }}>
        <span className="ta-score-pct" style={{ color: gradeColor }}>{pct}%</span>
        <span className="ta-score-grade" style={{ color: gradeColor }}>{grade}</span>
      </div>

      <h2 className="ta-results-title">{assessment.title}</h2>

      <div className="ta-results-chips">
        <div className="ta-result-chip"><Trophy size={14} color="#FFB830" /><span>{score} / {total} pts</span></div>
        <div className="ta-result-chip"><Zap size={14} color="#9B7ED4" /><span>+{xpEarned} XP</span></div>
        <div className="ta-result-chip">
          <CheckCircle2 size={14} color="#00D4AA" />
          <span>{questions.filter((q: Question) => answers[q.id] && q.choices.find((c: Choice) => c.id === answers[q.id])?.is_correct).length} correct</span>
        </div>
        <div className="ta-result-chip">
          <XCircle size={14} color="#FF6B8A" />
          <span>{questions.filter((q: Question) => !answers[q.id] || !q.choices.find((c: Choice) => c.id === answers[q.id])?.is_correct).length} wrong</span>
        </div>
      </div>

      <div className="ta-result-bar-wrap">
        <div className="ta-result-bar-track">
          <motion.div
            className="ta-result-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            style={{ background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}99)` }}
          />
        </div>
      </div>

      <div className="ta-results-actions">
        <button className="ta-nav-btn" onClick={onBack}><ArrowLeft size={15} /> Back to Assessments</button>
        <button className="ta-nav-btn primary" onClick={onReview}><BookOpen size={15} /> Review Answers</button>
      </div>
    </motion.div>
  )
}
