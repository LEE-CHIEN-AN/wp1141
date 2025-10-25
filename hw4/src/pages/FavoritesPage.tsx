import React, { useState, useMemo } from 'react'
import {
  Box,
  Typography,
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material'
import {
  Search,
  FilterList,
  ViewList,
  ViewModule,
  Favorite,
  LocationOn,
  Star,
  Directions,
  AccessTime
} from '@mui/icons-material'
import { Store } from '../types'
import { mediaAPI } from '../services/api'

interface FavoritesPageProps {
  stores: Store[]
  favorites: string[]
  onToggleFavorite: (storeId: string) => void
  onViewOnMap: (store: Store) => void
  onExploreMap: () => void
  isLoading?: boolean
}

type SortOption = 'newest' | 'rating' | 'name'
type ViewMode = 'card' | 'list'

const FavoritesPage: React.FC<FavoritesPageProps> = ({
  stores,
  favorites,
  onToggleFavorite,
  onViewOnMap,
  onExploreMap,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  // 獲取所有可用的標籤
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    stores.forEach(store => {
      if (favorites.includes(store.id)) {
        store.tags?.forEach(tag => tags.add(tag.name))
      }
    })
    return Array.from(tags).sort()
  }, [stores, favorites])

  // 篩選和排序收藏的店家
  const filteredStores = useMemo(() => {
    let filtered = stores.filter(store => favorites.includes(store.id))

    // 關鍵字篩選
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(store =>
        store.name.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query)
      )
    }

    // 標籤篩選
    if (selectedTags.length > 0) {
      filtered = filtered.filter(store =>
        selectedTags.some(tag => store.tags?.some(storeTag => storeTag.name === tag))
      )
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          // 假設按 ID 排序（較新的 ID 較大）
          return parseInt(b.id) - parseInt(a.id)
        case 'rating':
          return b.rating - a.rating
        case 'name':
          return a.name.localeCompare(b.name, 'zh-TW')
        default:
          return 0
      }
    })

    return filtered
  }, [stores, favorites, searchQuery, selectedTags, sortBy])

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedTags([])
  }

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode | null
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode)
    }
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
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            fontFamily: '"Noto Sans TC", sans-serif',
            color: '#333333',
            mb: 1
          }}
        >
          我的收藏
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif'
          }}
        >
          共 {filteredStores.length} 家收藏的店家
        </Typography>
      </Box>

      {/* 篩選列 */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* 搜尋和視圖模式 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="搜尋店名或地址..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#666666' }} />
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
            
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="card">
                <ViewModule />
              </ToggleButton>
              <ToggleButton value="list">
                <ViewList />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* 標籤篩選 */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterList sx={{ color: '#666666', fontSize: 20 }} />
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  fontFamily: '"Noto Sans TC", sans-serif'
                }}
              >
                標籤篩選
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availableTags.map((tag: string) => (
                <Chip
                  key={tag}
                  label={tag}
                  clickable
                  onClick={() => handleTagToggle(tag)}
                  variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                  sx={{
                    borderColor: '#2F6F4E',
                    color: selectedTags.includes(tag) ? 'white' : '#2F6F4E',
                    backgroundColor: selectedTags.includes(tag) ? '#2F6F4E' : 'transparent',
                    fontWeight: 500,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: selectedTags.includes(tag) ? '#1F4A33' : '#FAF5EF'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* 排序和清除篩選 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>排序方式</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                label="排序方式"
                sx={{
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E8E0D6'
                  }
                }}
              >
                <MenuItem value="newest">最新加入</MenuItem>
                <MenuItem value="rating">評分最高</MenuItem>
                <MenuItem value="name">名稱 A→Z</MenuItem>
              </Select>
            </FormControl>

            {(searchQuery || selectedTags.length > 0) && (
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
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 收藏清單 */}
      {filteredStores.length === 0 ? (
        <EmptyState 
          hasFilters={!!(searchQuery || selectedTags.length > 0)}
          onClearFilters={handleClearFilters}
          onExploreMap={onExploreMap}
        />
      ) : (
        <Grid container spacing={3}>
          {filteredStores.map(store => (
            <Grid item xs={12} sm={viewMode === 'card' ? 6 : 12} md={viewMode === 'card' ? 4 : 12} key={store.id}>
              <FavoriteCard
                store={store}
                viewMode={viewMode}
                onToggleFavorite={onToggleFavorite}
                onViewOnMap={onViewOnMap}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

// 空狀態元件
interface EmptyStateProps {
  hasFilters: boolean
  onClearFilters: () => void
  onExploreMap: () => void
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters, onClearFilters, onExploreMap }) => (
  <Card sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
    <CardContent>
      <Favorite sx={{ fontSize: 64, color: '#E8E0D6', mb: 2 }} />
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 600,
          fontFamily: '"Noto Sans TC", sans-serif',
          color: '#666666',
          mb: 1
        }}
      >
        {hasFilters ? '沒有符合條件的收藏' : '還沒有收藏任何店家'}
      </Typography>
      <Typography 
        variant="body1" 
        sx={{ 
          color: '#999999',
          fontFamily: '"Noto Sans TC", sans-serif',
          mb: 3
        }}
      >
        {hasFilters ? '試試調整篩選條件' : '去探索地圖，發現更多有趣的店家吧！'}
      </Typography>
      {hasFilters ? (
        <Button
          variant="contained"
          onClick={onClearFilters}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': { backgroundColor: '#1F4A33' }
          }}
        >
          清除篩選
        </Button>
      ) : (
        <Button
          variant="contained"
          onClick={onExploreMap}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': { backgroundColor: '#1F4A33' }
          }}
        >
          去探索地圖
        </Button>
      )}
    </CardContent>
  </Card>
)

// 收藏卡片元件
interface FavoriteCardProps {
  store: Store
  viewMode: ViewMode
  onToggleFavorite: (storeId: string) => void
  onViewOnMap: (store: Store) => void
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  store,
  viewMode,
  onToggleFavorite,
  onViewOnMap
}) => {
  const handleToggleFavorite = () => {
    onToggleFavorite(store.id)
  }

  const handleViewOnMap = () => {
    onViewOnMap(store)
  }

  if (viewMode === 'list') {
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
              image={store.mainPhotoId ? mediaAPI.getImageUrl(store.mainPhotoId) : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=120&h=120&fit=crop'}
              alt={store.name}
            />

            {/* 店家資訊 */}
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
                  onClick={() => {/* 點擊進詳情 */}}
                >
                  {store.name}
                </Typography>
                <IconButton
                  onClick={handleToggleFavorite}
                  sx={{
                    color: '#F4A261',
                    '&:hover': { color: '#E8914A' }
                  }}
                >
                  <Favorite />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationOn sx={{ fontSize: 16, mr: 0.5, color: '#666666' }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#666666',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  {store.address}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Star sx={{ fontSize: 16, color: '#F4A261', mr: 0.5 }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#F4A261',
                      fontWeight: 500,
                      fontFamily: '"Noto Sans TC", sans-serif'
                    }}
                  >
                    {store.avgRating?.toFixed(1) || '0.0'}
                  </Typography>
                  
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666666',
                      fontFamily: '"Noto Sans TC", sans-serif'
                    }}
                  >
                    營業時間：{store.openingHours || '未提供'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                     {store.tags?.map((tag) => (
                  <Chip 
                    key={tag.id} 
                    label={tag.name} 
                    size="small" 
                    variant="outlined"
                    sx={{
                      borderColor: '#2F6F4E',
                      color: '#2F6F4E',
                      backgroundColor: '#FAF5EF',
                      fontWeight: 500,
                      borderRadius: 1
                    }}
                  />
                ))}
              </Box>

              <Button
                variant="outlined"
                startIcon={<Directions />}
                onClick={handleViewOnMap}
                size="small"
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
                在地圖上查看
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // 卡片模式
  return (
    <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="200"
        image={store.mainPhotoId ? mediaAPI.getImageUrl(store.mainPhotoId) : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop'}
        alt={store.name}
        sx={{ borderRadius: '12px 12px 0 0' }}
      />
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            onClick={() => {/* 點擊進詳情 */}}
          >
            {store.name}
          </Typography>
          <IconButton
            onClick={handleToggleFavorite}
            sx={{
              color: '#F4A261',
              '&:hover': { color: '#E8914A' }
            }}
          >
            <Favorite />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <LocationOn sx={{ fontSize: 16, mr: 0.5, color: '#666666' }} />
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666666',
              fontFamily: '"Noto Sans TC", sans-serif',
              lineHeight: 1.4
            }}
          >
            {store.address}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Star sx={{ fontSize: 16, color: '#F4A261', mr: 0.5 }} />
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#F4A261',
                fontWeight: 500,
                fontFamily: '"Noto Sans TC", sans-serif'
              }}
            >
              {store.avgRating?.toFixed(1) || '0.0'}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#999999',
                fontFamily: '"Noto Sans TC", sans-serif',
                ml: 0.5
              }}
            >
              ({store.visitCount || 0})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666666',
                fontFamily: '"Noto Sans TC", sans-serif'
              }}
            >
              營業時間：{store.openingHours || '未提供'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                     {store.tags?.map((tag) => (
            <Chip 
              key={tag.id} 
              label={tag.name} 
              size="small" 
              variant="outlined"
              sx={{
                borderColor: '#2F6F4E',
                color: '#2F6F4E',
                backgroundColor: '#FAF5EF',
                fontWeight: 500,
                borderRadius: 1
              }}
            />
          ))}
        </Box>

        <Button
          variant="outlined"
          startIcon={<Directions />}
          onClick={handleViewOnMap}
          fullWidth
          sx={{
            borderColor: '#2F6F4E',
            color: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            mt: 'auto',
            '&:hover': {
              borderColor: '#1F4A33',
              backgroundColor: '#FAF5EF'
            }
          }}
        >
          在地圖上查看
        </Button>
      </CardContent>
    </Card>
  )
}

export default FavoritesPage
