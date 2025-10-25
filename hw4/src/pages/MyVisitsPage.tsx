import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Rating,
  CircularProgress
} from '@mui/material'
import {
  ExpandMore,
  ExpandLess,
  CalendarToday,
  FilterList,
  Edit,
  Delete
} from '@mui/icons-material'
import { Store as StoreType, VisitRecord } from '../types'
import { mediaAPI } from '../services/api'

interface MyVisitsPageProps {
  visitRecords: VisitRecord[]
  onToggleFavorite: (storeId: string) => void
  onViewOnMap: (store: StoreType) => void
  onExploreMap: () => void
  onEditVisit: (record: VisitRecord) => void
  onDeleteVisit: (record: VisitRecord) => void
  isLoading?: boolean
  error?: string | null
}

type SortOption = 'newest' | 'rating'
type FilterStore = string | 'all'

const MyVisitsPage: React.FC<MyVisitsPageProps> = ({
  visitRecords,
  onToggleFavorite,
  onViewOnMap,
  onExploreMap,
  onEditVisit,
  onDeleteVisit,
  isLoading = false,
  error = null
}) => {
  const [selectedStore, setSelectedStore] = useState<FilterStore>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())

  // 從造訪紀錄中提取商店資訊
  const stores = useMemo(() => {
    const storeMap = new Map<string, StoreType>()
    visitRecords.forEach(record => {
      if (!storeMap.has(record.storeId) && record.store) {
        // 使用從 API 返回的商店資訊
        storeMap.set(record.storeId, {
          id: record.store.id,
          name: record.store.name,
          address: record.store.address || '',
          lat: record.store.lat,
          lng: record.store.lng,
          avgRating: 0, // 這個需要從商店 API 獲取
          visitsCount: 0, // 這個需要從商店 API 獲取
          isFavorite: false, // 這個需要從收藏 API 獲取
          tags: [], // 這個需要從商店 API 獲取
          mainPhotoId: record.store.mainPhotoId,
          photos: [],
          openingHours: '',
          googleMapLink: '',
          instagramLink: ''
        })
      }
    })
    return Array.from(storeMap.values())
  }, [visitRecords])

  // 篩選和排序造訪紀錄
  const filteredRecords = useMemo(() => {
    let filtered = [...visitRecords]

    // 依店家篩選
    if (selectedStore !== 'all') {
      filtered = filtered.filter(record => record.storeId === selectedStore)
    }

    // 日期區間篩選
    if (dateRange.start) {
      filtered = filtered.filter(record => record.date >= dateRange.start)
    }
    if (dateRange.end) {
      filtered = filtered.filter(record => record.date <= dateRange.end)
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'rating':
          return b.rating - a.rating
        default:
          return 0
      }
    })

    return filtered
  }, [visitRecords, selectedStore, dateRange, sortBy])

  // 獲取店家資訊
  const getStoreInfo = (storeId: string) => {
    return stores.find(store => store.id === storeId)
  }

  // 處理展開/收合
  const handleToggleExpand = (recordId: string) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  const handleEdit = (record: VisitRecord) => {
    onEditVisit(record)
  }

  const handleDelete = (record: VisitRecord) => {
    onDeleteVisit(record)
  }

  // 清除篩選
  const handleClearFilters = () => {
    setSelectedStore('all')
    setDateRange({ start: '', end: '' })
  }

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <CircularProgress sx={{ color: '#2F6F4E' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* 頁面標題 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#333333',
              mb: 1
            }}
          >
            我的造訪紀錄
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666666',
              fontFamily: '"Noto Sans TC", sans-serif'
            }}
          >
            共 {filteredRecords.length} 筆造訪紀錄
          </Typography>
        </Box>
      </Box>

      {/* 篩選列 */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <FilterList sx={{ color: '#666666', fontSize: 20 }} />
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600,
                fontFamily: '"Noto Sans TC", sans-serif'
              }}
            >
              篩選條件
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* 依店家篩選 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>依店家</InputLabel>
                <Select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value as FilterStore)}
                  label="依店家"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">全部店家</MenuItem>
                  {stores.map(store => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 日期區間 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="開始日期"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ borderRadius: 2 }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="結束日期"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ borderRadius: 2 }}
              />
            </Grid>

            {/* 排序 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>排序方式</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  label="排序方式"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="newest">最新造訪</MenuItem>
                  <MenuItem value="rating">評分最高</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* 清除篩選 */}
          {(selectedStore !== 'all' || dateRange.start || dateRange.end) && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
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
                清除篩選
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 造訪紀錄列表 */}
      {filteredRecords.length === 0 ? (
        <EmptyState onExploreMap={onExploreMap} />
      ) : (
        <Grid container spacing={3}>
          {filteredRecords.map(record => {
            const store = getStoreInfo(record.storeId)
            const isExpanded = expandedRecords.has(record.id)
            
            return (
              <Grid item xs={12} key={record.id}>
                <VisitRecordCard
                  record={record}
                  store={store}
                  isExpanded={isExpanded}
                  onToggleExpand={() => handleToggleExpand(record.id)}
                  onEdit={() => handleEdit(record)}
                  onDelete={() => handleDelete(record)}
                />
              </Grid>
            )
          })}
        </Grid>
      )}

      {/* 暫時移除對話框，因為造訪紀錄頁面只顯示不編輯 */}
    </Box>
  )
}

