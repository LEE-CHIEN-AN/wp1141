import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent,
  LinearProgress
} from '@mui/material'
import {
  Close,
  Search,
  LocationOn,
  AccessTime,
  Star,
  PhotoCamera,
  CheckCircle,
  CloudUpload,
  Delete,
  Add
} from '@mui/icons-material'
import { Store } from '../../types'
import { mediaAPI } from '../../services/api'

interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  user_ratings_total?: number
  opening_hours?: {
    open_now?: boolean
    isOpen?: () => boolean
    weekday_text: string[]
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  types: string[]
  business_status?: string
}

interface PlaceSearchDialogProps {
  open: boolean
  onClose: () => void
  onAddStore: (storeData: Omit<Store, 'id' | 'avgRating' | 'visitCount' | 'isFavorite' | 'createdAt' | 'updatedAt'> & { tagNames?: string[] }) => void
}

const PlaceSearchDialog: React.FC<PlaceSearchDialogProps> = ({
  open,
  onClose,
  onAddStore
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([])
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    openingHours: '',
    googleMapUrl: '',
    instagramUrl: '',
    tagNames: [] as string[],
    photos: [] as File[]
  })
  const [customTag, setCustomTag] = useState('')
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesService = useRef<google.maps.places.PlacesService | null>(null)

  // 初始化 Google Places 服務
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

    const initPlacesAPI = () => {
      console.log('初始化 Google Places 服務...')
      console.log('window.google:', window.google)
      console.log('window.google.maps:', window.google?.maps)
      console.log('window.google.maps.places:', window.google?.maps?.places)
      
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          autocompleteService.current = new window.google.maps.places.AutocompleteService()
          console.log('AutocompleteService 創建成功')
          
          // 創建一個隱藏的 div 用於 PlacesService
          const div = document.createElement('div')
          placesService.current = new window.google.maps.places.PlacesService(div)
          console.log('PlacesService 創建成功')
          setError('') // 清除錯誤
        } catch (error) {
          console.error('創建 Google Places 服務失敗:', error)
          setError('Google Places API 初始化失敗')
        }
      } else {
        console.error('Google Maps API 未載入或缺少 Places 庫')
        setError('Google Maps API 未載入，請檢查 API 金鑰設定。如果問題持續存在，請重新整理頁面。')
        
        // 嘗試重新載入 Google Maps API
        setTimeout(() => {
          if (!window.google?.maps?.places) {
            console.log('嘗試重新載入 Google Maps API...')
            const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY
            if (apiKey && apiKey !== 'your_google_maps_api_key_here') {
              const script = document.createElement('script')
              script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
              script.async = true
              script.defer = true
              script.onload = () => {
                console.log('重新載入完成，再次嘗試初始化')
                setTimeout(initPlacesAPI, 500)
              }
              document.head.appendChild(script)
            }
          }
        }, 2000)
      }
    }

    initPlacesAPI()
  }, [])

  // 搜尋建議
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('請輸入搜尋關鍵字')
      return
    }
    
    if (!autocompleteService.current) {
      setError('Google Places API 未初始化')
      return
    }

    console.log('開始搜尋:', searchQuery)
    setLoading(true)
    setError('')
    setSearchResults([])

    try {
      const request: google.maps.places.AutocompleteRequest = {
        input: searchQuery,
        types: ['establishment'],
        componentRestrictions: { country: 'tw' }, // 限制在台灣
        fields: ['place_id', 'name', 'formatted_address', 'geometry']
      }

      console.log('發送搜尋請求:', request)

      autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
        console.log('搜尋回應:', { predictions, status })
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          console.log('找到', predictions.length, '個結果')
          // 獲取詳細資訊
          const placeIds = predictions.slice(0, 5).map(p => p.place_id)
          getPlaceDetails(placeIds)
        } else {
          console.error('搜尋失敗:', status)
          setError(`搜尋失敗: ${status}`)
          setLoading(false)
        }
      })
    } catch (err) {
      console.error('搜尋時發生錯誤:', err)
      setError('搜尋時發生錯誤')
      setLoading(false)
    }
  }

  // 獲取店家詳細資訊
  const getPlaceDetails = (placeIds: string[]) => {
    if (!placesService.current) return

    const requests = placeIds.map(placeId => {
      return new Promise<PlaceSearchResult>((resolve, reject) => {
        const request: google.maps.places.PlaceDetailsRequest = {
          placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'rating',
            'user_ratings_total',
            'opening_hours',
            'photos',
            'types',
            'business_status'
          ]
        }

        placesService.current!.getDetails(request, (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place as PlaceSearchResult)
          } else {
            reject(new Error('Failed to get place details'))
          }
        })
      })
    })

    Promise.allSettled(requests).then(results => {
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<PlaceSearchResult> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)
      
      setSearchResults(successfulResults)
      setLoading(false)
    })
  }

  // 選擇店家
  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSelectedPlace(place)
    
    // 處理座標格式
    const lat = place.geometry.location.lat
    const lng = place.geometry.location.lng
    const latValue = typeof lat === 'function' ? lat() : lat
    const lngValue = typeof lng === 'function' ? lng() : lng
    
    // 預填表單資料
    setFormData({
      name: place.name,
      address: place.formatted_address,
      openingHours: place.opening_hours?.weekday_text?.join('\n') || '',
      googleMapUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      instagramUrl: '',
      tagNames: ['選物'],
      photos: []
    })
    
    setShowForm(true)
  }

  // 新增店家
  const handleAddStore = async () => {
    if (!selectedPlace) return

    setIsSubmitting(true)
    try {
      // 處理座標格式
      const lat = selectedPlace.geometry.location.lat
      const lng = selectedPlace.geometry.location.lng
      const latValue = typeof lat === 'function' ? lat() : lat
      const lngValue = typeof lng === 'function' ? lng() : lng

      // 上傳照片
      let photoIds: string[] = []
      if (formData.photos.length > 0) {
        setUploadingPhotos(true)
        try {
          const uploadPromises = formData.photos.map(async (photo) => {
            console.log('準備上傳照片:', {
              name: photo.name,
              size: photo.size,
              type: photo.type
            })
            const uploadFormData = new FormData()
            uploadFormData.append('file', photo)
            console.log('FormData 內容:', Array.from(uploadFormData.entries()))
            const response = await mediaAPI.upload(uploadFormData)
            return response.id
          })
          photoIds = await Promise.all(uploadPromises)
        } catch (err) {
          console.error('照片上傳失敗:', err)
          setError('照片上傳失敗')
          return
        } finally {
          setUploadingPhotos(false)
        }
      }

      const storeData: Omit<Store, 'id' | 'avgRating' | 'visitCount' | 'isFavorite' | 'createdAt' | 'updatedAt'> & { tagNames?: string[] } = {
        name: formData.name,
        lat: latValue,
        lng: lngValue,
        address: formData.address,
        openingHours: formData.openingHours,
        googleMapUrl: formData.googleMapUrl,
        instagramUrl: formData.instagramUrl,
        tagNames: formData.tagNames,
        mainPhotoId: photoIds[0] // 使用第一張照片作為主照片
      }

      await onAddStore(storeData)
      handleClose()
    } catch (err: any) {
      setError(err.message || '新增店家失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 表單處理函數
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTagChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[]
    setFormData(prev => ({ ...prev, tagNames: value }))
  }

  const handleAddCustomTag = () => {
    if (customTag.trim() && !formData.tagNames.includes(customTag.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tagNames: [...prev.tagNames, customTag.trim()] 
      }))
      setCustomTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tagNames: prev.tagNames.filter(tag => tag !== tagToRemove) 
    }))
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length + formData.photos.length > 10) {
      setError('最多只能上傳 10 張照片')
      return
    }
    
    setFormData(prev => ({ 
      ...prev, 
      photos: [...prev.photos, ...imageFiles] 
    }))
  }

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      photos: prev.photos.filter((_, i) => i !== index) 
    }))
  }

  const handleBackToSearch = () => {
    setShowForm(false)
    setSelectedPlace(null)
    setFormData({
      name: '',
      address: '',
      openingHours: '',
      googleMapUrl: '',
      instagramUrl: '',
      tagNames: [],
      photos: []
    })
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedPlace(null)
    setShowForm(false)
    setFormData({
      name: '',
      address: '',
      openingHours: '',
      googleMapUrl: '',
      instagramUrl: '',
      tagNames: [],
      photos: []
    })
    setError('')
    setLoading(false)
    setIsSubmitting(false)
    onClose()
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
            {showForm ? '新增店家' : '搜尋店家'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {showForm && (
              <Button 
                onClick={handleBackToSearch}
                variant="outlined"
                size="small"
                sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
              >
                返回搜尋
              </Button>
            )}
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => window.location.reload()}
                >
                  重新整理
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {showForm ? (
            // 顯示新增店家表單
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 基本資訊 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600 }}>
                  基本資訊
                </Typography>
                
                <TextField
                  label="店名"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  fullWidth
                  required
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
                
                <TextField
                  label="地址"
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
                
                <TextField
                  label="營業時間"
                  value={formData.openingHours}
                  onChange={(e) => handleFormChange('openingHours', e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="例如：週一至週五 09:00-18:00&#10;週六 10:00-16:00&#10;週日 休息"
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Box>

              {/* 連結資訊 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600 }}>
                  連結資訊
                </Typography>
                
                <TextField
                  label="Google Maps 連結"
                  value={formData.googleMapUrl}
                  onChange={(e) => handleFormChange('googleMapUrl', e.target.value)}
                  fullWidth
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
                
                <TextField
                  label="Instagram 連結"
                  value={formData.instagramUrl}
                  onChange={(e) => handleFormChange('instagramUrl', e.target.value)}
                  fullWidth
                  placeholder="https://www.instagram.com/..."
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Box>

              {/* 標籤 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600 }}>
                  標籤
                </Typography>
                
                <FormControl fullWidth>
                  <InputLabel sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>選擇標籤</InputLabel>
                  <Select
                    multiple
                    value={formData.tagNames}
                    onChange={handleTagChange}
                    input={<OutlinedInput label="選擇標籤" />}
                    renderValue={(selected) => (
                      <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            onDelete={() => handleRemoveTag(value)}
                            sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {['選物', '咖啡', '文創', '手作', '復古', '現代', '日式', '歐式', '韓式', '台式'].map((tag) => (
                      <MenuItem key={tag} value={tag} sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
                        {tag}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="自訂標籤"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    size="small"
                    sx={{ flex: 1, fontFamily: '"Noto Sans TC", sans-serif' }}
                  />
                  <Button 
                    onClick={handleAddCustomTag}
                    variant="outlined"
                    size="small"
                    sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                  >
                    新增
                  </Button>
                </Box>
              </Box>

              {/* 照片上傳 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600 }}>
                  店家照片
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    multiple
                    type="file"
                    onChange={handlePhotoUpload}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUpload />}
                      sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                    >
                      選擇照片 (最多 10 張)
                    </Button>
                  </label>
                  
                  {formData.photos.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formData.photos.map((photo, index) => (
                        <Box key={index} sx={{ position: 'relative' }}>
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`預覽 ${index + 1}`}
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '1px solid #E8E0D6'
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleRemovePhoto(index)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: 'white',
                              '&:hover': { backgroundColor: '#f5f5f5' }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            // 顯示搜尋介面
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 搜尋輸入框 */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="輸入店名或地址"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              fullWidth
              placeholder="例如：赤峰街咖啡廳、台北市信義區..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || loading}
              sx={{
                backgroundColor: '#2F6F4E',
                fontFamily: '"Noto Sans TC", sans-serif',
                '&:hover': { backgroundColor: '#1F4A33' },
                minWidth: 100
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : '搜尋'}
            </Button>
          </Box>

          {/* 搜尋結果 */}
          {searchResults.length > 0 && (
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontWeight: 600,
                  mb: 2,
                  color: '#333333'
                }}
              >
                搜尋結果 ({searchResults.length})
              </Typography>
              
              <List sx={{ p: 0 }}>
                {searchResults.map((place, index) => (
                  <React.Fragment key={place.place_id}>
                    <ListItem 
                      sx={{ 
                        cursor: 'pointer',
                        borderRadius: 2,
                        mb: 1,
                        border: selectedPlace?.place_id === place.place_id ? '2px solid #2F6F4E' : '1px solid #E8E0D6',
                        backgroundColor: selectedPlace?.place_id === place.place_id ? '#FAF5EF' : 'white',
                        '&:hover': { 
                          backgroundColor: selectedPlace?.place_id === place.place_id ? '#FAF5EF' : '#F9F9F9'
                        }
                      }}
                      onClick={() => handleSelectPlace(place)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ backgroundColor: '#2F6F4E' }}>
                          <LocationOn />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              fontWeight: 600,
                              fontFamily: '"Noto Sans TC", sans-serif',
                              color: '#333333',
                              fontSize: '1rem'
                            }}>
                              {place.name}
                            </Box>
                            {selectedPlace?.place_id === place.place_id && (
                              <CheckCircle sx={{ color: '#2F6F4E', fontSize: 20 }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box sx={{ 
                              color: '#666666',
                              fontFamily: '"Noto Sans TC", sans-serif',
                              mb: 0.5,
                              fontSize: '0.875rem'
                            }}>
                              {place.formatted_address}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              {place.rating && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Star sx={{ color: '#F4A261', fontSize: 16 }} />
                                  <Box sx={{ color: '#666666', fontSize: '0.75rem' }}>
                                    {place.rating.toFixed(1)} ({place.user_ratings_total || 0})
                                  </Box>
                                </Box>
                              )}
                              {place.opening_hours && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <AccessTime sx={{ color: '#666666', fontSize: 16 }} />
                                  <Box sx={{ color: '#666666', fontSize: '0.75rem' }}>
                                    營業時間：{place.opening_hours?.weekday_text?.join(', ') || '未提供'}
                                  </Box>
                                </Box>
                              )}
                              {place.photos && place.photos.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <PhotoCamera sx={{ color: '#666666', fontSize: 16 }} />
                                  <Box sx={{ color: '#666666', fontSize: '0.75rem' }}>
                                    {place.photos.length} 張照片
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < searchResults.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* 選中的店家預覽 */}
          {selectedPlace && (
            <Card sx={{ mt: 2, border: '2px solid #2F6F4E', backgroundColor: '#FAF5EF' }}>
              <CardContent>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: '"Noto Sans TC", sans-serif',
                    fontWeight: 700,
                    color: '#2F6F4E',
                    mb: 2
                  }}
                >
                  即將新增的店家
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ fontFamily: '"Noto Sans TC", sans-serif', mb: 1 }}>
                    <strong>店名：</strong>{selectedPlace.name}
                  </Box>
                  <Box sx={{ fontFamily: '"Noto Sans TC", sans-serif', mb: 1 }}>
                    <strong>地址：</strong>{selectedPlace.formatted_address}
                  </Box>
                  <Box sx={{ fontFamily: '"Noto Sans TC", sans-serif', mb: 1 }}>
                    <strong>座標：</strong>
                    {(() => {
                      const lat = selectedPlace.geometry.location.lat
                      const lng = selectedPlace.geometry.location.lng
                      // 處理不同的座標格式
                      const latValue = typeof lat === 'function' ? lat() : lat
                      const lngValue = typeof lng === 'function' ? lng() : lng
                      return `${latValue.toFixed(6)}, ${lngValue.toFixed(6)}`
                    })()}
                  </Box>
                  {selectedPlace.rating && (
                    <Box sx={{ fontFamily: '"Noto Sans TC", sans-serif', mb: 1 }}>
                      <strong>評分：</strong>{selectedPlace.rating.toFixed(1)} ⭐ ({selectedPlace.user_ratings_total || 0} 則評論)
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={isSubmitting}
          sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
        >
          取消
        </Button>
        {showForm ? (
          <Button 
            onClick={handleAddStore} 
            variant="contained"
            disabled={!formData.name || isSubmitting || uploadingPhotos}
            sx={{
              backgroundColor: '#2F6F4E',
              fontFamily: '"Noto Sans TC", sans-serif',
              '&:hover': { backgroundColor: '#1F4A33' }
            }}
          >
            {isSubmitting || uploadingPhotos ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                {uploadingPhotos ? '上傳照片中...' : '新增中...'}
              </Box>
            ) : (
              '新增店家'
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleSearch} 
            variant="contained"
            disabled={!searchQuery.trim() || loading}
            sx={{
              backgroundColor: '#2F6F4E',
              fontFamily: '"Noto Sans TC", sans-serif',
              '&:hover': { backgroundColor: '#1F4A33' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : '搜尋'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default PlaceSearchDialog
