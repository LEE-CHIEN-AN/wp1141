/**
 * 統一的組件基礎架構
 * 提供一致的組件模式和介面
 */

import React, { ReactNode, ComponentType } from 'react'
import { Box, CircularProgress, Alert } from '@mui/material'

// 基礎組件 Props 介面
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  testId?: string
}

// 載入狀態組件
export interface LoadingProps extends BaseComponentProps {
  loading?: boolean
  size?: number
  message?: string
}

export const Loading: React.FC<LoadingProps> = ({ 
  loading = true, 
  size = 40, 
  message = '載入中...',
  children 
}) => {
  if (!loading) return <>{children}</>

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2,
        gap: 2
      }}
      data-testid="loading-component"
    >
      <CircularProgress size={size} />
      {message && (
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {message}
        </Box>
      )}
    </Box>
  )
}

// 錯誤狀態組件
export interface ErrorProps extends BaseComponentProps {
  error?: string | null
  onRetry?: () => void
  retryText?: string
}

export const ErrorState: React.FC<ErrorProps> = ({ 
  error, 
  onRetry, 
  retryText = '重試',
  children 
}) => {
  if (!error) return <>{children}</>

  return (
    <Alert 
      severity="error" 
      action={onRetry && (
        <Box 
          component="button"
          onClick={onRetry}
          sx={{ 
            background: 'none', 
            border: 'none', 
            color: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          {retryText}
        </Box>
      )}
      data-testid="error-component"
    >
      {error}
    </Alert>
  )
}

// 空狀態組件
export interface EmptyStateProps extends BaseComponentProps {
  isEmpty?: boolean
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  isEmpty = true,
  icon = '📭',
  title = '暫無資料',
  description,
  action,
  children 
}) => {
  if (!isEmpty) return <>{children}</>

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
        gap: 2,
        textAlign: 'center'
      }}
      data-testid="empty-state-component"
    >
      <Box sx={{ fontSize: '3rem' }}>{icon}</Box>
      <Box sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{title}</Box>
      {description && (
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {description}
        </Box>
      )}
      {action && <Box>{action}</Box>}
    </Box>
  )
}

// 容器組件基礎介面
export interface ContainerProps extends BaseComponentProps {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  isEmpty?: boolean
  emptyState?: {
    icon?: ReactNode
    title?: string
    description?: string
    action?: ReactNode
  }
}

// 高階組件：為組件添加載入、錯誤、空狀態處理
export function withStateHandling<P extends object>(
  Component: ComponentType<P>
) {
  return function StateHandledComponent(props: P & ContainerProps) {
    const { 
      loading, 
      error, 
      onRetry, 
      isEmpty, 
      emptyState,
      ...componentProps 
    } = props

    return (
      <Loading loading={loading}>
        <ErrorState error={error} onRetry={onRetry}>
          <EmptyState 
            isEmpty={isEmpty}
            icon={emptyState?.icon}
            title={emptyState?.title}
            description={emptyState?.description}
            action={emptyState?.action}
          >
            <Component {...(componentProps as P)} />
          </EmptyState>
        </ErrorState>
      </Loading>
    )
  }
}

