import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Snackbar, Alert } from '@mui/material'
import Header from '../components/Header/Header'
import AuthDialog from '../components/Header/AuthDialog'
import FavoritesPage from './FavoritesPage'
import { Store } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'

interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

const FavoritesPageContainer: React.FC = () => {
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
    isLoading: authLoading
  } = useAuth()

  // 使用收藏 Hook
  const {
    favorites,
    loading: favoritesLoading,
    error: favoritesError,
    fetchFavorites,
    toggleFavorite: toggleFavoriteAPI,
    isFavorite
  } = useFavorites(isAuthenticated)

  // 如果未登入，重導向到首頁
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleToggleFavorite = async (storeId: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }
    
    try {
      const isFavorited = isFavorite(storeId)
      await toggleFavoriteAPI(storeId, isFavorited)
      
      const action = isFavorited ? '取消收藏' : '收藏'
      setSnackbar({
        open: true,
        message: `已${action}商店`,
        severity: 'success'
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '操作失敗',
        severity: 'error'
      })
    }
  }

  const handleViewOnMap = (store: Store) => {
    // 跳回首頁並定位該店 marker
    navigate('/', { 
      state: { 
        focusStore: store,
        showHoverCard: true 
      } 
    })
  }

  const handleExploreMap = () => {
    // 跳回首頁
    navigate('/')
  }

  const handleLogin = async (emailOrUsername: string, password: string) => {
    try {
      const success = await login(emailOrUsername, password)
      if (success) {
        setShowAuthDialog(false)
        setSnackbar({
          open: true,
          message: '登入成功！',
          severity: 'success'
        })
        return true
      }
      return false
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '登入失敗，請檢查帳號密碼',
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

  const handleLogout = async () => {
    try {
      await logout()
      setSnackbar({
        open: true,
        message: '已登出',
        severity: 'info'
      })
      navigate('/')
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '登出失敗',
        severity: 'error'
      })
    }
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

      <FavoritesPage
        stores={favorites}
        favorites={favorites.map(store => store.id)}
        onToggleFavorite={handleToggleFavorite}
        onViewOnMap={handleViewOnMap}
        onExploreMap={handleExploreMap}
        isLoading={favoritesLoading}
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

export default FavoritesPageContainer
