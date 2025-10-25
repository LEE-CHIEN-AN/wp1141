import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Snackbar, Alert } from '@mui/material'
import Header from '../components/Header/Header'
import AuthDialog from '../components/Header/AuthDialog'
import UserProfilePage from './UserProfilePage'
import { User } from '../types'
import { useAuth } from '../hooks/useAuth'

interface RegisterData {
  name: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

const UserProfilePageContainer: React.FC = () => {
  const navigate = useNavigate()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  })

  // 使用認證 Hook
  const {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    isLoading: authLoading,
    updateUser
  } = useAuth()

  // 如果未登入，重導向到首頁
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  // 更新個人資料
  const handleUpdateProfile = (updatedData: Partial<User>) => {
    if (!user) return

    const updatedUser = {
      ...user,
      ...updatedData
    }

    updateUser(updatedUser)
    
    setSnackbar({
      open: true,
      message: '個人資料已更新！',
      severity: 'success'
    })
  }

  const handleLogin = async (email: string, password: string) => {
    const success = await login(email, password)
    if (success) {
      setShowAuthDialog(false)
      setSnackbar({
        open: true,
        message: '登入成功！',
        severity: 'success'
      })
      return true
    } else {
      setSnackbar({
        open: true,
        message: '登入失敗，請檢查帳號密碼',
        severity: 'error'
      })
      return false
    }
  }

  const handleRegister = async (data: RegisterData) => {
    try {
      const success = await register(data)
      if (success) {
        setShowAuthDialog(false)
        setSnackbar({
          open: true,
          message: '註冊成功！已自動登入',
          severity: 'success'
        })
        return true
      }
      return false
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '註冊失敗，請稍後再試',
        severity: 'error'
      })
      return false
    }
  }

  const handleLogout = () => {
    logout()
    setSnackbar({
      open: true,
      message: '已登出',
      severity: 'info'
    })
    navigate('/')
  }

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  // 如果正在載入認證狀態，顯示載入中
  if (authLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>載入中...</div>
      </Box>
    )
  }

  // 如果未登入，不顯示內容（會被重導向）
  if (!isAuthenticated) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        searchQuery=""
        onSearchChange={() => {}}
        onSearchSubmit={() => {}}
        isSearching={false}
        onAddStore={() => navigate('/')}
        user={user}
        onLogin={() => setShowAuthDialog(true)}
        onLogout={handleLogout}
      />

      <UserProfilePage
        user={user}
        onUpdateProfile={handleUpdateProfile}
        isLoading={false}
      />

      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default UserProfilePageContainer
