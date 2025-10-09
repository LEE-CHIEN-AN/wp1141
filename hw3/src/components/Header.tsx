import React from 'react'
import { Box, Typography, Container } from '@mui/material'
import { motion } from 'framer-motion'

const Header: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          py: 4,
          textAlign: 'center',
          background: 'rgba(30, 27, 75, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ position: 'relative', fontSize: '3rem' }}>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ display: 'inline-block' }}
                >
                  ⚙️
                </motion.span>
                <motion.span
                  animate={{ 
                    opacity: [0.5, 1, 0.5],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    fontSize: '1.5rem'
                  }}
                >
                  💫
                </motion.span>
              </Box>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h1" component="h1">
                  神之創造販賣機
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'primary.main',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontFamily: 'Orbitron, monospace'
                  }}
                >
                  Soul Vending Machine
                </Typography>
              </Box>
            </Box>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                maxWidth: 600, 
                mx: 'auto',
                fontStyle: 'italic',
                color: 'text.secondary'
              }}
            >
              這台販賣機在宇宙的角落，販售神在創造你時遺落的素材。
            </Typography>
          </motion.div>
        </Container>
      </Box>
    </motion.div>
  )
}

export default Header
