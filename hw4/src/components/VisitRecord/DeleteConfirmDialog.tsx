import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert
} from '@mui/material'
import { Close, Warning } from '@mui/icons-material'
import { VisitRecord } from '../../types'

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  record: VisitRecord | null
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  record
}) => {
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
            確認刪除
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert 
            severity="warning" 
            icon={<Warning />}
            sx={{ mb: 3 }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                fontFamily: '"Noto Sans TC", sans-serif',
                fontWeight: 600
              }}
            >
              此操作無法復原
            </Typography>
          </Alert>

          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#333333',
              mb: 2
            }}
          >
            您確定要刪除此造訪紀錄嗎？
          </Typography>

          {record && (
            <Box sx={{ 
              backgroundColor: '#FAF5EF', 
              borderRadius: 2, 
              p: 2,
              border: '1px solid #E8E0D6'
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  fontWeight: 600,
                  color: '#333333',
                  mb: 1
                }}
              >
                造訪紀錄詳情
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666',
                  mb: 0.5
                }}
              >
                造訪日期：{new Date(record.date).toLocaleDateString('zh-TW')}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666',
                  mb: 0.5
                }}
              >
                評分：{record.rating}/5 分
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: '"Noto Sans TC", sans-serif',
                  color: '#666666'
                }}
              >
                心得：{record.review.length > 50 ? 
                  record.review.substring(0, 50) + '...' : 
                  record.review
                }
              </Typography>
            </Box>
          )}

          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: '"Noto Sans TC", sans-serif',
              color: '#999999',
              mt: 2
            }}
          >
            刪除後，此造訪紀錄將從您的記錄中移除，並會重新計算店家的平均評分與造訪次數。
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={onClose}
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
          onClick={onConfirm}
          sx={{
            backgroundColor: '#F4A261',
            fontFamily: '"Noto Sans TC", sans-serif',
            fontWeight: 600,
            px: 3,
            '&:hover': { backgroundColor: '#E8914A' }
          }}
        >
          確認刪除
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmDialog

