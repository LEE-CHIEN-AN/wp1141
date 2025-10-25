import React, { useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  IconButton,
  CardMedia,
  Alert
} from '@mui/material'
import { PhotoCamera, Delete } from '@mui/icons-material'
import { mediaAPI } from '../../services/api'

interface PhotoUploadProps {
  photos: string[] // 現在是 mediaId 陣列
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newPhotos: string[] = []
    const remainingSlots = maxPhotos - photos.length

    // 限制上傳數量
    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    
    if (filesToProcess.length === 0) {
      return
    }

    setIsUploading(true)

    try {
      // 上傳檔案到伺服器
      for (const file of filesToProcess) {
        if (file.type.startsWith('image/')) {
          const uploadFormData = new FormData()
          uploadFormData.append('file', file)
          const uploadedMedia = await mediaAPI.upload(uploadFormData)
          newPhotos.push(uploadedMedia.id)
        }
      }
      
      // 更新照片列表
      onPhotosChange([...photos, ...newPhotos])
    } catch (error: any) {
      console.error('上傳失敗:', error)
      // 這裡可以顯示錯誤訊息
    } finally {
      setIsUploading(false)
      // 清空檔案輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Box>
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
      
      {/* 上傳按鈕 */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<PhotoCamera />}
          onClick={handleUploadClick}
          disabled={isUploading || photos.length >= maxPhotos}
          sx={{
            borderColor: '#2F6F4E',
            color: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            '&:hover': {
              borderColor: '#1F4A33',
              backgroundColor: '#FAF5EF'
            },
            '&:disabled': {
              borderColor: '#E8E0D6',
              color: '#999999'
            }
          }}
        >
          {isUploading ? '上傳中...' : '上傳照片'}
        </Button>
        
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#999999',
            fontFamily: '"Noto Sans TC", sans-serif',
            ml: 2
          }}
        >
          最多可上傳 {maxPhotos} 張照片
        </Typography>
      </Box>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* 照片預覽 */}
      {photos.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {photos.map((photo, index) => (
            <Box key={index} sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 1,
                  objectFit: 'cover',
                  border: '1px solid #E8E0D6'
                }}
                image={mediaAPI.getImageUrl(photo)}
                alt={`上傳照片 ${index + 1}`}
              />
              <IconButton
                size="small"
                onClick={() => handleRemovePhoto(index)}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#F4A261',
                  color: 'white',
                  width: 20,
                  height: 20,
                  '&:hover': {
                    backgroundColor: '#E8924A'
                  }
                }}
              >
                <Delete sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* 上傳限制提示 */}
      {photos.length >= maxPhotos && (
        <Alert severity="info" sx={{ mb: 2 }}>
          已達到最大上傳數量限制
        </Alert>
      )}
    </Box>
  )
}

export default PhotoUpload
