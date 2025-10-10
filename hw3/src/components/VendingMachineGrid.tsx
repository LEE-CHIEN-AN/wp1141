import React, { useState } from 'react'
import { Grid, Typography, Box } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { VendingMachineGridProps, Product } from '../types'
import ProductCard from './ProductCard'

const VendingMachineGrid: React.FC<VendingMachineGridProps> = ({
  products,
  filterCategory,
  filterRarity,
  onAddToMix,
  purchasedProducts
}) => {
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null)

  // 篩選商品
  const filteredProducts = products.filter(product => {
    const categoryMatch = filterCategory === 'all' || product.category === filterCategory
    const rarityMatch = filterRarity === 'all' || product.rarity === filterRarity
    return categoryMatch && rarityMatch
  })

  return (
    <Box>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${filterCategory}-${filterRarity}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {filteredProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                🔍 沒有找到符合條件的商品
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredProducts.map((product, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    onMouseEnter={() => setHoveredProduct(product)}
                    onMouseLeave={() => setHoveredProduct(null)}
                  >
                    <ProductCard 
                      product={product} 
                      onAddToMix={() => onAddToMix(product)}
                      isHovered={hoveredProduct?.id === product.id}
                      isPurchased={purchasedProducts.has(product.id)}
                    />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>
    </Box>
  )
}

export default VendingMachineGrid
