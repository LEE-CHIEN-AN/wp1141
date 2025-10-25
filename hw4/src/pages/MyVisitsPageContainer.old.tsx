import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Snackbar, Alert } from '@mui/material'
import Header from '../components/Header/Header'
import AuthDialog from '../components/Header/AuthDialog'
import MyVisitsPage from './MyVisitsPage'
import EditVisitDialog from '../components/VisitRecord/EditVisitDialog'
import { Store, VisitRecord } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'
import { visitsAPI } from '../services/api'

interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

const MyVisitsPageContainer: React.FC = () => {
  const navigate = useNavigate()
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([])
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<VisitRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  // 載入造訪紀錄
  const loadVisitRecords = async () => {
    if (!isAuthenticated) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await visitsAPI.getMyVisits(1, 100) // 載入前100筆
      setVisitRecords(data.items || [])
    } catch (err: any) {
      setError(err.message || '載入造訪紀錄失敗')
    } finally {
      setLoading(false)
    }
  }

  // 如果未登入，重導向到首頁
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, authLoading, navigate])

  // 載入造訪紀錄
  useEffect(() => {
    if (isAuthenticated) {
      loadVisitRecords()
    }
  }, [isAuthenticated])

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

  const handleEditVisit = async (record: VisitRecord) => {
    setEditingRecord(record)
    setShowEditDialog(true)
  }

  const handleSaveEdit = async (visitId: string, data: {
    date: string
    rating: number
    note?: string
    photoIds?: string[]
  }) => {
    try {
      await visitsAPI.updateVisit(visitId, data)
      await loadVisitRecords() // 重新載入造訪紀錄
      setSnackbar({
        open: true,
        message: '造訪紀錄已更新',
        severity: 'success'
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '更新造訪紀錄失敗',
        severity: 'error'
      })
    }
  }

  const handleDeleteVisit = async (record: VisitRecord) => {
    if (!window.confirm('確定要刪除這筆造訪紀錄嗎？')) {
      return
    }

    try {
      await visitsAPI.deleteVisit(record.id)
      
      // 重新載入造訪紀錄
      await loadVisitRecords()
      
      setSnackbar({
        open: true,
        message: '造訪紀錄已刪除',
        severity: 'success'
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '刪除造訪紀錄失敗',
        severity: 'error'
      })
    }
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

      <MyVisitsPage
        visitRecords={visitRecords}
        onToggleFavorite={handleToggleFavorite}
        onViewOnMap={handleViewOnMap}
        onExploreMap={handleExploreMap}
        onEditVisit={handleEditVisit}
        onDeleteVisit={handleDeleteVisit}
        isLoading={loading}
        error={error}
      />

      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <EditVisitDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false)
          setEditingRecord(null)
        }}
        onSave={handleSaveEdit}
        visitRecord={editingRecord}
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

export default MyVisitsPageContainer