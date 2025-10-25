import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography, Button, Card, CardContent, CardMedia, Chip, IconButton, Dialog } from '@mui/material'
import { Favorite, FavoriteBorder, LocationOn, Instagram, Directions, Close, Edit } from '@mui/icons-material'
import { Store, VisitRecord, User } from '../../types'
import { mediaAPI } from '../../services/api'
import ImageCarousel from './ImageCarousel'
import BusinessHours from './BusinessHours'
import StoreVisitRecords from './StoreVisitRecords'
import EditStoreDialog from '../StoreForm/EditStoreDialog'

interface GoogleMapProps {
  stores: Store[]
  onAddStore: (coordinates: { lat: number; lng: number }) => void
  onToggleFavorite: (storeId: string) => void
  onAddVisitRecord: (storeId: string, record: Omit<VisitRecord, 'id'>) => void
  onStoreUpdated?: (updatedStore: Store) => void
  isAuthenticated: boolean
  currentUser: User | null
  onShowLoginDialog?: () => void
  focusStore?: Store | null
  onFocusStoreClear?: () => void
  userVisitRecords?: VisitRecord[]
}

interface CustomMarker {
  store: Store
  marker: google.maps.Marker
  infoWindow: google.maps.InfoWindow
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  stores,
  onAddStore,
  onToggleFavorite,
  onAddVisitRecord,
  onStoreUpdated,
  isAuthenticated,
  currentUser,
  onShowLoginDialog,
  focusStore,
  onFocusStoreClear,
  userVisitRecords = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<CustomMarker[]>([])
  const [hoveredStore, setHoveredStore] = useState<Store | null>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [showDetailCard, setShowDetailCard] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false)

  // 檢查 Google Maps API 是否載入
  useEffect(() => {
    // 暫時抑制 Google Maps 棄用警告
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string' && 
          (message.includes('AutocompleteService') || 
           message.includes('PlacesService') || 
           message.includes('Marker'))) {
        // 抑制 Google Maps 棄用警告
        return;
      }
      originalConsoleWarn(...args);
    };

    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.ControlPosition) {
        setIsGoogleMapsReady(true)
      } else {
        // 如果還沒載入，100ms 後再檢查
        setTimeout(checkGoogleMaps, 100)
      }
    }
    checkGoogleMaps()
  }, [])

  // 初始化地圖
  useEffect(() => {
    if (!mapRef.current || !isGoogleMapsReady) return

    // 初始化地圖
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 23.6978, lng: 120.9605 }, // 台灣中心點
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      }
    })

    mapInstanceRef.current = map

    // 地圖點擊事件 - 新增店家
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        onAddStore({ lat, lng })
      }
    })

    // 建立標記
    createMarkers(map, stores)

    return () => {
      // 清理標記
      markersRef.current.forEach(({ marker }) => marker.setMap(null))
      markersRef.current = []
    }
  }, [isGoogleMapsReady]) // 當 Google Maps API 載入後重新執行

  useEffect(() => {
    if (mapInstanceRef.current) {
      // 更新標記
      markersRef.current.forEach(({ marker }) => marker.setMap(null))
      markersRef.current = []
      createMarkers(mapInstanceRef.current, stores)
    }
  }, [stores])

  // 處理 focusStore（從收藏頁面跳轉回來時定位）
  useEffect(() => {
    if (focusStore && mapInstanceRef.current) {
      const storeMarker = markersRef.current.find(m => m.store.id === focusStore.id)
      if (storeMarker) {
        // 移動地圖到該店家位置
        mapInstanceRef.current.panTo({ lat: storeMarker.store.lat, lng: storeMarker.store.lng })
        mapInstanceRef.current.setZoom(16)
        
        // 顯示 hover 卡片
        setHoveredStore(focusStore)
        
        // 清除 focusStore
        setTimeout(() => {
          onFocusStoreClear?.()
        }, 1000)
      }
    }
  }, [focusStore, onFocusStoreClear])

  // 同步 hoveredStore 和 selectedStore 的收藏狀態
  useEffect(() => {
    if (hoveredStore) {
      const updatedStore = stores.find(s => s.id === hoveredStore.id)
      if (updatedStore && updatedStore.isFavorite !== hoveredStore.isFavorite) {
        setHoveredStore(updatedStore)
      }
    }
    if (selectedStore) {
      const updatedStore = stores.find(s => s.id === selectedStore.id)
      if (updatedStore && updatedStore.isFavorite !== selectedStore.isFavorite) {
        setSelectedStore(updatedStore)
      }
    }
  }, [stores])

  const createMarkers = (map: google.maps.Map, storeList: Store[]) => {
    storeList.forEach((store) => {
      // 根據收藏狀態選擇顏色
      const markerColor = store.isFavorite ? '#F4A261' : '#2F6F4E'
      const strokeColor = store.isFavorite ? '#E8914A' : '#1F4A33'
      
      const marker = new google.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        map: map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <!-- 陰影 -->
              <ellipse cx="24" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.15)" opacity="0.3"/>
              <!-- 主要標記 -->
              <path d="M24 4 C16 4, 8 12, 8 20 C8 28, 24 44, 24 44 C24 44, 40 28, 40 20 C40 12, 32 4, 24 4 Z" 
                    fill="${markerColor}" 
                    stroke="${strokeColor}" 
                    stroke-width="2"/>
              <!-- 內部圓圈 -->
              <circle cx="24" cy="20" r="8" fill="white" opacity="0.9"/>
              <!-- 店字圖示 -->
              <text x="24" y="25" text-anchor="middle" fill="${markerColor}" 
                    font-family="Noto Sans TC, Arial, sans-serif" 
                    font-size="10" 
                    font-weight="700">店</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(24, 44)
        },
        title: store.name
      })

      // 建立空的資訊視窗（保留以維持介面一致性）
      const infoWindow = new google.maps.InfoWindow()

      // 標記點擊事件 - 顯示詳細卡片
      marker.addListener('click', () => {
        setSelectedStore(store)
        setShowDetailCard(true)
        setHoveredStore(null) // 關閉預覽卡片
      })

      // 標記懸停事件 - 顯示預覽卡片
      marker.addListener('mouseover', () => {
        setHoveredStore(store)
      })

      marker.addListener('mouseout', () => {
        // 延遲關閉，讓使用者有時間移動到卡片上
        setTimeout(() => {
          setHoveredStore(null)
        }, 100)
      })

      markersRef.current.push({ store, marker, infoWindow })
    })
  }


  const handleCloseDetailCard = () => {
    setShowDetailCard(false)
    setSelectedStore(null)
  }

  const handlePreviewCardClick = (store: Store) => {
    setSelectedStore(store)
    setShowDetailCard(true)
    setHoveredStore(null) // 關閉預覽卡片
  }

  const handleToggleFavoriteClick = (storeId: string) => {
    if (!isAuthenticated) {
      onShowLoginDialog?.()
      return
    }
    
    // 立即更新 hoveredStore 和 selectedStore 的收藏狀態
    if (hoveredStore && hoveredStore.id === storeId) {
      setHoveredStore(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null)
    }
    if (selectedStore && selectedStore.id === storeId) {
      setSelectedStore(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null)
    }
    
    onToggleFavorite(storeId)
  }

  const handleEditStore = () => {
    setShowEditDialog(true)
  }

  const handleStoreUpdated = (updatedStore: Store) => {
    setSelectedStore(updatedStore)
    setShowEditDialog(false)
    
    // 通知父組件更新 stores 列表
    if (onStoreUpdated) {
      onStoreUpdated(updatedStore)
    }
  }

  // 當 stores 更新時，同步更新 selectedStore
  useEffect(() => {
    if (selectedStore) {
      const updatedStore = stores.find(store => store.id === selectedStore.id)
      if (updatedStore) {
        setSelectedStore(updatedStore)
      }
    }
  }, [stores, selectedStore])

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 地圖容器 */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* 滑鼠懸停預覽卡片（小卡） */}
      {hoveredStore && (
        <Card 
          sx={{ 
            position: 'absolute',
            top: 20,
            left: 20,
            maxWidth: 280,
            zIndex: 1000,
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(47, 111, 78, 0.1)',
            animation: 'slideIn 0.2s ease-out',
            cursor: 'pointer'
          }}
          onClick={() => handlePreviewCardClick(hoveredStore)}
        >
          <CardMedia
            component="img"
            height="120"
            image={hoveredStore.mainPhotoId ? mediaAPI.getImageUrl(hoveredStore.mainPhotoId) : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=280&h=120&fit=crop'}
            alt={hoveredStore.name}
            sx={{ borderRadius: '8px 8px 0 0' }}
          />
          <CardContent sx={{ p: 1.5 }}>
            {/* 店名 */}
            <Typography 
              variant="subtitle1" 
              component="div" 
              sx={{ 
                fontWeight: 700, 
                color: '#333333',
                fontFamily: '"Noto Sans TC", sans-serif',
                mb: 0.5,
                fontSize: '14px'
              }}
            >
              {hoveredStore.name}
            </Typography>
            
            {/* 地址（簡短一行） */}
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666666',
                fontFamily: '"Noto Sans TC", sans-serif',
                fontSize: '12px',
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {hoveredStore.address}
            </Typography>

            

            {/* 標籤 */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              {hoveredStore.tags?.slice(0, 3).map((tag) => (
                <Chip 
                  key={tag.id} 
                  label={tag.name} 
                  size="small" 
                  sx={{
                    backgroundColor: '#FAF5EF',
                    color: '#2F6F4E',
                    border: '1px solid #E8E0D6',
                    fontWeight: 500,
                    borderRadius: 1,
                    fontSize: '10px',
                    height: '20px'
                  }}
                />
              ))}
            </Box>

            {/* 收藏按鈕 */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleFavoriteClick(hoveredStore.id)
                }}
                sx={{
                  backgroundColor: hoveredStore.isFavorite ? '#F4A261' : '#FAF5EF',
                  '&:hover': { 
                    backgroundColor: hoveredStore.isFavorite ? '#E8914A' : '#E8E0D6' 
                  }
                }}
              >
                {hoveredStore.isFavorite ? 
                  <Favorite sx={{ color: 'white', fontSize: 16 }} /> : 
                  <FavoriteBorder sx={{ color: '#2F6F4E', fontSize: 16 }} />
                }
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 點擊詳細卡片（大卡）- 置中顯示 */}
      <Dialog
        open={showDetailCard}
        onClose={handleCloseDetailCard}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            margin: 2
          }
        }}
      >
        {selectedStore && (
          <Box>
            {/* 關閉按鈕 */}
            <IconButton
              onClick={handleCloseDetailCard}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1002,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)'
                }
              }}
            >
              <Close />
            </IconButton>

            {/* 店家照片輪播 */}
            <ImageCarousel 
              images={selectedStore.photos?.map(photo => photo.mediaId) || []} 
              mainPhotoId={selectedStore.mainPhotoId}
              height={300}
              alt={selectedStore.name}
            />

            <CardContent sx={{ p: 3 }}>
              {/* 店家名稱 */}
              <Typography 
                variant="h4" 
                component="div" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#333333',
                  fontFamily: '"Noto Sans TC", sans-serif',
                  mb: 2
                }}
              >
                {selectedStore.name}
              </Typography>

              {/* 地址 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationOn sx={{ fontSize: 20, mr: 1, color: '#666666' }} />
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#666666',
                    fontFamily: '"Noto Sans TC", sans-serif',
                    lineHeight: 1.4
                  }}
                >
                  {selectedStore.address}
                </Typography>
              </Box>

              {/* 標籤 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {selectedStore.tags?.map((tag) => (
                  <Chip 
                    key={tag.id} 
                    label={tag.name} 
                    size="medium" 
                    variant="outlined"
                    sx={{
                      borderColor: '#2F6F4E',
                      color: '#2F6F4E',
                      backgroundColor: '#FAF5EF',
                      fontWeight: 500,
                      borderRadius: 2
                    }}
                  />
                ))}
              </Box>

              {/* 營業時間 */}
              <BusinessHours businessHours={selectedStore.openingHours} />

              {/* 外部連結 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {selectedStore.googleMapUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<Directions />}
                    onClick={() => window.open(selectedStore.googleMapUrl, '_blank')}
                    sx={{
                      borderColor: '#2F6F4E',
                      color: '#2F6F4E',
                      fontFamily: '"Noto Sans TC", sans-serif',
                      '&:hover': {
                        borderColor: '#1F4A33',
                        backgroundColor: '#FAF5EF'
                      }
                    }}
                  >
                    Google Maps
                  </Button>
                )}
                {selectedStore.instagramUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<Instagram />}
                    onClick={() => window.open(selectedStore.instagramUrl, '_blank')}
                    sx={{
                      borderColor: '#2F6F4E',
                      color: '#2F6F4E',
                      fontFamily: '"Noto Sans TC", sans-serif',
                      '&:hover': {
                        borderColor: '#1F4A33',
                        backgroundColor: '#FAF5EF'
                      }
                    }}
                  >
                    Instagram
                  </Button>
                )}
              </Box>

              {/* 收藏按鈕 */}
              <Button
                variant={selectedStore.isFavorite ? "outlined" : "contained"}
                startIcon={selectedStore.isFavorite ? <Favorite /> : <FavoriteBorder />}
                onClick={() => handleToggleFavoriteClick(selectedStore.id)}
                fullWidth
                size="large"
                sx={{
                  backgroundColor: selectedStore.isFavorite ? 'transparent' : '#2F6F4E',
                  borderColor: '#2F6F4E',
                  color: selectedStore.isFavorite ? '#2F6F4E' : 'white',
                  fontWeight: 600,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  mb: 3,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: selectedStore.isFavorite ? '#FAF5EF' : '#1F4A33',
                    borderColor: '#1F4A33'
                  }
                }}
              >
                {selectedStore.isFavorite ? '取消收藏' : '收藏店家'}
              </Button>

              {/* 編輯按鈕 */}
              {isAuthenticated && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEditStore}
                  fullWidth
                  size="large"
                  sx={{
                    backgroundColor: 'transparent',
                    borderColor: '#2F6F4E',
                    color: '#2F6F4E',
                    fontWeight: 600,
                    fontFamily: '"Noto Sans TC", sans-serif',
                    mb: 3,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: '#FAF5EF',
                      borderColor: '#1F4A33'
                    }
                  }}
                >
                  編輯店家
                </Button>
              )}

              {/* 造訪紀錄區塊 */}
              <StoreVisitRecords
                storeId={selectedStore.id}
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                onLoginPrompt={() => onShowLoginDialog?.()}
              />
            </CardContent>
          </Box>
        )}
      </Dialog>

      {/* 編輯店家對話框 */}
      <EditStoreDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        store={selectedStore}
        onStoreUpdated={handleStoreUpdated}
      />
    </Box>
  )
}

export default GoogleMap
