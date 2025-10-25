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
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert
} from '@mui/material'
import { Visibility, VisibilityOff, Close } from '@mui/icons-material'
import RegisterForm from './RegisterForm'

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<boolean>
  onRegister: (data: RegisterData) => Promise<boolean>
}

interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

const AuthDialog: React.FC<AuthDialogProps> = ({
  open,
  onClose,
  onLogin,
  onRegister
}) => {
  const [tabValue, setTabValue] = useState(0)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue)
    setError('')
    setLoginData({ email: '', password: '' })
  }

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const success = await onLogin(loginData.email, loginData.password)
      if (success) {
        onClose()
      }
    } catch (error: any) {
      setError(error.message || '登入失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && tabValue === 0) {
      handleLoginSubmit(event)
    }
  }

  return (
    <>
      {/* 登入對話框 */}
      <Dialog 
        open={open && tabValue === 0} 
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
              登入
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box component="form" onSubmit={handleLoginSubmit} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
              onKeyPress={handleKeyPress}
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />

            <TextField
              fullWidth
              label="密碼"
              type={showPassword ? 'text' : 'password'}
              value={loginData.password}
              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
              onKeyPress={handleKeyPress}
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
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, flexDirection: 'column', gap: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleLoginSubmit}
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
                <span>登入中...</span>
              </Box>
            ) : (
              '登入'
            )}
          </Button>

          <Typography 
            variant="body2" 
            sx={{ 
              color: '#666666',
              fontFamily: '"Noto Sans TC", sans-serif',
              textAlign: 'center'
            }}
          >
            還沒有帳號？{' '}
            <Button
              variant="text"
              onClick={() => handleTabChange(1)}
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
              建立帳號
            </Button>
          </Typography>
        </DialogActions>
      </Dialog>

      {/* 註冊對話框 */}
      <RegisterForm
        open={open && tabValue === 1}
        onClose={onClose}
        onRegister={onRegister}
        onSwitchToLogin={() => handleTabChange(0)}
      />
    </>
  )
}

export default AuthDialog