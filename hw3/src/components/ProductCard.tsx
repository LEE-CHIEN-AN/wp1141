import React from 'react'
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material'
import { motion } from 'framer-motion'
import { ProductCardProps } from '../types'
import { getRarityColor, getRarityIcon } from '../utils'

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToMix, isHovered, isPurchased }) => {

  return (
    <motion.div
      whileHover={{ 
        scale: 1.05,
        rotateY: 5,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${getRarityColor(product.rarity)}`,
          boxShadow: `0 0 20px ${getRarityColor(product.rarity)}30`,
          '&:hover': {
            boxShadow: `0 0 40px ${getRarityColor(product.rarity)}40`,
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1.5rem' }}>
            {getRarityIcon(product.rarity)}
          </Typography>
          <Chip
            label={product.rarity}
            sx={{
              backgroundColor: getRarityColor(product.rarity),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>

        <Box sx={{ px: 2, pb: 1 }}>
          <Box
            sx={{
              width: '70%',
              mx: 'auto',
              borderRadius: 2,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.05)',
              p: 1,
            }}
          >
            <motion.img
              src={`/picture/${String(product.id).padStart(2, '0')}.png`}
              alt={product.name}
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                transition: 'all 0.3s ease',
                filter: isHovered ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))' : 'none',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjYwIiB5PSI2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5peg5Y+v5Zu+54mHPC90ZXh0Pjwvc3ZnPg=='
              }}
            />
          </Box>
        </Box>

        <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 700 }}>
            {product.name}
          </Typography>
          
          <Chip
            label={product.category}
            variant="outlined"
            sx={{
              color: 'primary.main',
              borderColor: 'primary.main',
              mb: 1,
            }}
          />
          
          <Typography variant="body1" sx={{ color: 'warning.main', fontWeight: 'bold', mb: 2 }}>
            💰 {product.price}
          </Typography>

          {isHovered && (
            <Box sx={{ mt: 2, p: 2, background: 'rgba(0, 0, 0, 0.2)', borderRadius: 1 }}>

              <Typography variant="body2" sx={{ mb: 2 }}>
                {product.description}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, color: 'success.main' }}>
                優點：{product.pros}
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.main' }}>
                副作用：{product.cons}
              </Typography>
            </Box>
          )}
        </CardContent>

        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={onAddToMix}
            disabled={isPurchased}
            sx={{
              background: isPurchased 
                ? 'linear-gradient(45deg, #6B7280, #6B728080)' 
                : `linear-gradient(45deg, ${getRarityColor(product.rarity)}, ${getRarityColor(product.rarity)}80)`,
              boxShadow: isPurchased 
                ? '0 0 10px #6B728040' 
                : `0 0 20px ${getRarityColor(product.rarity)}40`,
              '&:hover': {
                transform: isPurchased ? 'none' : 'translateY(-2px)',
                boxShadow: isPurchased 
                  ? '0 0 10px #6B728040' 
                  : `0 4px 20px ${getRarityColor(product.rarity)}60`,
              },
              transition: 'all 0.3s ease',
            }}
          >
            {isPurchased ? '✅ 已購買' : '🪙 投幣購買'}
          </Button>
        </Box>
      </Card>
    </motion.div>
  )
}

export default ProductCard