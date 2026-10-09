import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ConfirmModal.css'

interface ConfirmModalProps {
  isOpen: boolean
  icon: ReactNode
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen, icon, title, description, confirmLabel, cancelLabel = 'Cancel', onConfirm, onCancel,
}: ConfirmModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <button
              type="button"
              className="confirm-modal-close"
              onClick={onCancel}
              aria-label="Cancel"
            >
              <X size={18} />
            </button>

            <div className="confirm-modal-icon">{icon}</div>

            <h3 className="confirm-modal-title">{title}</h3>
            <p className="confirm-modal-desc">{description}</p>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-modal-btn confirm-modal-btn-cancel"
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="confirm-modal-btn confirm-modal-btn-confirm"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
