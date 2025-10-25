import React, { useState, useMemo } from 'react'
import { Box, IconButton, CardMedia } from '@mui/material'
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { mediaAPI } from '../../services/api'

interface ImageCarouselProps {
  images: string[] // mediaId 陣列
  mainPhotoId?: string // 主要照片 ID
  height?: number
  alt?: string
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  mainPhotoId,
  height = 300, 
  alt = '店家照片' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 合併主要照片和相簿照片
  const allImages = React.useMemo(() => {
    const imageList = [...images]
    
    // 如果有主要照片且不在相簿中，則加入
    if (mainPhotoId && !imageList.includes(mainPhotoId)) {
      imageList.unshift(mainPhotoId)
    }
    
    return imageList
  }, [images, mainPhotoId])

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? allImages.length - 1 : prevIndex - 1
    )
  }

  const handleNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === allImages.length - 1 ? 0 : prevIndex + 1
    )
  }

  if (!allImages || allImages.length === 0) {
    return (
      <Box
        sx={{
          height,
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px 12px 0 0',
          border: '2px dashed #ddd'
        }}
      >
        <Box sx={{ textAlign: 'center', color: '#999' }}>
          <Box sx={{ fontSize: '48px', mb: 1 }}>📷</Box>
          <Box sx={{ fontSize: '14px', fontFamily: '"Noto Sans TC", sans-serif' }}>
            暫無照片
          </Box>
        </Box>
      </Box>
    )
  }

  if (allImages.length === 1) {
    return (
      <CardMedia
        component="img"
        height={height}
        image={mediaAPI.getImageUrl(allImages[0])}
        alt={alt}
        sx={{ borderRadius: '12px 12px 0 0' }}
      />
    )
  }

  return (
    <Box sx={{ position: 'relative', height }}>
      <CardMedia
        component="img"
        height={height}
        image={mediaAPI.getImageUrl(allImages[currentIndex])}
        alt={`${alt} ${currentIndex + 1}`}
        sx={{ borderRadius: '12px 12px 0 0' }}
      />
      
      {/* 左箭頭 */}
      <IconButton
        onClick={handlePrevious}
        sx={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }
        }}
      >
        <ChevronLeft />
      </IconButton>

      {/* 右箭頭 */}
      <IconButton
        onClick={handleNext}
        sx={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }
        }}
      >
        <ChevronRight />
      </IconButton>

      {/* 照片指示器 */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 1
        }}
      >
        {images.map((_, index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </Box>

      {/* 照片計數 */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '12px',
          fontFamily: '"Noto Sans TC", sans-serif'
        }}
      >
        {currentIndex + 1} / {images.length}
      </Box>
    </Box>
  )
}

export default ImageCarousel

