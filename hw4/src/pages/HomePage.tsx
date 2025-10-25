import React, { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Box, Snackbar, Alert, Typography, Button } from '@mui/material'
import GoogleMap from '../components/Map/GoogleMap'
import AddStoreDialog from '../components/StoreForm/AddStoreDialog'
import AddStoreMethodSelector from '../components/StoreForm/AddStoreMethodSelector'
import PlaceSearchDialog from '../components/StoreForm/PlaceSearchDialog'
import StoreDetailDialog from '../components/StoreCard/StoreDetailDialog'
import Header from '../components/Header/Header'
import AuthDialog from '../components/Header/AuthDialog'
import { Store, VisitRecord } from '../types'
import { useSearch } from '../hooks/useSearch'
import { useAuth } from '../hooks/useAuth'
import { useStores } from '../hooks/useStores'
import { useFavorites } from '../hooks/useFavorites'
import { visitsAPI } from '../services/api'
import { initGoogleMapsWarningSuppression } from '../utils/googleMapsWarningSuppression'

interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

// 載入 Google Maps API
const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 檢查是否已經載入
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps API 已載入')
      resolve()
      return
    }

    // 檢查是否已經有載入中的腳本
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log('Google Maps API 腳本已存在，等待載入完成')
      // 如果腳本已存在，等待載入完成
      const checkLoaded = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('Google Maps API 載入完成')
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
      return
    }

    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY
    console.log('Google Maps API Key:', apiKey ? '已設定' : '未設定')
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.error('Google Maps API Key is not configured')
      reject(new Error('Google Maps API Key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in .env file'))
      return
    }

    console.log('開始載入 Google Maps API...')
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.log('Google Maps API 腳本載入完成')
      // 等待 API 完全初始化
      const checkAPI = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('Google Maps API 和 Places 庫已準備就緒')
          resolve()
        } else {
          console.log('等待 Google Maps API 初始化...')
          setTimeout(checkAPI, 100)
        }
      }
      checkAPI()
    }
    
    script.onerror = (error) => {
      console.error('Google Maps API 載入失敗:', error)
      reject(new Error('Failed to load Google Maps API'))
    }
    
    document.head.appendChild(script)
  })
}

const HomePage: React.FC = () => {
  const location = useLocation()
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [showAddStoreDialog, setShowAddStoreDialog] = useState(false)
  const [showAddStoreMethodSelector, setShowAddStoreMethodSelector] = useState(false)
  const [showPlaceSearchDialog, setShowPlaceSearchDialog] = useState(false)
  const [addStoreCoordinates, setAddStoreCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [focusStore, setFocusStore] = useState<Store | null>(null)
  const [userVisitRecords, setUserVisitRecords] = useState<VisitRecord[]>([])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  })

  // 初始化 Google Maps 警告抑制
  useEffect(() => {
    const cleanup = initGoogleMapsWarningSuppression()
    return cleanup
  }, [])

  // 使用認證 Hook
  const {
    user,
    isAuthenticated,
    login,
    register,
    logout
  } = useAuth()

  // 使用收藏 Hook
  const {
    favorites,
    toggleFavorite: toggleFavoriteAPI,
    isFavorite
  } = useFavorites(isAuthenticated)

  // 使用 useMemo 來避免 favorites.map 每次都創建新陣列
  const userFavorites = useMemo(() => 
    favorites.map(store => store.id), 
    [favorites]
  )

  // 使用商店 Hook
  const {
    stores,
    fetchStores,
    createStore,
    toggleFavorite: toggleStoreFavorite
  } = useStores(userFavorites)

  // 使用搜尋 Hook
  const {
    searchQuery,
    setSearchQuery,
    filteredStores,
    isSearching,
    handleSearch
  } = useSearch(stores) // 現在使用動態的 stores

  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => {
        setIsGoogleMapsLoaded(true)
        setGoogleMapsError(null)
      })
      .catch((error) => {
        console.error('Error loading Google Maps API:', error)
        setGoogleMapsError(error.message)
      })
  }, [])

  // 載入商店資料
  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // 處理從收藏頁面跳轉回來時的定位
  useEffect(() => {
    if (location.state?.focusStore) {
      setFocusStore(location.state.focusStore)
      // 清除 state 避免重複處理
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // 載入用戶造訪紀錄
  const loadUserVisitRecords = async () => {
    if (!isAuthenticated) return
    
    try {
      const data = await visitsAPI.getMyVisits(1, 100)
      setUserVisitRecords(data.items || [])
    } catch (err: any) {
      console.error('載入用戶造訪紀錄失敗:', err)
    }
  }

  // 當用戶登入時載入造訪紀錄
  useEffect(() => {
    if (isAuthenticated) {
      loadUserVisitRecords()
    } else {
      setUserVisitRecords([])
    }
  }, [isAuthenticated])

  // 同步 stores 的收藏狀態與用戶收藏狀態
  useEffect(() => {
    if (isAuthenticated && user) {
      // 登入時同步收藏狀態
      // 這裡不需要手動更新 stores，因為 useStores hook 會處理
    }
  }, [isAuthenticated, user])

  const handleAddStore = (coordinates: { lat: number; lng: number }) => {
    setAddStoreCoordinates(coordinates)
    setShowAddStoreDialog(true)
  }

  const handleAddVisitRecord = async (storeId: string, record: Omit<VisitRecord, 'id'>) => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: '請先登入才能新增造訪紀錄',
        severity: 'warning'
      })
      return
    }

    try {
      await visitsAPI.createVisit(storeId, {
        date: record.date,
        rating: record.rating,
        note: record.note,
        photoIds: record.photos?.map(photo => photo.id) || []
      })
      
      // 重新載入商店資料以更新平均評分和造訪次數
      await fetchStores()
      
      // 重新載入用戶造訪紀錄
      await loadUserVisitRecords()
      
      setSnackbar({
        open: true,
        message: '造訪紀錄已新增！',
        severity: 'success'
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '新增造訪紀錄失敗',
        severity: 'error'
      })
    }
  }

  const handleStoreUpdated = async (_updatedStore: Store) => {
    // 重新載入商店資料以獲取最新的資料
    await fetchStores()
    
    setSnackbar({
      open: true,
      message: '店家資料已更新',
      severity: 'success'
    })
  }

  const handleAddStoreSubmit = async (storeData: Omit<Store, 'id' | 'avgRating' | 'visitCount' | 'isFavorite' | 'createdAt' | 'updatedAt'> & { tagNames?: string[] }) => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: '請先登入才能新增店家',
        severity: 'warning'
      })
      return
    }

    try {
      await createStore({
        name: storeData.name,
        lat: storeData.lat,
        lng: storeData.lng,
        address: storeData.address,
        openingHours: storeData.openingHours,
        tagNames: storeData.tagNames || [],
        mainPhotoId: storeData.mainPhotoId,
        googleMapUrl: storeData.googleMapUrl,
        instagramUrl: storeData.instagramUrl
      })
      
      setShowAddStoreDialog(false)
      setAddStoreCoordinates(null)
      setSnackbar({
        open: true,
        message: '店家已新增！',
        severity: 'success'
      })
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '新增店家失敗',
        severity: 'error'
      })
    }
  }

  const handleToggleFavorite = async (storeId: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

    try {
      const isFavorited = isFavorite(storeId)
      await toggleFavoriteAPI(storeId, isFavorited)
      
      // 使用 useStores 的 toggleFavorite 來更新 stores 狀態
      await toggleStoreFavorite(storeId, isFavorited)
      
      const store = stores.find(s => s.id === storeId)
      const action = isFavorited ? '取消收藏' : '收藏'
      setSnackbar({
        open: true,
        message: `已${action} ${store?.name || '商店'}`,
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
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || '登出失敗',
        severity: 'error'
      })
    }
  }

  const handleAddStoreClick = () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }
    setShowAddStoreMethodSelector(true)
  }

  // 處理地圖點選新增
  const handleMapClickAdd = () => {
    setShowAddStoreMethodSelector(false)
    setSnackbar({
      open: true,
      message: '請在地圖上點擊位置來新增店家',
      severity: 'info'
    })
  }

  // 處理搜尋新增
  const handleSearchAdd = () => {
    setShowAddStoreMethodSelector(false)
    setShowPlaceSearchDialog(true)
  }

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  if (googleMapsError) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h5" color="error" gutterBottom>
          Google Maps 載入失敗
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {googleMapsError}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          重新載入
        </Button>
      </Box>
    )
  }

  if (!isGoogleMapsLoaded) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        textAlign: 'center'
      }}>
        <Typography variant="h5" gutterBottom>
          載入 Google Maps 中...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          請稍候片刻
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        isSearching={isSearching}
        onAddStore={handleAddStoreClick}
        user={user}
        onLogin={() => setShowAuthDialog(true)}
        onLogout={handleLogout}
      />

      <GoogleMap
        stores={filteredStores}
        onAddStore={handleAddStore}
        onToggleFavorite={handleToggleFavorite}
        onAddVisitRecord={handleAddVisitRecord}
        onStoreUpdated={handleStoreUpdated}
        isAuthenticated={isAuthenticated}
        currentUser={user}
        onShowLoginDialog={() => setShowAuthDialog(true)}
        focusStore={focusStore}
        onFocusStoreClear={() => setFocusStore(null)}
        userVisitRecords={userVisitRecords}
      />

      <AddStoreDialog
        open={showAddStoreDialog}
        onClose={() => setShowAddStoreDialog(false)}
        onAddStore={handleAddStoreSubmit}
        coordinates={addStoreCoordinates}
      />

      <StoreDetailDialog
        open={!!selectedStore}
        onClose={() => setSelectedStore(null)}
        store={selectedStore}
        isAuthenticated={isAuthenticated}
        currentUser={user}
        onToggleFavorite={handleToggleFavorite}
        onAddVisitRecord={handleAddVisitRecord}
        onLoginPrompt={() => setShowAuthDialog(true)}
      />

      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <AddStoreMethodSelector
        open={showAddStoreMethodSelector}
        onClose={() => setShowAddStoreMethodSelector(false)}
        onSelectMapClick={handleMapClickAdd}
        onSelectSearch={handleSearchAdd}
      />

      <PlaceSearchDialog
        open={showPlaceSearchDialog}
        onClose={() => setShowPlaceSearchDialog(false)}
        onAddStore={handleAddStoreSubmit}
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

export default HomePage
