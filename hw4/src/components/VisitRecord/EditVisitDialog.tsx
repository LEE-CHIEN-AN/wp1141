import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Rating,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { Close, AddPhotoAlternate, Delete } from '@mui/icons-material'
import { VisitRecord } from '../../types'
import { mediaAPI } from '../../services/api'

interface EditVisitDialogProps {
  open: boolean
  onClose: () => void
  onSave: (visitId: string, data: {
    date: string
    rating: number
    note?: string
    photoIds?: string[]
  }) => Promise<void>
  visitRecord: VisitRecord | null
}

const EditVisitDialog: React.FC<EditVisitDialogProps> = ({
  open,
  onClose,
  onSave,
  visitRecord
}) => {
  const [formData, setFormData] = useState({
    date: '',
    rating: 5,
    note: '',
    photos: [] as { file: File; preview: string; id?: string }[]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 當對話框開啟時，初始化表單資料
  useEffect(() => {
    if (visitRecord && open) {
      setFormData({
        date: visitRecord.date,
        rating: visitRecord.rating,
        note: visitRecord.note || '',
        photos: [] // 暫時不處理現有照片，可以後續擴展
      })
      setError('')
    }
  }, [visitRecord, open])

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }))
    if (error) setError('')
  }

  const handleRatingChange = (event: React.SyntheticEvent, newValue: number | null) => {
    if (newValue !== null) {
      setFormData(prev => ({ ...prev, rating: newValue }))
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newPhotos: { file: File; preview: string }[] = []

    for (const file of files) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('只允許上傳 JPG 或 PNG 格式的圖片')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('單張圖片大小不能超過 5MB')
        return
      }
      newPhotos.push({ file, preview: URL.createObjectURL(file) })
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }))
    setError('')
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToRemove)
    }))
  }

  const handleSubmit = async () => {
    if (!visitRecord) return

    setIsLoading(true)
    setError('')

    try {
      let photoIds: string[] = []

      // 上傳新照片
      for (const photo of formData.photos) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', photo.file)
        const uploadedMedia = await mediaAPI.upload(uploadFormData)
        photoIds.push(uploadedMedia.id)
      }

      await onSave(visitRecord.id, {
        date: formData.date,
        rating: formData.rating,
        note: formData.note.trim() || undefined,
        photoIds: photoIds.length > 0 ? photoIds : undefined
      })

      onClose()
    } catch (err: any) {
      setError(err.message || '更新造訪紀錄失敗')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: '',
      rating: 5,
      note: '',
      photos: []
    })
    setError('')
    setIsLoading(false)
    onClose()
  }

  if (!visitRecord) return null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
            編輯造訪紀錄
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
              {error}
            </Alert>
          )}

          <TextField
            label="造訪日期"
            type="date"
            value={formData.date}
            onChange={handleInputChange('date')}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontFamily: '"Noto Sans TC", sans-serif' }}>
              評分
            </Typography>
            <Rating
              value={formData.rating}
              onChange={handleRatingChange}
              size="large"
              sx={{ '& .MuiRating-icon': { color: '#F4A261' } }}
            />
          </Box>

          <TextField
            label="心得"
            value={formData.note}
            onChange={handleInputChange('note')}
            fullWidth
            multiline
            rows={4}
            placeholder="分享你的造訪心得..."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          {/* 照片上傳 */}
          <Box sx={{ border: '1px dashed #E8E0D6', borderRadius: 2, p: 2, textAlign: 'center' }}>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="photo-upload"
            />
            <Button
              variant="outlined"
              startIcon={<AddPhotoAlternate />}
              onClick={() => document.getElementById('photo-upload')?.click()}
              sx={{
                borderColor: '#2F6F4E',
                color: '#2F6F4E',
                fontFamily: '"Noto Sans TC", sans-serif',
                '&:hover': { backgroundColor: '#FAF5EF' },
                mb: 1
              }}
            >
              上傳照片 ({formData.photos.length})
            </Button>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, justifyContent: 'center' }}>
              {formData.photos.map((photo, index) => (
                <Box key={index} sx={{ position: 'relative', width: 80, height: 80, borderRadius: 1, overflow: 'hidden' }}>
                  <img
                    src={photo.preview}
                    alt={`預覽 ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemovePhoto(index)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' }
                    }}
                  >
                    <Delete sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={isLoading} sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.date || isLoading}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': { backgroundColor: '#1F4A33' }
          }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : '儲存變更'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditVisitDialog