import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, X } from 'lucide-react'
import './LogoutModal.css'

interface LogoutModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function LogoutModal({ isOpen, onConfirm, onCancel }: LogoutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="logout-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="logout-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm logout"
          >
            <button
              type="button"
              className="logout-modal-close"
              onClick={onCancel}
              aria-label="Cancel"
            >
              <X size={18} />
            </button>

            <div className="logout-modal-icon">
              <LogOut size={26} strokeWidth={1.8} />
            </div>

            <h3 className="logout-modal-title">Log out of Exentra?</h3>
            <p className="logout-modal-desc">
              You'll need to sign back in with your credentials to access your dashboard.
            </p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-btn logout-modal-btn-cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="logout-modal-btn logout-modal-btn-confirm"
                onClick={onConfirm}
              >
                <LogOut size={15} strokeWidth={2} />
                Logout
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
