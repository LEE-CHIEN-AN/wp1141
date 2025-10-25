import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Divider,
  Grid,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Person
} from '@mui/icons-material'
import { User } from '../types'
import { useFavorites } from '../hooks/useFavorites'

interface UserProfilePageProps {
  user: User | null
  onUpdateProfile: (updatedUser: Partial<User>) => void
  isLoading?: boolean
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({
  user,
  onUpdateProfile,
  isLoading = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    avatar: user?.avatar || '',
    status: user?.status || ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // 使用收藏 Hook
  const { favorites } = useFavorites(!!user)

  const handleEdit = () => {
    setIsEditing(true)
    setFormData({
      nickname: user?.nickname || '',
      avatar: user?.avatar || '',
      status: user?.status || ''
    })
    setErrors({})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      nickname: user?.nickname || '',
      avatar: user?.avatar || '',
      status: user?.status || ''
    })
    setErrors({})
    setAvatarPreview(null)
  }

  const handleSave = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.nickname.trim()) {
      newErrors.nickname = '暱稱不能為空'
    }

    if (formData.nickname.length > 20) {
      newErrors.nickname = '暱稱不能超過 20 個字'
    }

    if (formData.status && formData.status.length > 100) {
      newErrors.status = '狀態不能超過 100 個字'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      onUpdateProfile({
        nickname: formData.nickname.trim(),
        avatar: avatarPreview || formData.avatar,
        status: formData.status.trim()
      })
      setIsEditing(false)
      setAvatarPreview(null)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setAvatarPreview(result)
        setFormData(prev => ({ ...prev, avatar: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
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

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          無法載入使用者資料
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
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
          個人資料
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif'
          }}
        >
          管理您的個人資訊和設定
        </Typography>
      </Box>

      {/* 個人資料卡片 */}
      <Card sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={6}>
            {/* 左側：頭像區域 */}
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', pr: { md: 2 } }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    fontFamily: '"Noto Sans TC", sans-serif',
                    mb: 2
                  }}
                >
                  頭像
                </Typography>
                
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 100,
                      height: 100,
                      fontSize: 40,
                      backgroundColor: '#2F6F4E',
                      border: '3px solid #FAF5EF',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                    }}
                    src={avatarPreview || (user.avatar && user.avatar.startsWith('data:') ? user.avatar : undefined)}
                  >
                    {!avatarPreview && !user.avatar && <Person sx={{ fontSize: 40 }} />}
                    {!avatarPreview && user.avatar && !user.avatar.startsWith('data:') && user.avatar}
                  </Avatar>
                  
                  {isEditing && (
                    <IconButton
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        backgroundColor: '#2F6F4E',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: '#1F4A33'
                        }
                      }}
                      component="label"
                    >
                      <PhotoCamera />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                      />
                    </IconButton>
                  )}
                </Box>

                {isEditing && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#999999',
                      fontFamily: '"Noto Sans TC", sans-serif',
                      display: 'block'
                    }}
                  >
                    點擊相機圖示更換頭像
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* 右側：個人資訊 */}
            <Grid item xs={12} md={8}>
              <Box sx={{ pl: { md: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      fontFamily: '"Noto Sans TC", sans-serif'
                    }}
                  >
                    基本資訊
                  </Typography>
                  
                  {!isEditing ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={handleEdit}
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
                    編輯
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      sx={{
                        borderColor: '#666666',
                        color: '#666666',
                        fontFamily: '"Noto Sans TC", sans-serif',
                        '&:hover': {
                          borderColor: '#333333',
                          backgroundColor: '#F5F5F5'
                        }
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      sx={{
                        backgroundColor: '#2F6F4E',
                        fontFamily: '"Noto Sans TC", sans-serif',
                        '&:hover': {
                          backgroundColor: '#1F4A33'
                        }
                      }}
                    >
                      儲存
                    </Button>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 使用者名稱 */}
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      fontFamily: '"Noto Sans TC", sans-serif',
                      color: '#333333',
                      mb: 1
                    }}
                  >
                    使用者名稱
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#666666',
                      fontFamily: '"Noto Sans TC", sans-serif',
                      backgroundColor: '#F5F5F5',
                      p: 1.5,
                      borderRadius: 1
                    }}
                  >
                    {user.nickname || user.username}
                  </Typography>
                </Box>

                {/* Email */}
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      fontFamily: '"Noto Sans TC", sans-serif',
                      color: '#333333',
                      mb: 1
                    }}
                  >
                    Email
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#666666',
                      fontFamily: '"Noto Sans TC", sans-serif',
                      backgroundColor: '#F5F5F5',
                      p: 1.5,
                      borderRadius: 1
                    }}
                  >
                    {user.email}
                  </Typography>
                </Box>

                {/* 暱稱 */}
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      fontFamily: '"Noto Sans TC", sans-serif',
                      color: '#333333',
                      mb: 1
                    }}
                  >
                    暱稱
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      value={formData.nickname}
                      onChange={(e) => handleInputChange('nickname', e.target.value)}
                      placeholder="請輸入暱稱"
                      error={!!errors.nickname}
                      helperText={errors.nickname}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#333333',
                        fontFamily: '"Noto Sans TC", sans-serif',
                        backgroundColor: '#FAF5EF',
                        p: 1.5,
                        borderRadius: 1,
                        minHeight: 56
                      }}
                    >
                      {user.nickname || '未設定'}
                    </Typography>
                  )}
                </Box>

                {/* 個人狀態 */}
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      fontWeight: 600,
                      fontFamily: '"Noto Sans TC", sans-serif',
                      color: '#333333',
                      mb: 1
                    }}
                  >
                    個人狀態
                  </Typography>
                  {isEditing ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      placeholder="分享您的心情或狀態..."
                      error={!!errors.status}
                      helperText={errors.status}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  ) : (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#333333',
                        fontFamily: '"Noto Sans TC", sans-serif',
                        backgroundColor: '#FAF5EF',
                        p: 1.5,
                        borderRadius: 1,
                        minHeight: 80,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {user.status || '未設定'}
                    </Typography>
                  )}
                </Box>
              </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 統計資訊卡片 */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              fontFamily: '"Noto Sans TC", sans-serif',
              mb: 3
            }}
          >
            統計資訊
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#2F6F4E',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  {favorites.length}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#666666',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  收藏店家
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#F4A261',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  {0}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#666666',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  造訪紀錄
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#2F6F4E',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  {0}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#666666',
                    fontFamily: '"Noto Sans TC", sans-serif'
                  }}
                >
                  平均評分
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}

export default UserProfilePage
