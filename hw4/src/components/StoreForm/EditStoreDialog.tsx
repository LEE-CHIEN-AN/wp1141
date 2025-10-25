import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent
} from '@mui/material'
import { Close, Add, Delete, PhotoCamera } from '@mui/icons-material'
import { Store, Tag } from '../../types'
import { storesAPI, mediaAPI } from '../../services/api'

interface EditStoreDialogProps {
  open: boolean
  onClose: () => void
  store: Store | null
  onStoreUpdated: (updatedStore: Store) => void
}

const EditStoreDialog: React.FC<EditStoreDialogProps> = ({
  open,
  onClose,
  store,
  onStoreUpdated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    openingHours: '',
    googleMapUrl: '',
    instagramUrl: '',
    tagNames: [] as string[],
    description: ''
  })
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [existingPhotos, setExistingPhotos] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 初始化表單資料
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        address: store.address || '',
        openingHours: store.openingHours || '',
        googleMapUrl: store.googleMapUrl || '',
        instagramUrl: store.instagramUrl || '',
        tagNames: Array.isArray(store.tags) ? store.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : [],
        description: ''
      })
      setExistingPhotos(store.photos || [])
    }
  }, [store])

  // 載入可用標籤
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await storesAPI.getTags()
        setAvailableTags(response.map((tag: any) => tag.name))
      } catch (error) {
        console.error('載入標籤失敗:', error)
      }
    }
    loadTags()
  }, [])

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }))
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
    const files = event.target.files
    if (files) {
      const newPhotos = Array.from(files).slice(0, 5 - photos.length)
      setPhotos(prev => [...prev, ...newPhotos])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingPhoto = async (photoId: string) => {
    if (!store) return
    
    try {
      await storesAPI.deleteStorePhoto(store.id, photoId)
      setExistingPhotos(prev => prev.filter(photo => photo.id !== photoId))
    } catch (error) {
      console.error('刪除照片失敗:', error)
    }
  }

  const handleSubmit = async () => {
    if (!store) return

    setIsSubmitting(true)
    setError('')

    try {
      // 上傳新照片
      let photoIds: string[] = []
      if (photos.length > 0) {
        const uploadPromises = photos.map(async (photo) => {
          const uploadFormData = new FormData()
          uploadFormData.append('file', photo)
          const response = await mediaAPI.upload(uploadFormData)
          return response.id
        })
        photoIds = await Promise.all(uploadPromises)
      }

      // 更新店家資料
      const updatedStore = await storesAPI.updateStore(store.id, {
        name: formData.name,
        address: formData.address,
        openingHours: formData.openingHours,
        googleMapUrl: formData.googleMapUrl,
        instagramUrl: formData.instagramUrl,
        tagNames: formData.tagNames,
        description: formData.description,
        mainPhotoId: photoIds.length > 0 ? photoIds[0] : undefined // 使用第一張照片作為主要照片
      })

      // 新增照片到店家相簿
      for (const photoId of photoIds) {
        await storesAPI.addStorePhoto(store.id, {
          mediaId: photoId,
          caption: '',
          order: existingPhotos.length + photoIds.indexOf(photoId)
        })
      }

      // 重新載入完整的店家資料（包括新上傳的照片）
      const fullStoreData = await storesAPI.getStore(store.id)
      onStoreUpdated(fullStoreData)
      onClose()
    } catch (err: any) {
      setError(err.message || '更新店家失敗')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      address: '',
      openingHours: '',
      googleMapUrl: '',
      instagramUrl: '',
      tagNames: [],
      description: ''
    })
    setPhotos([])
    setCustomTag('')
    setError('')
    onClose()
  }

  if (!store) return null

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
            編輯店家資料
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
              {error}
            </Alert>
          )}

          {/* 基本資訊 */}
          <Box>
            <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600, mb: 2 }}>
              基本資訊
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="店家名稱"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  fullWidth
                  required
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="地址"
                  value={formData.address}
                  onChange={handleInputChange('address')}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="營業時間"
                  value={formData.openingHours}
                  onChange={handleInputChange('openingHours')}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="例：週一至週五 10:00-22:00&#10;週六至週日 09:00-23:00"
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* 外部連結 */}
          <Box>
            <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600, mb: 2 }}>
              外部連結
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Google Maps 連結"
                  value={formData.googleMapUrl}
                  onChange={handleInputChange('googleMapUrl')}
                  fullWidth
                  placeholder="https://maps.google.com/..."
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Instagram 連結"
                  value={formData.instagramUrl}
                  onChange={handleInputChange('instagramUrl')}
                  fullWidth
                  placeholder="https://instagram.com/..."
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* 標籤 */}
          <Box>
            <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600, mb: 2 }}>
              標籤
            </Typography>
            <FormControl fullWidth>
              <InputLabel sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>選擇標籤</InputLabel>
              <Select
                multiple
                value={formData.tagNames}
                onChange={handleTagChange}
                input={<OutlinedInput label="選擇標籤" />}
                renderValue={(selected) => {
                  const selectedArray = Array.isArray(selected) ? selected : []
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedArray.map((value, index) => {
                        const displayValue = typeof value === 'string' ? value : (value?.name || String(value))
                        return (
                          <Chip 
                            key={`${displayValue}-${index}`} 
                            label={displayValue} 
                            size="small"
                            onDelete={() => handleRemoveTag(displayValue)}
                            sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                          />
                        )
                      })}
                    </Box>
                  )
                }}
              >
                {availableTags.map((tag) => (
                  <MenuItem key={tag} value={tag} sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 自訂標籤 */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                label="新增自訂標籤"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, fontFamily: '"Noto Sans TC", sans-serif' }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
              />
              <Button
                variant="outlined"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
                sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
              >
                新增
              </Button>
            </Box>
          </Box>

          <Divider />

          {/* 照片管理 */}
          <Box>
            <Typography variant="h6" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600, mb: 2 }}>
              照片管理
            </Typography>

            {/* 現有照片 */}
            {existingPhotos.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontFamily: '"Noto Sans TC", sans-serif', mb: 1 }}>
                  現有照片
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {existingPhotos.map((photo) => (
                    <Box key={photo.id} sx={{ position: 'relative' }}>
                      <img
                        src={mediaAPI.getImageUrl(photo.mediaId)}
                        alt={photo.caption || '店家照片'}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          objectFit: 'cover',
                          border: '1px solid #E8E0D6'
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveExistingPhoto(photo.id)}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: 'error.main',
                          color: 'white',
                          width: 20,
                          height: 20,
                          '&:hover': {
                            backgroundColor: 'error.dark'
                          }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* 新增照片 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontFamily: '"Noto Sans TC", sans-serif', mb: 1 }}>
                新增照片
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => document.getElementById('photo-upload')?.click()}
                disabled={photos.length >= 5}
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
                上傳照片 ({photos.length}/5)
              </Button>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />

              {/* 照片預覽 */}
              {photos.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {photos.map((photo, index) => (
                    <Box key={index} sx={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`預覽 ${index + 1}`}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 8,
                          objectFit: 'cover',
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
                          backgroundColor: 'error.main',
                          color: 'white',
                          width: 20,
                          height: 20,
                          '&:hover': {
                            backgroundColor: 'error.dark'
                          }
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

          {/* 編輯說明 */}
          <Box>
            <TextField
              label="編輯說明"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              multiline
              rows={2}
              placeholder="請說明這次編輯的內容..."
              sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={isSubmitting} sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.name.trim() || isSubmitting}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': {
              backgroundColor: '#1F4A33'
            }
          }}
        >
          {isSubmitting ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              更新中...
            </Box>
          ) : (
            '更新店家'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditStoreDialog
