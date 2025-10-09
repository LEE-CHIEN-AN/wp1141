import { useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, Box, Container, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material'
import { VolumeUp, VolumeOff } from '@mui/icons-material'
import { theme } from './theme'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import VendingMachineGrid from './components/VendingMachineGrid'
import MixDrawer from './components/MixDrawer'
import SpaceBackground from './components/SpaceBackground'
import GodWarningDialog from './components/GodWarningDialog'
import { useProducts } from './hooks/useProducts'
import { useShoppingCart } from './hooks/useShoppingCart'
import { useAudio } from './hooks/useAudio'

function App() {
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterRarity, setFilterRarity] = useState<string>('all')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false) // 購物車是否開啟
  
  const { products, loading, error } = useProducts()
  const { 
    selectedProducts, 
    purchasedProducts, 
    godWarning, 
    addToCart, 
    removeFromCart, 
    resetCart, 
    closeGodWarning 
  } = useShoppingCart()
  const { audioRef, isMuted, toggleMute } = useAudio()

  const handleAddToMix = (product: any) => {
    const success = addToCart(product)
    if (!success && godWarning.show) {
      setIsDrawerOpen(true)
    }
  }

  const handleRemoveFromMix = (productId: number) => {
    removeFromCart(productId)
  }

  const handleResetMix = () => {
    resetCart()
  }

  const handleToggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const handleCloseGodWarning = () => {
    closeGodWarning()
    setIsDrawerOpen(true)
  }

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at center, #1E1B4B 0%, #3B1E69 50%, #0F0A1A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <SpaceBackground audioRef={audioRef} />
          <CircularProgress sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            載入神之素材中...
          </Typography>
        </Box>
      </ThemeProvider>
    )
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at center, #1E1B4B 0%, #3B1E69 50%, #0F0A1A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <SpaceBackground audioRef={audioRef} />
          <Typography variant="h6" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        </Box>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at center, #1E1B4B 0%, #3B1E69 50%, #0F0A1A 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <SpaceBackground audioRef={audioRef} />
        <Header />
        
        {/* 音量控制按鈕 */}
        <Tooltip title={isMuted ? "開啟音效" : "關閉音效"}>
          <IconButton
            onClick={toggleMute}
            sx={{
              position: 'fixed',
              top: 20,
              right: 20,
              zIndex: 1000,
              background: 'rgba(30, 27, 75, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              color: isMuted ? 'text.secondary' : 'primary.main',
              '&:hover': {
                background: 'rgba(167, 139, 250, 0.2)',
                borderColor: 'rgba(167, 139, 250, 0.5)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>
        
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
          <Box>
            <FilterBar 
              categories={['all', ...Array.from(new Set(products.map(p => p.category)))]}
              rarities={['all', ...Array.from(new Set(products.map(p => p.rarity)))]}
              filterCategory={filterCategory}
              filterRarity={filterRarity}
              onCategoryChange={setFilterCategory}
              onRarityChange={setFilterRarity}
            />
            <VendingMachineGrid 
              products={products}
              filterCategory={filterCategory}
              filterRarity={filterRarity}
              onAddToMix={handleAddToMix}
              purchasedProducts={purchasedProducts}
            />
          </Box>
        </Container>
        
        <MixDrawer 
          selectedProducts={selectedProducts}
          onRemoveProduct={handleRemoveFromMix}
          onReset={handleResetMix}
          open={isDrawerOpen}
          onToggle={handleToggleDrawer}
        />
        
        {/* 神語警告對話框 */}
        <GodWarningDialog 
          warning={godWarning}
          onClose={handleCloseGodWarning}
        />
      </Box>
    </ThemeProvider>
  )
}

export default App