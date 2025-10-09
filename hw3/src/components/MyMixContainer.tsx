import React from 'react'
import { Card, CardContent, Typography, Box, Chip, Button, List, ListItem, ListItemAvatar, ListItemText, Avatar, IconButton } from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { Product } from '../types'

interface MyMixContainerProps {
  selectedProducts: Product[]
  onRemoveProduct: (productId: number) => void
}

const MyMixContainer: React.FC<MyMixContainerProps> = ({ 
  selectedProducts, 
  onRemoveProduct 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <Card sx={{ width: 350, position: 'sticky', top: 32, maxHeight: 'calc(100vh - 4rem)', overflow: 'auto' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🧪 我的調配
            </Typography>
            <Chip
              label={`${selectedProducts.length}/8`}
              sx={{
                background: 'linear-gradient(45deg, #a78bfa, #8b5cf6)',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>

          <Box sx={{ minHeight: 200 }}>
            <AnimatePresence>
              {selectedProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
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
                          mb: 1,
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
                              width: 50,
                              height: 50,
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
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {product.name}
                            </Typography>
                          }
                          secondary={
                            <Chip
                              label={product.rarity}
                              size="small"
                              sx={{
                                color: 'primary.main',
                                background: 'rgba(167, 139, 250, 0.1)',
                                border: '1px solid rgba(167, 139, 250, 0.3)',
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
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
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              )}
            </AnimatePresence>
          </Box>

          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(45deg, #a78bfa, #8b5cf6)',
                    boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(167, 139, 250, 0.4)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  🔮 創造靈魂
                </Button>
              </Box>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default MyMixContainer