// 空狀態元件
interface EmptyStateProps {
  onExploreMap: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ onExploreMap }) => (
  <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
    <CardContent>
      <CalendarToday sx={{ fontSize: 64, color: '#E8E0D6', mb: 2 }} />
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 600,
          fontFamily: '"Noto Sans TC", sans-serif',
          color: '#666666',
          mb: 1
        }}
      >
        還沒有造訪紀錄
      </Typography>
      <Typography 
        variant="body1" 
        sx={{ 
          color: '#999999',
          fontFamily: '"Noto Sans TC", sans-serif',
          mb: 3
        }}
      >
        去探索地圖，開始記錄你的造訪體驗吧！
      </Typography>
      <Button
        variant="contained"
        color="success"
        onClick={onExploreMap}
        sx={{
          backgroundColor: '#2F6F4E',
          fontFamily: '"Noto Sans TC", sans-serif',
          '&:hover': { backgroundColor: '#1F4A33' }
        }}
      >
        去探索地圖
      </Button>
    </CardContent>
  </Card>
)

// 造訪紀錄卡片元件
interface VisitRecordCardProps {
  record: VisitRecord
  store: StoreType | undefined
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
}

const VisitRecordCard: React.FC<VisitRecordCardProps> = ({
  record,
  store,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete
}) => {
  return (
    <Card sx={{ borderRadius: 3, mb: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* 店家照片 */}
          <CardMedia
            component="img"
            sx={{ 
              width: 120, 
              height: 120, 
              borderRadius: 2,
              objectFit: 'cover'
            }}
            image={store?.images?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=120&h=120&fit=crop'}
            alt={store?.name || '店家'}
          />

          {/* 造訪資訊 */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#333333',
                  cursor: 'pointer',
                  '&:hover': { color: '#2F6F4E' }
                }}
              >
                {store?.name || '未知店家'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={onEdit} size="small">
                  <Edit sx={{ color: '#2F6F4E' }} />
                </IconButton>
                <IconButton onClick={onDelete} size="small">
                  <Delete sx={{ color: '#F4A261' }} />
                </IconButton>
              </Box>
            </Box>

            {/* 造訪日期 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarToday sx={{ fontSize: 16, mr: 0.5, color: '#666666' }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666666',
                  fontFamily: '"Noto Sans TC", sans-serif'
                }}
              >
                {new Date(record.date).toLocaleDateString('zh-TW')}
              </Typography>
            </Box>

            {/* 評分 */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Rating value={record.rating} readOnly size="small" />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#F4A261',
                  fontWeight: 500,
                  fontFamily: '"Noto Sans TC", sans-serif',
                  ml: 1
                }}
              >
                {record.rating}/5
              </Typography>
            </Box>

            {/* 心得 */}
            <Box sx={{ mb: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#333333',
                  fontFamily: '"Noto Sans TC", sans-serif',
                  lineHeight: 1.4
                }}
              >
                {isExpanded ? record.note : 
                  (record.note && record.note.length > 100 ? 
                    record.note.substring(0, 100) + '...' : 
                    record.note || '無心得'
                  )
                }
              </Typography>
              {record.note && record.note.length > 100 && (
                <Button
                  size="small"
                  onClick={onToggleExpand}
                  sx={{
                    color: '#2F6F4E',
                    fontFamily: '"Noto Sans TC", sans-serif',
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    mt: 0.5
                  }}
                >
                  {isExpanded ? '收合' : '展開'}
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </Button>
              )}
            </Box>

            {/* 照片縮圖 */}
            {record.photos && record.photos.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {record.photos.slice(0, 5).map((photo: string, index: number) => (
                  <CardMedia
                    key={index}
                    component="img"
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      borderRadius: 1,
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    image={mediaAPI.getImageUrl(photo.mediaId)}
                    alt={`造訪照片 ${index + 1}`}
                    onClick={() => {/* 預覽大圖 */}}
                  />
                ))}
                {record.photos.length > 5 && (
                  <Box sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 1,
                    backgroundColor: '#E8E0D6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}>
                    <Typography variant="caption" sx={{ color: '#666666' }}>
                      +{record.photos.length - 5}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default MyVisitsPage