// 頁面容器組件
export interface PageContainerProps extends ContainerProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  actions,
  maxWidth = 'lg',
  children,
  ...stateProps
}) => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#FAF5EF' }}>
      {/* 頁面標題區域 */}
      {(title || subtitle || actions) && (
        <Box sx={{ 
          p: 3, 
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Box sx={{ 
            maxWidth: maxWidth === false ? 'none' : `${maxWidth}`,
            mx: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box>
              {title && (
                <Box sx={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: '#2F6F4E',
                  fontFamily: '"Noto Sans TC", sans-serif'
                }}>
                  {title}
                </Box>
              )}
              {subtitle && (
                <Box sx={{ 
                  fontSize: '0.875rem', 
                  color: 'text.secondary',
                  mt: 0.5
                }}>
                  {subtitle}
                </Box>
              )}
            </Box>
            {actions && <Box>{actions}</Box>}
          </Box>
        </Box>
      )}

      {/* 頁面內容區域 */}
      <Box sx={{ p: 3 }}>
        <Box sx={{ 
          maxWidth: maxWidth === false ? 'none' : `${maxWidth}`,
          mx: 'auto'
        }}>
          <Loading loading={stateProps.loading}>
            <ErrorState error={stateProps.error} onRetry={stateProps.onRetry}>
              <EmptyState 
                isEmpty={stateProps.isEmpty}
                icon={stateProps.emptyState?.icon}
                title={stateProps.emptyState?.title}
                description={stateProps.emptyState?.description}
                action={stateProps.emptyState?.action}
              >
                {children}
              </EmptyState>
            </ErrorState>
          </Loading>
        </Box>
      </Box>
    </Box>
  )
}

// 卡片組件基礎介面
export interface CardProps extends BaseComponentProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  variant?: 'elevation' | 'outlined'
  padding?: number
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  variant = 'elevation',
  padding = 2,
  children,
  className,
  testId
}) => {
  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: variant === 'elevation' ? 1 : 'none',
        border: variant === 'outlined' ? '1px solid #e0e0e0' : 'none',
        overflow: 'hidden'
      }}
      className={className}
      data-testid={testId}
    >
      {/* 卡片標題區域 */}
      {(title || subtitle || actions) && (
        <Box sx={{ 
          p: padding,
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box>
            {title && (
              <Box sx={{ 
                fontSize: '1.125rem', 
                fontWeight: 'bold',
                color: '#2F6F4E',
                fontFamily: '"Noto Sans TC", sans-serif'
              }}>
                {title}
              </Box>
            )}
            {subtitle && (
              <Box sx={{ 
                fontSize: '0.875rem', 
                color: 'text.secondary',
                mt: 0.5
              }}>
                {subtitle}
              </Box>
            )}
          </Box>
          {actions && <Box>{actions}</Box>}
        </Box>
      )}

      {/* 卡片內容區域 */}
      <Box sx={{ p: padding }}>
        {children}
      </Box>
    </Box>
  )
}

// 列表組件基礎介面
export interface ListProps extends BaseComponentProps {
  items: any[]
  renderItem: (item: any, index: number) => ReactNode
  keyExtractor?: (item: any, index: number) => string
  emptyMessage?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export const List: React.FC<ListProps> = ({
  items,
  renderItem,
  keyExtractor = (_, index) => index.toString(),
  emptyMessage = '暫無資料',
  loading,
  error,
  onRetry,
  testId
}) => {
  return (
    <Box data-testid={testId}>
      <Loading loading={loading}>
        <ErrorState error={error} onRetry={onRetry}>
          <EmptyState isEmpty={items.length === 0} title={emptyMessage}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {items.map((item, index) => (
                <Box key={keyExtractor(item, index)}>
                  {renderItem(item, index)}
                </Box>
              ))}
            </Box>
          </EmptyState>
        </ErrorState>
      </Loading>
    </Box>
  )
}

// 表單組件基礎介面
export interface FormProps extends BaseComponentProps {
  onSubmit?: (data: any) => void
  onReset?: () => void
  loading?: boolean
  error?: string | null
  submitText?: string
  resetText?: string
  showReset?: boolean
}

export const Form: React.FC<FormProps> = ({
  onSubmit,
  onReset,
  loading = false,
  error,
  submitText = '提交',
  resetText = '重置',
  showReset = true,
  children,
  testId
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit && !loading) {
      const formData = new FormData(e.target as HTMLFormElement)
      const data = Object.fromEntries(formData.entries())
      onSubmit(data)
    }
  }

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit}
      data-testid={testId}
    >
      <ErrorState error={error}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {children}
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'flex-end',
            pt: 2,
            borderTop: '1px solid #f0f0f0'
          }}>
            {showReset && (
              <Box
                component="button"
                type="button"
                onClick={onReset}
                disabled={loading}
                sx={{
                  px: 3,
                  py: 1,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  backgroundColor: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {resetText}
              </Box>
            )}
            <Box
              component="button"
              type="submit"
              disabled={loading}
              sx={{
                px: 3,
                py: 1,
                border: 'none',
                borderRadius: 1,
                backgroundColor: '#2F6F4E',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '處理中...' : submitText}
            </Box>
          </Box>
        </Box>
      </ErrorState>
    </Box>
  )
}
