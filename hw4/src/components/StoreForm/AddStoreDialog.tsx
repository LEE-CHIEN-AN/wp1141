import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  IconButton,
  Alert,
  LinearProgress
} from '@mui/material'
import {
  Close,
  CloudUpload,
  Delete,
  Add
} from '@mui/icons-material'
import { Store } from '../../types'
import { mediaAPI } from '../../services/api'

interface AddStoreDialogProps {
  open: boolean
  onClose: () => void
  onAddStore: (storeData: Omit<Store, 'id' | 'avgRating' | 'visitCount' | 'isFavorite' | 'createdAt' | 'updatedAt'>) => void
  coordinates: { lat: number; lng: number } | null
}

const AddStoreDialog: React.FC<AddStoreDialogProps> = ({
  open,
  onClose,
  onAddStore,
  coordinates
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    openingHours: '',
    googleMapUrl: '',
    instagramUrl: '',
    tagNames: [] as string[],
    photos: [] as File[]
  })

  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableTags = ['復古', '台灣', '文創', '咖啡', '書店', '藝術', '展覽', '手作', '傳統', '小吃', '工藝', '原住民']

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }))
    // 清除錯誤訊息
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleTagAdd = () => {
    if (newTag.trim() && !formData.tagNames.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tagNames: [...prev.tagNames, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tagNames: prev.tagNames.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleTagSelect = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[]
    setFormData(prev => ({
      ...prev,
      tagNames: value
    }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'image/jpeg' || file.type === 'image/png'
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isValidType && isValidSize
    })

    if (validFiles.length !== files.length) {
      setErrors(prev => ({
        ...prev,
        photos: '只能上傳 JPG/PNG 格式的圖片，且單檔大小不超過 5MB'
      }))
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles].slice(0, 10) // 最多 10 張
    }))
  }

  const handleFileRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = '店名為必填欄位'
    }

    if (formData.photos.length > 10) {
      newErrors.photos = '最多只能上傳 10 張照片'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !coordinates) return

    setIsSubmitting(true)
    try {
      // 上傳照片
      const photoIds: string[] = []
      for (const photo of formData.photos) {
        const formData = new FormData()
        formData.append('file', photo)
        
        const response = await mediaAPI.upload(formData)
        photoIds.push(response.id)
      }

      // 建立商店資料
      const storeData: Omit<Store, 'id' | 'avgRating' | 'visitCount' | 'isFavorite' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        lat: coordinates.lat,
        lng: coordinates.lng,
        openingHours: formData.openingHours.trim() || undefined,
        googleMapUrl: formData.googleMapUrl.trim() || undefined,
        instagramUrl: formData.instagramUrl.trim() || undefined,
        mainPhotoId: photoIds[0] || undefined,
        photos: photoIds.map((id, index) => ({
          id: `${Date.now()}-${index}`,
          storeId: '',
          mediaId: id,
          caption: '',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      }

      onAddStore(storeData)
      handleClose()
    } catch (error: any) {
      setErrors(prev => ({
        ...prev,
        submit: error.message || '新增店家失敗'
      }))
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
      photos: []
    })
    setNewTag('')
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
            新增店家
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {isSubmitting && <LinearProgress sx={{ mb: 2 }} />}
          
          {errors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.submit}
            </Alert>
          )}

          {/* 座標顯示 */}
          {coordinates && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                座標: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </Typography>
            </Alert>
          )}

          {/* 店名 */}
          <TextField
            label="店名 *"
            value={formData.name}
            onChange={handleInputChange('name')}
            fullWidth
            required
            error={!!errors.name}
            helperText={errors.name}
            sx={{ mb: 3 }}
          />

          {/* 地址 */}
          <TextField
            label="地址"
            value={formData.address}
            onChange={handleInputChange('address')}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 3 }}
          />

          {/* 營業時間 */}
          <TextField
            label="營業時間"
            value={formData.openingHours}
            onChange={handleInputChange('openingHours')}
            fullWidth
            multiline
            rows={3}
            placeholder="例：週一至週五 09:00-18:00&#10;週六 10:00-16:00&#10;週日 休息"
            sx={{ mb: 3 }}
          />

          {/* 照片上傳 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              店家照片 (最多 10 張)
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {formData.photos.map((photo, index) => (
                <Box key={index} sx={{ position: 'relative' }}>
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`預覽 ${index + 1}`}
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '2px solid #E8E0D6'
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleFileRemove(index)}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#F4A261',
                      color: 'white',
                      '&:hover': { backgroundColor: '#E8914A' }
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              
              {formData.photos.length < 10 && (
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    border: '2px dashed #E8E0D6',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#2F6F4E' }
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <CloudUpload sx={{ color: '#666666', mb: 1 }} />
                    <Typography variant="caption" sx={{ color: '#666666' }}>
                      上傳照片
                    </Typography>
                  </label>
                </Box>
              )}
            </Box>
            
            {errors.photos && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {errors.photos}
              </Typography>
            )}
          </Box>

          {/* 標籤選擇 */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>標籤</InputLabel>
            <Select
              multiple
              value={formData.tagNames}
              onChange={handleTagSelect}
              input={<OutlinedInput label="標籤" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 新增自訂標籤 */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
            <TextField
              label="新增自訂標籤"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              size="small"
              onKeyPress={(e) => e.key === 'Enter' && handleTagAdd()}
              sx={{ flex: 1 }}
            />
            <Button 
              onClick={handleTagAdd} 
              variant="outlined" 
              size="small"
              startIcon={<Add />}
            >
              新增
            </Button>
          </Box>

          {/* 已選標籤 */}
          {formData.tagNames.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                已選標籤:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {formData.tagNames.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleTagRemove(tag)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Google Maps 連結 */}
          <TextField
            label="Google Maps 連結"
            value={formData.googleMapUrl}
            onChange={handleInputChange('googleMapUrl')}
            fullWidth
            placeholder="https://maps.google.com/?q=..."
            sx={{ mb: 3 }}
          />

          {/* Instagram 連結 */}
          <TextField
            label="Instagram 連結"
            value={formData.instagramUrl}
            onChange={handleInputChange('instagramUrl')}
            fullWidth
            placeholder="https://instagram.com/..."
            sx={{ mb: 3 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleClose}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!formData.name.trim() || isSubmitting}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': { backgroundColor: '#1F4A33' }
          }}
        >
          {isSubmitting ? '新增中...' : '新增店家'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddStoreDialog