import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Typography,
  Box,
  IconButton,
  Alert
} from '@mui/material'
import { Close, PhotoCamera } from '@mui/icons-material'
import { Store, VisitRecord } from '../../types'

interface AddVisitDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (record: Omit<VisitRecord, 'id'>) => void
  stores: Store[]
}

const AddVisitDialog: React.FC<AddVisitDialogProps> = ({
  open,
  onClose,
  onAdd,
  stores
}) => {
  const [formData, setFormData] = useState({
    storeId: '',
    date: new Date().toISOString().split('T')[0], // 今天日期
    rating: 5,
    review: '',
    photos: [] as string[]
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const handleSubmit = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.storeId) {
      newErrors.storeId = '請選擇店家'
    }
    if (!formData.date) {
      newErrors.date = '請選擇造訪日期'
    }
    if (!formData.review.trim()) {
      newErrors.review = '請填寫造訪心得'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      onAdd({
        storeId: formData.storeId,
        date: formData.date,
        rating: formData.rating,
        review: formData.review.trim(),
        photos: formData.photos
      })
      
      // 重置表單
      setFormData({
        storeId: '',
        date: new Date().toISOString().split('T')[0],
        rating: 5,
        review: '',
        photos: []
      })
      setErrors({})
      onClose()
    }
  }

  const handleClose = () => {
    setFormData({
      storeId: '',
      date: new Date().toISOString().split('T')[0],
      rating: 5,
      review: '',
      photos: []
    })
    setErrors({})
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
            新增造訪紀錄
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* 選擇店家 */}
          <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.storeId}>
            <InputLabel>選擇店家</InputLabel>
            <Select
              value={formData.storeId}
              onChange={(e) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
              label="選擇店家"
              sx={{ borderRadius: 2 }}
            >
              {stores.map(store => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
            {errors.storeId && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                {errors.storeId}
              </Typography>
            )}
          </FormControl>

          {/* 造訪日期 */}
          <TextField
            fullWidth
            label="造訪日期"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 3, borderRadius: 2 }}
            error={!!errors.date}
            helperText={errors.date}
          />

          {/* 評分 */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontFamily: '"Noto Sans TC", sans-serif',
                fontWeight: 600,
                mb: 1
              }}
            >
              評分
            </Typography>
            <Rating
              value={formData.rating}
              onChange={(event, newValue) => {
                if (newValue !== null) {
                  setFormData(prev => ({ ...prev, rating: newValue }))
                }
              }}
              size="large"
            />
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#666666',
                fontFamily: '"Noto Sans TC", sans-serif',
                mt: 1
              }}
            >
              {formData.rating}/5 分
            </Typography>
          </Box>

          {/* 造訪心得 */}
          <TextField
            fullWidth
            label="造訪心得"
            multiline
            rows={4}
            value={formData.review}
            onChange={(e) => setFormData(prev => ({ ...prev, review: e.target.value }))}
            placeholder="分享您的造訪體驗..."
            sx={{ mb: 3, borderRadius: 2 }}
            error={!!errors.review}
            helperText={errors.review}
          />

          {/* 照片上傳 */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontFamily: '"Noto Sans TC", sans-serif',
                fontWeight: 600,
                mb: 1
              }}
            >
              照片（選填）
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PhotoCamera />}
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
              上傳照片
            </Button>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#999999',
                fontFamily: '"Noto Sans TC", sans-serif',
                ml: 2
              }}
            >
              最多可上傳 5 張照片
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleClose}
          sx={{
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif',
            mr: 2
          }}
        >
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            fontWeight: 600,
            px: 3,
            '&:hover': { backgroundColor: '#1F4A33' }
          }}
        >
          新增紀錄
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddVisitDialog

