import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  Layers, Plus, Search, Users, Pencil, Archive, ArchiveRestore,
  X, UserPlus, UserMinus, Calendar, GraduationCap, ArrowRightLeft, Loader2
} from 'lucide-react'
import './TeacherBlocks.css'

// ── Types ─────────────────────────────────────────────────────────────────
interface Block {
  id: string
  name: string
  description: string | null
  school_year: string | null
  semester: string | null
  is_archived: boolean
  created_at: string
  studentCount: number
}

interface RosterStudent {
  enrollment_id: string
  id: string
  school_id: string
  first_name: string
  last_name: string
  username: string
}

interface StudentOption {
  id: string
  school_id: string
  first_name: string
  last_name: string
  username: string
  activeBlockId: string | null
  activeBlockName: string | null
}

interface BlockForm {
  name: string
  description: string
  school_year: string
  semester: string
}

const emptyForm: BlockForm = { name: '', description: '', school_year: '', semester: '1st Semester' }
const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']

const ease = [0.16, 1, 0.3, 1] as const
const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.04, ease },
})

export default function TeacherBlocks() {
  const { user } = useAuth()

  // Blocks list
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  // Create / edit modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [form, setForm] = useState<BlockForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Roster panel
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)

  // Add student modal
  const [addOpen, setAddOpen] = useState(false)
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [confirmReassign, setConfirmReassign] = useState<StudentOption | null>(null)
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null)
  const [addActionError, setAddActionError] = useState('')

  useEffect(() => { fetchBlocks() }, [])

  // ── Data fetching ─────────────────────────────────────────────────────
  const fetchBlocks = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: blocksData, error } = await supabase
        .from('blocks')
        .select('id, name, description, school_year, semester, is_archived, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error || !blocksData) { setBlocks([]); setLoading(false); return }

      let countMap: Record<string, number> = {}
      if (blocksData.length > 0) {
        const { data: counts } = await supabase
          .from('block_enrollments')
          .select('block_id')
          .eq('status', 'active')
          .in('block_id', blocksData.map(b => b.id))

        counts?.forEach((c: any) => {
          countMap[c.block_id] = (countMap[c.block_id] ?? 0) + 1
        })
      }

      setBlocks(blocksData.map((b: any) => ({ ...b, studentCount: countMap[b.id] ?? 0 })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const openRoster = async (block: Block) => {
    setSelectedBlock(block)
    setRosterLoading(true)
    try {
      const { data: enrollments } = await supabase
        .from('block_enrollments')
        .select('id, student_id')
        .eq('block_id', block.id)
        .eq('status', 'active')

      if (!enrollments || enrollments.length === 0) { setRoster([]); return }

      const { data: students } = await supabase
        .from('profiles')
        .select('id, school_id, first_name, last_name, username')
        .in('id', enrollments.map((e: any) => e.student_id))

      const merged: RosterStudent[] = enrollments
        .map((e: any) => {
          const s = students?.find((st: any) => st.id === e.student_id)
          return s ? { enrollment_id: e.id, ...s } : null
        })
        .filter(Boolean) as RosterStudent[]

      merged.sort((a, b) => a.last_name.localeCompare(b.last_name))
      setRoster(merged)
    } catch (e) {
      console.error(e)
    } finally {
      setRosterLoading(false)
    }
  }

  const openAddStudent = async () => {
    setAddOpen(true)
    setAddSearch('')
    setConfirmReassign(null)
    setAddActionError('')
    setStudentsLoading(true)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, school_id, first_name, last_name, username')
        .eq('role', 'student')
        .order('last_name')

      const { data: activeEnrollments } = await supabase
        .from('block_enrollments')
        .select('student_id, block_id')
        .eq('status', 'active')

      const blockIds = Array.from(new Set((activeEnrollments ?? []).map((e: any) => e.block_id)))
      let blockNameMap: Record<string, string> = {}
      if (blockIds.length > 0) {
        const { data: blockRows } = await supabase.from('blocks').select('id, name').in('id', blockIds)
        blockRows?.forEach((b: any) => { blockNameMap[b.id] = b.name })
      }

      const enrollMap: Record<string, string> = {}
      activeEnrollments?.forEach((e: any) => { enrollMap[e.student_id] = e.block_id })

      const options: StudentOption[] = (profiles ?? []).map((p: any) => ({
        ...p,
        activeBlockId: enrollMap[p.id] ?? null,
        activeBlockName: enrollMap[p.id] ? (blockNameMap[enrollMap[p.id]] ?? null) : null,
      }))

      setAllStudents(options)
    } catch (e) {
      console.error(e)
    } finally {
      setStudentsLoading(false)
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────
  const resetForm = () => { setForm(emptyForm); setFormError(''); setEditingBlock(null) }

  const openCreate = () => { resetForm(); setFormOpen(true) }
  const openEdit = (block: Block) => {
    setEditingBlock(block)
    setForm({ name: block.name, description: block.description ?? '', school_year: block.school_year ?? '', semester: block.semester ?? SEMESTERS[0] })
    setFormError('')
    setFormOpen(true)
  }

  const saveBlock = async () => {
    if (!user) return
    if (!form.name.trim()) { setFormError('Block name is required.'); return }
    setSaving(true)
    setFormError('')
    try {
      if (editingBlock) {
        const { error } = await supabase
          .from('blocks')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            school_year: form.school_year.trim() || null,
            semester: form.semester || null,
          })
          .eq('id', editingBlock.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('blocks').insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          school_year: form.school_year.trim() || null,
          semester: form.semester || null,
          teacher_id: user.id,
        })
        if (error) throw error
      }
      setFormOpen(false)
      resetForm()
      fetchBlocks()
    } catch (e: any) {
      setFormError(e?.message ?? 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleArchive = async (block: Block) => {
    await supabase.from('blocks').update({ is_archived: !block.is_archived }).eq('id', block.id)
    if (selectedBlock?.id === block.id) setSelectedBlock(null)
    fetchBlocks()
  }

  const removeStudent = async (enrollmentId: string) => {
    if (!selectedBlock) return
    setBusyStudentId(enrollmentId)
    await supabase
      .from('block_enrollments')
      .update({ status: 'dropped', removed_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    await openRoster(selectedBlock)
    fetchBlocks()
    setBusyStudentId(null)
  }

  const performAdd = async (student: StudentOption) => {
    if (!selectedBlock) return
    setBusyStudentId(student.id)
    setAddActionError('')
    try {
      if (student.activeBlockId) {
        const { error: dropErr } = await supabase
          .from('block_enrollments')
          .update({ status: 'dropped', removed_at: new Date().toISOString() })
          .eq('student_id', student.id)
          .eq('status', 'active')
        if (dropErr) throw dropErr
      }

      // upsert instead of insert: a (block_id, student_id) row may already
      // exist with status='dropped' from a previous removal — a plain insert
      // would fail on the unique(block_id, student_id) constraint and, before
      // this fix, fail silently. Upsert reactivates that row if present.
      const { error: addErr } = await supabase
        .from('block_enrollments')
        .upsert(
          {
            block_id: selectedBlock.id,
            student_id: student.id,
            status: 'active',
            removed_at: null,
            enrolled_at: new Date().toISOString(),
          },
          { onConflict: 'block_id,student_id' }
        )
      if (addErr) throw addErr

      setConfirmReassign(null)
      await openRoster(selectedBlock)
      fetchBlocks()
      await openAddStudent() // refresh the list's badges
    } catch (e: any) {
      console.error(e)
      setAddActionError(e?.message ?? 'Failed to add student. Please try again.')
    } finally {
      setBusyStudentId(null)
    }
  }

  const handleAddClick = (student: StudentOption) => {
    if (student.activeBlockId === selectedBlock?.id) return
    if (student.activeBlockId) { setConfirmReassign(student); return }
    performAdd(student)
  }

  // ── Derived ───────────────────────────────────────────────────────────
  const filteredBlocks = useMemo(() => {
    return blocks
      .filter(b => showArchived ? true : !b.is_archived)
      .filter(b => b.name.toLowerCase().includes(search.trim().toLowerCase()))
  }, [blocks, search, showArchived])

  const filteredStudentOptions = useMemo(() => {
    const q = addSearch.trim().toLowerCase()
    return allStudents
      .filter(s => s.activeBlockId !== selectedBlock?.id)
      .filter(s =>
        !q ||
        s.school_id.toLowerCase().includes(q) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
      )
  }, [allStudents, addSearch, selectedBlock])

  return (
    <div className="blk-root">
      {/* Header */}
      <motion.div className="blk-header" {...stagger(0)}>
        <div>
          <p className="blk-header-label">TEACHER VIEW</p>
          <h1 className="blk-header-title">Blocks &amp; Sections</h1>
          <p className="blk-header-sub">Create sections and manage which students belong to each one.</p>
        </div>
        <button className="blk-create-btn" onClick={openCreate}>
          <Plus size={15} /> Create Block
        </button>
      </motion.div>

      {/* Controls */}
      <motion.div className="blk-controls" {...stagger(1)}>
        <div className="blk-search-wrap">
          <Search size={14} color="var(--text-muted)" className="blk-search-icon" />
          <input
            className="blk-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search blocks by name…"
          />
        </div>
        <button
          className={`blk-archive-toggle ${showArchived ? 'blk-archive-toggle--active' : ''}`}
          onClick={() => setShowArchived(v => !v)}
        >
          <Archive size={13} /> {showArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="blk-loading"><Loader2 className="blk-spin" size={18} /> Loading blocks…</div>
      ) : filteredBlocks.length === 0 ? (
        <div className="blk-empty">
          <Layers size={32} color="var(--text-muted)" />
          <p>{blocks.length === 0 ? 'No blocks yet. Create your first section.' : 'No blocks match your filters.'}</p>
        </div>
      ) : (
        <motion.div className="blk-grid" {...stagger(2)}>
          <AnimatePresence>
            {filteredBlocks.map((block, i) => (
              <motion.div
                key={block.id}
                className={`blk-card ${block.is_archived ? 'blk-card--archived' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <div className="blk-card-top">
                  <div className="blk-card-icon"><Layers size={16} color="#9B7ED4" /></div>
                  <div className="blk-card-actions">
                    <button className="blk-icon-btn" title="Edit" onClick={() => openEdit(block)}>
                      <Pencil size={14} />
                    </button>
                    <button
                      className="blk-icon-btn"
                      title={block.is_archived ? 'Unarchive' : 'Archive'}
                      onClick={() => toggleArchive(block)}
                    >
                      {block.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    </button>
                  </div>
                </div>

                <h3 className="blk-card-name">{block.name}</h3>
                {block.description && <p className="blk-card-desc">{block.description}</p>}

                <div className="blk-card-meta">
                  {(block.school_year || block.semester) && (
                    <span className="blk-meta-item">
                      <Calendar size={11} /> {[block.school_year, block.semester].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {block.is_archived && <span className="blk-archived-badge">Archived</span>}
                </div>

                <button className="blk-roster-btn" onClick={() => openRoster(block)}>
                  <Users size={13} /> {block.studentCount} student{block.studentCount === 1 ? '' : 's'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            className="blk-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setFormOpen(false); resetForm() }}
          >
            <motion.div
              className="blk-modal"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="blk-modal-head">
                <h2>{editingBlock ? 'Edit Block' : 'Create Block'}</h2>
                <button className="blk-icon-btn" onClick={() => { setFormOpen(false); resetForm() }}><X size={16} /></button>
              </div>

              <div className="blk-form-group">
                <label>Block Name</label>
                <input
                  className="blk-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. BSIT 3-1"
                  autoFocus
                />
              </div>

              <div className="blk-form-group">
                <label>Description (optional)</label>
                <textarea
                  className="blk-input blk-textarea"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short note about this block…"
                  rows={2}
                />
              </div>

              <div className="blk-form-row">
                <div className="blk-form-group">
                  <label>School Year</label>
                  <input
                    className="blk-input"
                    value={form.school_year}
                    onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))}
                    placeholder="2025-2026"
                  />
                </div>
                <div className="blk-form-group">
                  <label>Semester</label>
                  <select
                    className="blk-input"
                    value={form.semester}
                    onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  >
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {formError && <p className="blk-form-error">{formError}</p>}

              <button className="blk-submit-btn" onClick={saveBlock} disabled={saving}>
                {saving ? 'Saving…' : editingBlock ? 'Save Changes' : 'Create Block'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roster panel */}
      <AnimatePresence>
        {selectedBlock && (
          <motion.div
            className="blk-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedBlock(null)}
          >
            <motion.div
              className="blk-panel"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.22, ease }}
              onClick={e => e.stopPropagation()}
            >
              <div className="blk-panel-head">
                <div>
                  <p className="blk-panel-label">ROSTER</p>
                  <h2>{selectedBlock.name}</h2>
                </div>
                <button className="blk-icon-btn" onClick={() => setSelectedBlock(null)}><X size={16} /></button>
              </div>

              <button className="blk-add-student-btn" onClick={openAddStudent}>
                <UserPlus size={14} /> Add Student
              </button>

              <div className="blk-roster-list">
                {rosterLoading ? (
                  <div className="blk-loading"><Loader2 className="blk-spin" size={16} /> Loading roster…</div>
                ) : roster.length === 0 ? (
                  <div className="blk-empty blk-empty--compact">
                    <GraduationCap size={26} color="var(--text-muted)" />
                    <p>No students in this block yet.</p>
                  </div>
                ) : (
                  roster.map(s => (
                    <div className="blk-roster-row" key={s.enrollment_id}>
                      <div className="blk-roster-avatar">{s.first_name[0]}{s.last_name[0]}</div>
                      <div className="blk-roster-info">
                        <span className="blk-roster-name">{s.first_name} {s.last_name}</span>
                        <span className="blk-roster-sub">{s.school_id} · @{s.username}</span>
                      </div>
                      <button
                        className="blk-remove-btn"
                        title="Remove from block"
                        onClick={() => removeStudent(s.enrollment_id)}
                        disabled={busyStudentId === s.enrollment_id}
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add student modal */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            className="blk-overlay blk-overlay--top"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAddOpen(false)}
          >
            <motion.div
              className="blk-modal blk-modal--wide"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="blk-modal-head">
                <h2>Add Student to {selectedBlock?.name}</h2>
                <button className="blk-icon-btn" onClick={() => setAddOpen(false)}><X size={16} /></button>
              </div>

              <div className="blk-search-wrap">
                <Search size={14} color="var(--text-muted)" className="blk-search-icon" />
                <input
                  className="blk-search"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search by name or school ID…"
                  autoFocus
                />
              </div>

              {addActionError && <p className="blk-form-error">{addActionError}</p>}

              <div className="blk-add-list">
                {studentsLoading ? (
                  <div className="blk-loading"><Loader2 className="blk-spin" size={16} /> Loading students…</div>
                ) : filteredStudentOptions.length === 0 ? (
                  <div className="blk-empty blk-empty--compact">
                    <p>No matching students.</p>
                  </div>
                ) : (
                  filteredStudentOptions.map(s => {
                    const isConfirming = confirmReassign?.id === s.id
                    const isBusy = busyStudentId === s.id
                    return (
                      <div className="blk-add-row" key={s.id}>
                        <div className="blk-roster-avatar">{s.first_name[0]}{s.last_name[0]}</div>
                        <div className="blk-roster-info">
                          <span className="blk-roster-name">{s.first_name} {s.last_name}</span>
                          <span className="blk-roster-sub">{s.school_id} · @{s.username}</span>
                        </div>

                        {isConfirming ? (
                          <div className="blk-confirm-row">
                            <span className="blk-confirm-text">
                              <ArrowRightLeft size={11} /> Move from {s.activeBlockName}?
                            </span>
                            <button className="blk-confirm-yes" onClick={() => performAdd(s)} disabled={isBusy}>
                              {isBusy ? '…' : 'Move'}
                            </button>
                            <button className="blk-confirm-no" onClick={() => setConfirmReassign(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button
                            className="blk-add-btn"
                            onClick={() => handleAddClick(s)}
                            disabled={isBusy}
                          >
                            {s.activeBlockName ? `In: ${s.activeBlockName}` : 'Add'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
