import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  IconButton
} from '@mui/material'
import {
  Close,
  LocationOn,
  Search,
  AddLocation
} from '@mui/icons-material'

interface AddStoreMethodSelectorProps {
  open: boolean
  onClose: () => void
  onSelectMapClick: () => void
  onSelectSearch: () => void
}

const AddStoreMethodSelector: React.FC<AddStoreMethodSelectorProps> = ({
  open,
  onClose,
  onSelectMapClick,
  onSelectSearch
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700 }}>
            新增店家
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography 
          variant="body1" 
          sx={{ 
            fontFamily: '"Noto Sans TC", sans-serif',
            color: '#666666',
            mb: 3,
            textAlign: 'center'
          }}
        >
          請選擇新增店家的方式
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          {/* 方式一：地圖點選 */}
          <Card 
            sx={{ 
              flex: 1, 
              cursor: 'pointer',
              border: '2px solid transparent',
              '&:hover': { 
                border: '2px solid #2F6F4E',
                backgroundColor: '#FAF5EF'
              },
              transition: 'all 0.2s ease-in-out'
            }}
            onClick={onSelectMapClick}
          >
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 2,
                color: '#2F6F4E'
              }}>
                <AddLocation sx={{ fontSize: 48 }} />
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontWeight: 700,
                  color: '#333333',
                  mb: 1
                }}
              >
                地圖點選
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666',
                  lineHeight: 1.4
                }}
              >
                在地圖上點選店家位置，手動填寫店家資訊
              </Typography>
            </CardContent>
          </Card>

          {/* 方式二：搜尋店家 */}
          <Card 
            sx={{ 
              flex: 1, 
              cursor: 'pointer',
              border: '2px solid transparent',
              '&:hover': { 
                border: '2px solid #2F6F4E',
                backgroundColor: '#FAF5EF'
              },
              transition: 'all 0.2s ease-in-out'
            }}
            onClick={onSelectSearch}
          >
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 2,
                color: '#F4A261'
              }}>
                <Search sx={{ fontSize: 48 }} />
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontWeight: 700,
                  color: '#333333',
                  mb: 1
                }}
              >
                搜尋店家
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666',
                  lineHeight: 1.4
                }}
              >
                輸入店名或地址，自動獲取 Google 店家資訊
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
        <Button 
          onClick={onClose}
          sx={{ 
            fontFamily: '"Noto Sans TC", sans-serif',
            color: '#666666'
          }}
        >
          取消
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddStoreMethodSelector
