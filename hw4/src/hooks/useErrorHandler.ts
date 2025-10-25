/**
 * 統一的錯誤處理 Hook
 * 提供一致的錯誤處理和通知機制
 */

import { useState, useCallback } from 'react'

interface SnackbarState {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
}

export const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'error'
  })

  const handleError = useCallback((error: any) => {
    const message = error?.message || error?.toString() || '發生未知錯誤'
    console.error('Error handled:', error)
    
    setError(message)
    setSnackbar({
      open: true,
      message,
      severity: 'error'
    })
  }, [])

  const handleSuccess = useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'success'
    })
  }, [])

  const handleInfo = useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'info'
    })
  }, [])

  const handleWarning = useCallback((message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'warning'
    })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setSnackbar(prev => ({ ...prev, open: false }))
  }, [])

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }, [])

  return {
    error,
    snackbar,
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
    clearError,
    closeSnackbar
  }
}

/**
 * 統一的 API 錯誤處理
 */
export const useApiErrorHandler = () => {
  const { handleError, handleSuccess } = useErrorHandler()

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      const result = await apiCall()
      
      if (successMessage) {
        handleSuccess(successMessage)
      }
      
      return result
    } catch (error: any) {
      handleError(error)
      return null
    }
  }, [handleError, handleSuccess])

  return {
    handleApiCall,
    handleError,
    handleSuccess
  }
}
