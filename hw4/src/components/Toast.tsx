/**
 * 統一的 Toast 通知組件
 * 提供一致的用戶通知體驗
 */

import React from 'react'
import { Snackbar, Alert } from '@mui/material'

interface ToastProps {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  autoHideDuration?: number
  anchorOrigin?: {
    vertical: 'top' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
}

export const Toast: React.FC<ToastProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 6000,
  anchorOrigin = { vertical: 'top', horizontal: 'center' }
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      sx={{ mt: 2 }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity}
        sx={{ width: '100%' }}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

/**
 * Toast 提供者組件
 * 用於在應用層級提供 Toast 功能
 */
interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Array<{
    id: string
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
    open: boolean
  }>>([])

  const showToast = React.useCallback((
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, severity, open: true }])
  }, [])

  const hideToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // 提供全局的 showToast 函數
  React.useEffect(() => {
    (window as any).showToast = showToast
    return () => {
      delete (window as any).showToast
    }
  }, [showToast])

  return (
    <>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          open={toast.open}
          message={toast.message}
          severity={toast.severity}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  )
}

/**
 * 使用 Toast 的 Hook
 */
export const useToast = () => {
  const showToast = React.useCallback((
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    if ((window as any).showToast) {
      (window as any).showToast(message, severity)
    } else {
      console.warn('Toast not available. Make sure ToastProvider is mounted.')
    }
  }, [])

  return {
    showSuccess: (message: string) => showToast(message, 'success'),
    showError: (message: string) => showToast(message, 'error'),
    showInfo: (message: string) => showToast(message, 'info'),
    showWarning: (message: string) => showToast(message, 'warning'),
    showToast
  }
}
