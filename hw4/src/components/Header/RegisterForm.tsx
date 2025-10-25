import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  PhotoCamera,
  Close
} from '@mui/icons-material'

interface RegisterFormProps {
  open: boolean
  onClose: () => void
  onRegister: (data: RegisterData) => Promise<boolean>
  onSwitchToLogin: () => void
}

interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

interface FormErrors {
  username?: string
  email?: string
  password?: string
  confirmPassword?: string
  nickname?: string
  general?: string
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  open,
  onClose,
  onRegister,
  onSwitchToLogin
}) => {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    avatar: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 表單驗證
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 使用者名稱驗證
    if (!formData.username.trim()) {
      newErrors.username = '使用者名稱為必填欄位'
    } else if (formData.username.trim().length < 2) {
      newErrors.username = '使用者名稱至少需要 2 個字元'
    }

    // Email 驗證
    if (!formData.email.trim()) {
      newErrors.email = 'Email 為必填欄位'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '請輸入有效的 Email 格式'
    }

    // 密碼驗證
    if (!formData.password) {
      newErrors.password = '密碼為必填欄位'
    } else if (formData.password.length < 6) {
      newErrors.password = '密碼至少需要 6 個字元'
    }

    // 確認密碼驗證
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '確認密碼為必填欄位'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '確認密碼與密碼不一致'
    }

    // 暱稱驗證（選填）
    if (formData.nickname && formData.nickname.trim().length < 2) {
      newErrors.nickname = '暱稱至少需要 2 個字元'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 即時驗證
  const validateField = (field: keyof RegisterData, value: string) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'username':
        if (!value.trim()) {
          newErrors.username = '使用者名稱為必填欄位'
        } else if (value.trim().length < 2) {
          newErrors.username = '使用者名稱至少需要 2 個字元'
        } else {
          delete newErrors.username
        }
        break
      
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email 為必填欄位'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = '請輸入有效的 Email 格式'
        } else {
          delete newErrors.email
        }
        break
      
      case 'password':
        if (!value) {
          newErrors.password = '密碼為必填欄位'
        } else if (value.length < 6) {
          newErrors.password = '密碼至少需要 6 個字元'
        } else {
          delete newErrors.password
        }
        // 重新驗證確認密碼
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = '確認密碼與密碼不一致'
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword
        }
        break
      
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = '確認密碼為必填欄位'
        } else if (formData.password !== value) {
          newErrors.confirmPassword = '確認密碼與密碼不一致'
        } else {
          delete newErrors.confirmPassword
        }
        break
      
      case 'nickname':
        if (value && value.trim().length < 2) {
          newErrors.nickname = '暱稱至少需要 2 個字元'
        } else {
          delete newErrors.nickname
        }
        break
    }
    
    setErrors(newErrors)
  }

  // 處理表單輸入
  const handleInputChange = (field: keyof RegisterData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  // 處理圖片上傳
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 檢查檔案類型
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, general: '請選擇圖片檔案' }))
        return
      }

      // 檢查檔案大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, general: '圖片檔案大小不能超過 5MB' }))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setAvatarPreview(result)
        setFormData(prev => ({ ...prev, avatar: result }))
        setErrors(prev => ({ ...prev, general: undefined }))
      }
      reader.readAsDataURL(file)
    }
  }

  // 移除圖片
  const handleRemoveImage = () => {
    setAvatarPreview('')
    setFormData(prev => ({ ...prev, avatar: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 處理表單提交
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      const success = await onRegister(formData)
      if (success) {
        // 成功後重置表單
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          nickname: '',
          avatar: ''
        })
        setAvatarPreview('')
        onClose()
      }
    } catch (error) {
      setErrors({ general: '註冊失敗，請稍後再試' })
    } finally {
      setIsLoading(false)
    }
  }

  // 處理鍵盤事件
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit(event)
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
            建立帳號
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {/* 大頭貼上傳 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={avatarPreview}
              sx={{ 
                width: 80, 
                height: 80, 
                mb: 2,
                backgroundColor: '#2F6F4E',
                fontSize: '2rem'
              }}
            >
              {formData.username.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => fileInputRef.current?.click()}
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
              {avatarPreview && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleRemoveImage}
                  sx={{ fontFamily: '"Noto Sans TC", sans-serif' }}
                >
                  移除
                </Button>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </Box>

          {/* 一般錯誤訊息 */}
          {errors.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.general}
            </Alert>
          )}

          {/* 使用者名稱 */}
          <TextField
            fullWidth
            label="使用者名稱"
            value={formData.username}
            onChange={handleInputChange('username')}
            onKeyPress={handleKeyPress}
            error={!!errors.username}
            helperText={errors.username}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />

          {/* Email */}
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            onKeyPress={handleKeyPress}
            error={!!errors.email}
            helperText={errors.email}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />

          {/* 密碼 */}
          <TextField
            fullWidth
            label="密碼"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange('password')}
            onKeyPress={handleKeyPress}
            error={!!errors.password}
            helperText={errors.password}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />

          {/* 確認密碼 */}
          <TextField
            fullWidth
            label="確認密碼"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            onKeyPress={handleKeyPress}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />

          {/* 暱稱 */}
          <TextField
            fullWidth
            label="暱稱（選填）"
            value={formData.nickname}
            onChange={handleInputChange('nickname')}
            onKeyPress={handleKeyPress}
            error={!!errors.nickname}
            helperText={errors.nickname || '用於顯示的暱稱，可不填'}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading}
          size="large"
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            fontWeight: 600,
            py: 1.5,
            '&:hover': {
              backgroundColor: '#1F4A33'
            },
            '&:disabled': {
              backgroundColor: '#E8E0D6'
            }
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} sx={{ color: 'white' }} />
              <span>建立中...</span>
            </Box>
          ) : (
            '建立帳號'
          )}
        </Button>

        <Divider sx={{ width: '100%' }} />

        <Typography 
          variant="body2" 
          sx={{ 
            color: '#666666',
            fontFamily: '"Noto Sans TC", sans-serif',
            textAlign: 'center'
          }}
        >
          已有帳號？{' '}
          <Button
            variant="text"
            onClick={onSwitchToLogin}
            sx={{
              color: '#2F6F4E',
              fontFamily: '"Noto Sans TC", sans-serif',
              fontWeight: 500,
              textTransform: 'none',
              p: 0,
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: 'transparent',
                textDecoration: 'underline'
              }
            }}
          >
            前往登入
          </Button>
        </Typography>
      </DialogActions>
    </Dialog>
  )
}

export default RegisterForm

