import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, Check } from 'lucide-react'
import { ToastContext } from './contexts'
import { EASE_OUT } from '../lib/motion'

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const notify = useCallback((message, type = 'info') => setToast({ id: Date.now(), message, type }), [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className="flex items-center gap-2 rounded-full bg-ink py-2.5 pr-5 pl-3 text-sm text-paper shadow-xl shadow-ink/15"
            >
              {toast.type === 'error' ? (
                <CircleAlert className="size-4 text-accent" />
              ) : (
                <Check className="size-4 text-accent" />
              )}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
