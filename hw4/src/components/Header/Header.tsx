import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  InputAdornment,
  CircularProgress,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import {
  Search,
  Clear,
  Add,
  Login,
  Favorite,
  History,
  Logout,
  Person
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { User } from '../../types'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearchSubmit: () => void
  isSearching: boolean
  onAddStore: () => void
  user: User | null
  onLogin: () => void
  onLogout: () => Promise<void>
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  onAddStore,
  user,
  onLogin,
  onLogout
}) => {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleBrandClick = () => {
    navigate('/')
  }

  const handleFavoritesClick = () => {
    navigate('/favorites')
    handleClose()
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSearchSubmit()
    }
  }

  const handleClearSearch = () => {
    onSearchChange('')
  }

  return (
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(47, 111, 78, 0.1)'
      }}
    >
      <Toolbar sx={{ px: 3 }}>
        {/* 品牌區域 */}
        <Typography
          variant="h5"
          component="div"
          onClick={handleBrandClick}
          sx={{
            fontWeight: 700,
            color: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            cursor: 'pointer',
            mr: 4,
            '&:hover': {
              color: '#1F4A33'
            }
          }}
        >
          台灣選物店地圖清單
        </Typography>

        {/* 主要搜尋 */}
        <Box sx={{ flexGrow: 1, maxWidth: 600, mx: 3 }}>
          <TextField
            fullWidth
            placeholder="搜尋店名或地址（例：中西區、赤峰街…）"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isSearching ? (
                    <CircularProgress size={20} sx={{ color: '#666666' }} />
                  ) : (
                    <Search sx={{ color: '#666666' }} />
                  )}
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClearSearch}
                    size="small"
                    sx={{ color: '#666666' }}
                  >
                    <Clear />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#FAF5EF',
                '&:hover': {
                  backgroundColor: '#F5F0E8'
                },
                '&.Mui-focused': {
                  backgroundColor: '#FFFFFF'
                }
              }
            }}
          />
        </Box>

        {/* 新增店家按鈕 */}
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddStore}
          sx={{
            backgroundColor: '#2F6F4E',
            fontFamily: '"Noto Sans TC", sans-serif',
            fontWeight: 600,
            mr: 2,
            borderRadius: 2,
            px: 3,
            '&:hover': {
              backgroundColor: '#1F4A33'
            }
          }}
        >
          新增店家
        </Button>

        {/* 使用者區域 */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${user.nickname || user.username}`}
              avatar={<Avatar sx={{ backgroundColor: '#2F6F4E' }}>{(user.nickname || user.username).charAt(0)}</Avatar>}
              sx={{
                backgroundColor: '#FAF5EF',
                color: '#2F6F4E',
                border: '1px solid #E8E0D6',
                fontWeight: 500,
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#F5F0E8'
                }
              }}
              onClick={handleClick}
            />
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  mt: 1,
                  minWidth: 200
                }
              }}
            >
              <MenuItem onClick={handleFavoritesClick}>
                <ListItemIcon>
                  <Favorite sx={{ color: '#2F6F4E' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="我的收藏"
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontFamily: '"Noto Sans TC", sans-serif',
                      fontWeight: 500
                    }
                  }}
                />
              </MenuItem>
              <MenuItem onClick={() => { navigate('/visits'); handleClose(); }}>
                <ListItemIcon>
                  <History sx={{ color: '#2F6F4E' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="我的造訪紀錄"
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontFamily: '"Noto Sans TC", sans-serif',
                      fontWeight: 500
                    }
                  }}
                />
              </MenuItem>
              <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
                <ListItemIcon>
                  <Person sx={{ color: '#2F6F4E' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="個人資料"
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontFamily: '"Noto Sans TC", sans-serif',
                      fontWeight: 500
                    }
                  }}
                />
              </MenuItem>
              <MenuItem onClick={() => { onLogout(); handleClose(); }}>
                <ListItemIcon>
                  <Logout sx={{ color: '#2F6F4E' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="登出"
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontFamily: '"Noto Sans TC", sans-serif',
                      fontWeight: 500
                    }
                  }}
                />
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<Login />}
            onClick={onLogin}
            sx={{
              borderColor: '#2F6F4E',
              color: '#2F6F4E',
              fontFamily: '"Noto Sans TC", sans-serif',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              '&:hover': {
                borderColor: '#1F4A33',
                backgroundColor: '#FAF5EF'
              }
            }}
          >
            登入
          </Button>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Header