import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import {
  BookOpen, Upload, Trash2, FileText, File,
  RefreshCw, ChevronDown, ChevronUp, Paperclip,
  CheckCircle2, AlertTriangle, Layers, ArrowLeft, Users
} from 'lucide-react'
import './TeacherMaterials.css'

type Material = {
  id: string
  title: string
  file_url: string
  file_type: string
  file_size: number | null
  created_at: string
  block_id: string | null
  module_id: string
}

type ModuleRow = {
  id: string
  title: string
  order_index: number
}

type Target = { id: string | null; name: string } // id null = "All Students"

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] as const },
})

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string) {
  if (type === 'pdf') return <FileText size={15} color="#FF6B8A" />
  if (['ppt', 'pptx'].includes(type)) return <File size={15} color="#FFB830" />
  if (['doc', 'docx'].includes(type)) return <File size={15} color="#6C8EF5" />
  return <Paperclip size={15} color="var(--text-secondary)" />
}

export default function TeacherMaterials() {
  const { user } = useAuth()

  const [modules, setModules] = useState<ModuleRow[]>([])
  const [allMaterials, setAllMaterials] = useState<Material[]>([])
  const [myBlocks, setMyBlocks] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('blocks')
      .select('id, name')
      .eq('teacher_id', user.id)
      .eq('is_archived', false)
      .order('name')
      .then(({ data }) => setMyBlocks(data ?? []))
  }, [user])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data: mods, error: modErr } = await supabase
        .from('modules')
        .select('id, title, order_index')
        .order('order_index')
      if (modErr) throw modErr

      const { data: mats, error: matErr } = await supabase
        .from('materials')
        .select('id, module_id, title, file_url, file_type, file_size, created_at, block_id')
        .order('created_at', { ascending: false })
      if (matErr) throw matErr

      setModules(mods ?? [])
      setAllMaterials(mats ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Block cards (incl. "All Students") ─────────────────────────────────
  const cards = useMemo(() => {
    const allCount = allMaterials.filter(m => !m.block_id).length
    const blockCards = myBlocks.map(b => ({
      id: b.id,
      name: b.name,
      count: allMaterials.filter(m => m.block_id === b.id).length,
    }))
    return [{ id: null as string | null, name: 'All Students', count: allCount }, ...blockCards]
  }, [allMaterials, myBlocks])

  // ── Modules + materials scoped to the selected target ──────────────────
  const scopedModules = useMemo(() => {
    if (!selectedTarget) return []
    return modules.map(m => ({
      ...m,
      materials: allMaterials.filter(mat => mat.module_id === m.id && mat.block_id === selectedTarget.id),
    }))
  }, [modules, allMaterials, selectedTarget])

  const openTarget = (t: Target) => {
    setSelectedTarget(t)
    setExpanded({})
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleUpload = async (moduleId: string, files: FileList | null) => {
    if (!files || !files.length || !user || !selectedTarget) return
    setUploading(moduleId)
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'file'
        const path = `${moduleId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

        const { error: upErr } = await supabase.storage
          .from('materials')
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr

        const { data: urlData } = supabase.storage.from('materials').getPublicUrl(path)

        const { error: dbErr } = await supabase.from('materials').insert({
          module_id: moduleId,
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url: urlData.publicUrl,
          file_type: ext,
          file_size: file.size,
          uploaded_by: user.id,
          block_id: selectedTarget.id,
        })
        if (dbErr) throw dbErr
      }
      showToast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
      await fetchAll()
      setExpanded(prev => ({ ...prev, [moduleId]: true }))
    } catch (err: any) {
      showToast(err.message ?? 'Upload failed', false)
    } finally {
      setUploading(null)
      if (fileInputRefs.current[moduleId]) fileInputRefs.current[moduleId]!.value = ''
    }
  }

  const handleDelete = async (mat: Material) => {
    setDeleting(mat.id)
    try {
      const url = new URL(mat.file_url)
      const storagePath = url.pathname.split('/materials/')[1]
      if (storagePath) {
        await supabase.storage.from('materials').remove([storagePath])
      }
      const { error } = await supabase.from('materials').delete().eq('id', mat.id)
      if (error) throw error
      setAllMaterials(prev => prev.filter(m => m.id !== mat.id))
      showToast('File deleted')
    } catch (err: any) {
      showToast(err.message ?? 'Delete failed', false)
    } finally {
      setDeleting(null)
    }
  }

  const totalMaterials = allMaterials.length

  return (
    <div className="tm-root">
      {/* Header */}
      <motion.div className="tm-header" {...stagger(0)}>
        <div>
          <p className="tm-label">TEACHER PANEL</p>
          <h1 className="tm-title">Materials</h1>
          <p className="tm-sub">
            {selectedTarget
              ? 'Upload files per module for this block'
              : 'Pick a block to manage its materials'}
          </p>
        </div>
        <div className="tm-header-stat">
          <span className="tm-header-stat-val">{totalMaterials}</span>
          <span className="tm-header-stat-lbl">Total Files</span>
        </div>
      </motion.div>

      {!selectedTarget ? (
        // ── Block picker ────────────────────────────────────────────────
        loading ? (
          <div className="tm-loading">
            <span className="tm-spinner" />
            <p>Loading blocks…</p>
          </div>
        ) : (
          <motion.div className="tm-block-grid" {...stagger(1)}>
            {cards.map((card, i) => (
              <motion.button
                key={card.id ?? '__all__'}
                className={`tm-block-card ${card.id === null ? 'tm-block-card--all' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                onClick={() => openTarget(card)}
              >
                <div className="tm-block-card-icon">
                  {card.id === null ? <Users size={16} color="#00D4AA" /> : <Layers size={16} color="#6C8EF5" />}
                </div>
                <h3 className="tm-block-card-name">{card.name}</h3>
                <span className="tm-block-card-count">
                  <Paperclip size={11} /> {card.count} file{card.count === 1 ? '' : 's'}
                </span>
              </motion.button>
            ))}
            {myBlocks.length === 0 && (
              <p className="tm-no-blocks-hint">
                You have no blocks yet. You can still upload materials for All Students, or create a block first from the Blocks page.
              </p>
            )}
          </motion.div>
        )
      ) : (
        // ── Module list for the selected target ────────────────────────
        <>
          <motion.div className="tm-target-header" {...stagger(1)}>
            <button className="tm-back-btn" onClick={() => setSelectedTarget(null)}>
              <ArrowLeft size={14} /> All Blocks
            </button>
            <span className="tm-target-name">
              <Layers size={13} /> {selectedTarget.name}
            </span>
          </motion.div>

          {loading ? (
            <div className="tm-loading">
              <span className="tm-spinner" />
              <p>Loading modules…</p>
            </div>
          ) : (
            <div className="tm-list">
              {scopedModules.map((mod, i) => (
                <motion.div key={mod.id} className="tm-card" {...stagger(i + 2)}>
                  <div className="tm-card-header" onClick={() => toggleExpand(mod.id)}>
                    <div className="tm-card-left">
                      <div className="tm-mod-badge">M{mod.order_index}</div>
                      <div>
                        <p className="tm-mod-title">{mod.title}</p>
                        <p className="tm-mod-count">
                          {mod.materials.length} file{mod.materials.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="tm-card-right">
                      <motion.button
                        className="tm-upload-btn"
                        whileTap={{ scale: 0.96 }}
                        onClick={e => { e.stopPropagation(); fileInputRefs.current[mod.id]?.click() }}
                        disabled={uploading === mod.id}
                      >
                        {uploading === mod.id
                          ? <RefreshCw size={13} className="tm-spin" />
                          : <><Upload size={13} /> Upload</>}
                      </motion.button>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                        style={{ display: 'none' }}
                        ref={el => { fileInputRefs.current[mod.id] = el }}
                        onChange={e => handleUpload(mod.id, e.target.files)}
                      />
                      <button className="tm-expand-btn">
                        {expanded[mod.id] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded[mod.id] && (
                      <motion.div
                        className="tm-files"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="tm-files-inner">
                          {mod.materials.length === 0 ? (
                            <div className="tm-empty">
                              <Paperclip size={20} color="var(--text-muted)" />
                              <p>No files yet — click Upload to add materials</p>
                            </div>
                          ) : (
                            mod.materials.map(mat => (
                              <motion.div
                                key={mat.id}
                                className="tm-file-row"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                              >
                                <div className="tm-file-icon">{fileIcon(mat.file_type)}</div>
                                <div className="tm-file-info">
                                  <p className="tm-file-title">{mat.title}</p>
                                  <p className="tm-file-meta">
                                    {mat.file_type.toUpperCase()}
                                    {mat.file_size ? ` · ${fmtSize(mat.file_size)}` : ''}
                                    {' · '}{new Date(mat.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                </div>
                                <div className="tm-file-actions">
                                  <a
                                    href={mat.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tm-file-view"
                                    title="View/Download"
                                  >
                                    <BookOpen size={13} />
                                  </a>
                                  <button
                                    className="tm-file-delete"
                                    onClick={() => handleDelete(mat)}
                                    disabled={deleting === mat.id}
                                    title="Delete"
                                  >
                                    {deleting === mat.id
                                      ? <RefreshCw size={12} className="tm-spin" />
                                      : <Trash2 size={13} />}
                                  </button>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`tm-toast ${toast.ok ? 'ok' : 'err'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
