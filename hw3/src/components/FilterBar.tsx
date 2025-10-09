import React from 'react'
import { Box, FormControl, InputLabel, Select, MenuItem, Card } from '@mui/material'
import { motion } from 'framer-motion'
import { FilterBarProps } from '../types'

const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  rarities,
  filterCategory,
  filterRarity,
  onCategoryChange,
  onRarityChange
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="category-filter-label">🔍 分類篩選</InputLabel>
            <Select
              labelId="category-filter-label"
              value={filterCategory}
              label="🔍 分類篩選"
              onChange={(e) => onCategoryChange(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            >
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category === 'all' ? '全部分類' : category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="rarity-filter-label">✨ 稀有度篩選</InputLabel>
            <Select
              labelId="rarity-filter-label"
              value={filterRarity}
              label="✨ 稀有度篩選"
              onChange={(e) => onRarityChange(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            >
              {rarities.map(rarity => (
                <MenuItem key={rarity} value={rarity}>
                  {rarity === 'all' ? '全部稀有度' : rarity}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>
    </motion.div>
  )
}

export default FilterBar
