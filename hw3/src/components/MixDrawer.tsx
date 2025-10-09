import React, { useState } from 'react'
import { 
  Drawer, 
  Box, 
  Typography, 
  Chip, 
  Button, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  IconButton,
  Fab,
  Badge
} from '@mui/material'
import { 
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { MixDrawerProps } from '../types'
import SoulReport from './SoulReport'

const MixDrawer: React.FC<MixDrawerProps> = ({ 
  selectedProducts, 
  onRemoveProduct,
  onReset,
  open: externalOpen,
  onToggle: externalOnToggle
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  
  // 使用外部控制或內部狀態
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const handleToggle = externalOnToggle || (() => setInternalOpen(!internalOpen))

  const handleCreateSoul = () => {
    setShowReport(true)
    if (externalOnToggle) {
      externalOnToggle() // 關閉外部控制的 drawer
    } else {
      setInternalOpen(false) // 關閉內部控制的 drawer
    }
  }

  const handleCloseReport = () => {
    setShowReport(false)
  }

  const handleReset = () => {
    onReset()
    setShowReport(false)
  }

  return (
    <>
      {/* 浮動按鈕 */}
      <Fab
        color="primary"
        aria-label="我的調配"
        onClick={handleToggle}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(45deg, #a78bfa, #8b5cf6)',
          boxShadow: '0 8px 32px rgba(167, 139, 250, 0.4)',
          '&:hover': {
            background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.3s ease',
          zIndex: 1000,
        }}
      >
        <Badge badgeContent={selectedProducts.length} color="error">
          <ShoppingCartIcon />
        </Badge>
      </Fab>

      {/* 抽屜面板 */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            background: 'rgba(30, 27, 75, 0.95)',
            backdropFilter: 'blur(10px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 標題區域 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                🧪 我的調配
              </Typography>
              <Chip
                label={`${selectedProducts.length}/5`}
                sx={{
                  background: 'linear-gradient(45deg, #a78bfa, #8b5cf6)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            </Box>
            <IconButton onClick={handleToggle} sx={{ color: 'text.secondary' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* 商品列表 */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <AnimatePresence>
              {selectedProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                    <Typography variant="h4" sx={{ mb: 2, opacity: 0.5 }}>
                      ⚗️
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      選擇商品開始調配
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      最多可選擇 5 個商品
                    </Typography>
                  </Box>
                </motion.div>
              ) : (
                <List>
                  {selectedProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <ListItem
                        sx={{
                          mb: 2,
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 2,
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(167, 139, 250, 0.3)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            src={`/picture/${String(product.id).padStart(2, '0')}.png`}
                            sx={{
                              width: 60,
                              height: 60,
                              background: 'rgba(255, 255, 255, 0.05)',
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iMzAiIHk9IjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6Dlj6/lm77niYc8L3RleHQ+PC9zdmc+'
                            }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {product.name}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Chip
                                label={product.category}
                                size="small"
                                sx={{
                                  color: 'primary.main',
                                  background: 'rgba(167, 139, 250, 0.1)',
                                  border: '1px solid rgba(167, 139, 250, 0.3)',
                                  fontSize: '0.7rem',
                                  height: 20,
                                  mr: 1,
                                }}
                              />
                              <Chip
                                label={product.rarity}
                                size="small"
                                sx={{
                                  color: 'warning.main',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                            </Box>
                          }
                        />
                        <IconButton
                          onClick={() => onRemoveProduct(product.id)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              background: 'rgba(239, 68, 68, 0.1)',
                            },
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              )}
            </AnimatePresence>
          </Box>

          {/* 底部按鈕 */}
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Box sx={{ pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                 <Button
                   fullWidth
                   variant="contained"
                   size="large"
                   onClick={handleCreateSoul}
                   sx={{
                     background: 'linear-gradient(45deg, #a78bfa, #8b5cf6)',
                     boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3)',
                     '&:hover': {
                       transform: 'translateY(-2px)',
                       boxShadow: '0 6px 20px rgba(167, 139, 250, 0.4)',
                     },
                     transition: 'all 0.3s ease',
                     py: 1.5,
                   }}
                 >
                   🔮 創造靈魂 ({selectedProducts.length} 個素材)
                 </Button>
              </Box>
            </motion.div>
          )}
        </Box>
      </Drawer>

      {/* 靈魂報告書 */}
      <AnimatePresence>
        {showReport && (
          <SoulReport
            open={showReport}
            selectedProducts={selectedProducts}
            onClose={handleCloseReport}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default MixDrawer
