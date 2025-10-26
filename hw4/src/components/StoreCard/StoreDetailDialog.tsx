import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Rating,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Favorite,
  FavoriteBorder,
  LocationOn,
  Instagram,
  Directions,
  Close,
  Edit
} from '@mui/icons-material'
import { Store, VisitRecord, User } from '../../types'
import { storesAPI, mediaAPI } from '../../services/api'
import VisitRecordsSection from './VisitRecordsSection'
import EditStoreDialog from '../StoreForm/EditStoreDialog'

interface StoreDetailDialogProps {
  open: boolean
  onClose: () => void
  store: Store | null
  isAuthenticated: boolean
  currentUser: User | null
  onToggleFavorite: (storeId: string) => void
  onAddVisitRecord: (storeId: string, record: Omit<VisitRecord, 'id'>) => void
  onLoginPrompt: () => void
}

const StoreDetailDialog: React.FC<StoreDetailDialogProps> = ({
  open,
  onClose,
  store,
  isAuthenticated,
  currentUser,
  onToggleFavorite,
  onAddVisitRecord,
  onLoginPrompt
}) => {
  const [storeDetail, setStoreDetail] = useState<Store | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // 當對話框開啟時載入商店詳情
  useEffect(() => {
    if (open && store) {
      loadStoreDetail()
    }
  }, [open, store])

  const loadStoreDetail = async () => {
    if (!store) return
    
    setLoading(true)
    setError(null)
    try {
      const detail = await storesAPI.getStore(store.id)
      setStoreDetail(detail)
    } catch (err: any) {
      setError(err.message || '載入商店詳情失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleEditStore = () => {
    setShowEditDialog(true)
  }

  const handleStoreUpdated = (updatedStore: Store) => {
    setStoreDetail(updatedStore)
    setShowEditDialog(false)
    // 在對話框關閉後重新載入資料，確保顯示最新資訊
    setTimeout(() => {
      loadStoreDetail()
    }, 300)
  }

  if (!store) return null

  // 使用實際的商店詳情或回退到傳入的商店資料
  const displayStore = storeDetail || store

  return (
    <>
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={false}
      TransitionProps={{
        onExited: () => {
          // 確保對話框關閉後移除焦點，避免 aria-hidden 警告
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="div">
            {displayStore.name}
          </Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 店家照片 */}
            <CardMedia
              component="img"
              height="200"
              image={displayStore.mainPhotoId ? mediaAPI.getImageUrl(displayStore.mainPhotoId) : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop'}
              alt={displayStore.name}
              sx={{ borderRadius: 1 }}
            />

            {/* 基本資訊 */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body1" color="text.secondary">
                    {displayStore.address}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Rating value={displayStore.avgRating || 0} readOnly precision={0.1} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {displayStore.avgRating?.toFixed(1) || '0.0'} ({displayStore.visitsCount || 0} 次造訪)
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label="營業時間" 
                    color="primary"
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {displayStore.tags?.map((tag) => (
                    <Chip key={tag.name || tag} label={tag.name || tag} size="small" variant="outlined" />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {displayStore.googleMapLink && (
                    <Button
                      variant="outlined"
                      startIcon={<Directions />}
                      onClick={() => window.open(displayStore.googleMapLink, '_blank')}
                      size="small"
                    >
                      Google Maps
                    </Button>
                  )}
                  {displayStore.instagramLink && (
                    <Button
                      variant="outlined"
                      startIcon={<Instagram />}
                      onClick={() => window.open(displayStore.instagramLink, '_blank')}
                      size="small"
                    >
                      Instagram
                    </Button>
                  )}
                  <Button
                    variant={displayStore.isFavorite ? "contained" : "outlined"}
                    startIcon={displayStore.isFavorite ? <Favorite /> : <FavoriteBorder />}
                    onClick={() => onToggleFavorite(displayStore.id)}
                    size="small"
                    color={displayStore.isFavorite ? "secondary" : "primary"}
                  >
                    {displayStore.isFavorite ? '已收藏' : '收藏'}
                  </Button>
                  {isAuthenticated && (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={handleEditStore}
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
                      編輯店家
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* 造訪紀錄區塊 */}
            <VisitRecordsSection
              storeId={displayStore.id}
              isAuthenticated={isAuthenticated}
              currentUser={currentUser}
              onLoginPrompt={onLoginPrompt}
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>

    {/* 編輯店家對話框 */}
    <EditStoreDialog
      open={showEditDialog}
      onClose={() => setShowEditDialog(false)}
      store={displayStore}
      onStoreUpdated={handleStoreUpdated}
    />
  </>
  )
}

export default StoreDetailDialog
