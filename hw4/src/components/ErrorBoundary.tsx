/**
 * 錯誤邊界組件
 * 捕獲子組件的錯誤，防止整個應用崩潰
 */

import React, { Component, ReactNode } from 'react'
import { Box, Alert, Button, Typography } from '@mui/material'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 調用外部錯誤處理函數
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // 如果有自定義的 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默認的錯誤 UI
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '50vh',
          p: 4,
          gap: 2
        }}>
          <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              發生錯誤
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {this.state.error?.message || '未知錯誤'}
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={this.handleRetry}
              sx={{ mt: 1 }}
            >
              重新載入
            </Button>
          </Alert>
          
          {import.meta.env.DEV && this.state.errorInfo && (
            <Box sx={{ 
              width: '100%', 
              maxWidth: 600,
              mt: 2,
              p: 2,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
              overflow: 'auto'
            }}>
              <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                {this.state.error?.stack}
              </Typography>
            </Box>
          )}
        </Box>
      )
    }

    return this.props.children
  }
}

/**
 * 簡化版的錯誤邊界 Hook
 * 用於函數組件中的錯誤處理
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}
