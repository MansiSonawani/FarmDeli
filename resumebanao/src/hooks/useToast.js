import { useContext } from 'react'
import { ToastContext } from '../context/contexts'

// Returns notify(message, type?) where type is 'info' | 'error'.
export function useToast() {
  return useContext(ToastContext)
}
