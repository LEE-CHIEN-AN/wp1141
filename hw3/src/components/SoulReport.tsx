import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  Snackbar,
  Alert
} from '@mui/material'
import { Refresh as RefreshIcon, CameraAlt as CameraIcon } from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { computeSoulVec } from '../utils/soulVec'
import Papa from 'papaparse'
import html2canvas from 'html2canvas'
import { Product } from '../types'

interface SoulTitle {
  trigger_item_id: number
  name: string
  category: string
  rarity: string
  title: string
}

interface DivineQuote {
  trigger_item_id: number
  name: string
  category: string
  rarity: string
  quote: string
}

interface SoulReportProps {
  open: boolean
  selectedProducts: Product[]
  onClose: () => void
  onReset: () => void
}

const SoulReport: React.FC<SoulReportProps> = ({
  open,
  selectedProducts,
  onClose,
  onReset
}) => {
  const [showSnackbar, setShowSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [soulTitles, setSoulTitles] = useState<SoulTitle[]>([])
  const [divineQuotes, setDivineQuotes] = useState<DivineQuote[]>([])
  const [soulTitle, setSoulTitle] = useState('')
  const [godComment, setGodComment] = useState('')
  const [animationPhase, setAnimationPhase] = useState(0) // 0: 開場動畫, 1: 報告書
  const [isSpecialCombo, setIsSpecialCombo] = useState(false)
  const [showSpecialEffect, setShowSpecialEffect] = useState(false)

// 載入 CSV 資料（靈魂稱號、神語錄）
  useEffect(() => {
    // 載入靈魂稱號資料
    Papa.parse('/soul_titles.csv', {
      header: true,
      download: true,
      complete: (results) => {
        const titles: SoulTitle[] = results.data.map((row: any) => ({
          trigger_item_id: parseInt(row.trigger_item_id),
          name: row.name,
          category: row.category,
          rarity: row.rarity,
          title: row.title
        }))
        setSoulTitles(titles)
      }
    })

    // 載入神的評語資料
    Papa.parse('/divine_quotes.csv', {
      header: true,
      download: true,
      complete: (results) => {
        const quotes: DivineQuote[] = results.data.map((row: any) => ({
          trigger_item_id: parseInt(row.trigger_item_id),
          name: row.name,
          category: row.category,
          rarity: row.rarity,
          quote: row.quote
        }))
        setDivineQuotes(quotes)
      }
    })
  }, [])

  // 計算總代價（將 price 字串中的非數字移除再相加）
  // 注意：目前 UI 僅逐項列出代價，小計顯示可能由其他區塊負責；若需再次顯示可直接使用此值。
  // const totalCost = React.useMemo(() => {
  //   return selectedProducts.reduce((sum, product) => {
  //     const price = parseFloat(product.price.replace(/[^\d.]/g, '')) || 0
  //     return sum + price
  //   }, 0)
  // }, [selectedProducts])

  // 檢查是否為特殊組合（全同稀有度、含 Mythic+Legendary、全 Rare）
  const checkSpecialCombo = (products: Product[]) => {
    if (products.length === 0) return false
    
    // 檢查是否全為同一稀有度
    const firstRarity = products[0].rarity
    const allSameRarity = products.every(p => p.rarity === firstRarity)
    
    // 檢查是否包含特定稀有度組合
    const hasMythic = products.some(p => p.rarity === 'Mythic')
    const hasLegendary = products.some(p => p.rarity === 'Legendary')
    const allRare = products.every(p => p.rarity === 'Rare')
    
    return allSameRarity || (hasMythic && hasLegendary) || allRare
  }

  // 生成靈魂稱號與神的評語（隨機取所選商品對應的條目）
  useEffect(() => {
    if (selectedProducts.length === 0 || soulTitles.length === 0 || divineQuotes.length === 0) return

    // 檢查特殊組合
    const special = checkSpecialCombo(selectedProducts)
    setIsSpecialCombo(special)

    // 從所選商品中隨機選擇一個商品來生成靈魂稱號
    const randomProduct = selectedProducts[Math.floor(Math.random() * selectedProducts.length)]
    const matchingTitle = soulTitles.find(title => title.trigger_item_id === randomProduct.id)
    if (matchingTitle) {
      setSoulTitle(matchingTitle.title)
    }

    // 從所選商品中隨機選擇一個商品來生成神的評語
    const randomProductForQuote = selectedProducts[Math.floor(Math.random() * selectedProducts.length)]
    const matchingQuote = divineQuotes.find(quote => quote.trigger_item_id === randomProductForQuote.id)
    
    if (matchingQuote) {
      let finalComment = matchingQuote.quote
      
      // 如果是特殊組合，加入彩蛋評語
      if (special) {
        const specialQuotes = [
          "你挑戰了宇宙的極限。",
          "群星為你的勇氣而閃耀。",
          "這是命運的選擇，也是命運的見證。",
          "你觸及了神之領域的邊界。",
          "宇宙的平衡因你而改變。"
        ]
        const randomSpecialQuote = specialQuotes[Math.floor(Math.random() * specialQuotes.length)]
        finalComment += ` ${randomSpecialQuote}`
      }
      
      setGodComment(finalComment)
    }
  }, [selectedProducts, soulTitles, divineQuotes])

  // 開場動畫序列（開啟對話框後先播放儀式感動畫，再進入報告書）
  useEffect(() => {
    if (!open) {
      setAnimationPhase(0)
      setShowSpecialEffect(false)
      return
    }

    // 開場動畫序列
    const animationSequence = async () => {
      // Phase 1: 開場動畫 (2秒)
      setAnimationPhase(0)
      
      // 如果是特殊組合，顯示特殊效果
      if (isSpecialCombo) {
        setTimeout(() => setShowSpecialEffect(true), 1000)
      }
      
      // Phase 2: 顯示報告書 (2秒後)
      setTimeout(() => {
        setAnimationPhase(1)
      }, 2000)
    }

    animationSequence()
  }, [open, isSpecialCombo])

  // 根據稀有度取得對應色碼，用於卡片邊框與細節
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return '#9CA3AF'
      case 'Uncommon': return '#10B981'
      case 'Rare': return '#3B82F6'
      case 'Epic': return '#8B5CF6'
      case 'Legendary': return '#F59E0B'
      case 'Mythic': return '#EF4444'
      default: return '#6B7280'
    }
  }

  // 處理截圖功能（使用 html2canvas 將報告書轉為圖片下載）
  const handleScreenshot = async () => {
    try {
      const element = document.getElementById('soul-report-content')
      if (!element) return

      const canvas = await html2canvas(element, {
        backgroundColor: 'transparent',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const link = document.createElement('a')
      link.download = `神之創造報告書_${soulTitle}_${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL()
      link.click()

      setSnackbarMessage('報告書已保存為圖片！')
      setShowSnackbar(true)
    } catch (error) {
      console.error('截圖失敗:', error)
      setSnackbarMessage('截圖失敗，請重試')
      setShowSnackbar(true)
    }
  }

  // 已移除原「分享文字」功能按鈕，若需恢復可改為分享截圖或文字

  // 處理重新創造（清空選擇並關閉報告）
  const handleReset = () => {
    onReset()
    onClose()
  }

  // 成分清單欄數：>3 時改為兩行（ceil(n/2)），否則等於 n；最少 1
  const n = selectedProducts.length
  const cols = n > 3 ? Math.ceil(n / 2) : n || 1

  // 依選擇成分推導三大屬性比例（能力→行動力、性格→社交能量、詛咒→理智）
  const attributeData = React.useMemo(() => {
    const v = computeSoulVec(selectedProducts as any)
    return [
      { name: '行動力', value: Math.round(v.action) },
      { name: '社交能量', value: Math.round(v.social) },
      { name: '理智', value: Math.round(v.sanity) },
      { name: '創造力', value: Math.round(v.creativity) },
      { name: '抗壓', value: Math.round(v.resilience) },
      { name: '混沌', value: Math.round(v.chaos) }
    ]
  }, [selectedProducts])

  // 由當前最強稀有度決定條形圖漸層終點色
  const rarityOrder: Record<string, number> = {
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Epic: 4,
    Legendary: 5,
    Mythic: 6
  }
  const topRarityColor = React.useMemo(() => {
    let top: { rank: number; color: string } = { rank: 0, color: '#9CA3AF' }
    selectedProducts.forEach((p) => {
      const rank = rarityOrder[p.rarity] || 0
      if (rank > top.rank) top = { rank, color: getRarityColor(p.rarity) }
    })
    return top.color
  }, [selectedProducts])

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={false}
        PaperProps={{
          sx: {
            background: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
            maxHeight: '90vh',
            margin: 2
          }
        }}
        BackdropProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogContent sx={{ p: 0, overflow: 'auto', maxHeight: '90vh' }}>
          {/* 科幻背景特效 */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 60%, rgba(245, 158, 11, 0.05) 0%, transparent 50%),
                linear-gradient(45deg, rgba(0, 0, 0, 0.8) 0%, rgba(30, 27, 75, 0.9) 50%, rgba(0, 0, 0, 0.8) 100%)
              `,
              zIndex: -2
            }}
          />

          {/* 動態網格背景 */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(rgba(167, 139, 250, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(167, 139, 250, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite',
              zIndex: -1,
              '@keyframes gridMove': {
                '0%': { transform: 'translate(0, 0)' },
                '100%': { transform: 'translate(50px, 50px)' }
              }
            }}
          />

          {/* 浮動粒子效果 */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                background: `hsl(${240 + Math.random() * 60}, 70%, 60%)`,
                borderRadius: '50%',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                zIndex: -1
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
            />
          ))}

          {/* 能量波紋 */}
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '800px',
              height: '800px',
              border: '2px solid rgba(167, 139, 250, 0.2)',
              borderRadius: '50%',
              zIndex: -1
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.1, 0.3],
              rotate: [0, 360]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              height: '600px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '50%',
              zIndex: -1
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.05, 0.2],
              rotate: [360, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* 掃描線效果 */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.8), transparent)',
              zIndex: 1
            }}
            animate={{
              y: [0, '100vh', 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* 角落裝飾 */}
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              left: 20,
              width: '100px',
              height: '100px',
              border: '2px solid rgba(167, 139, 250, 0.3)',
              borderRight: 'none',
              borderBottom: 'none',
              zIndex: 1
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: '100px',
              height: '100px',
              border: '2px solid rgba(167, 139, 250, 0.3)',
              borderLeft: 'none',
              borderBottom: 'none',
              zIndex: 1
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              width: '100px',
              height: '100px',
              border: '2px solid rgba(167, 139, 250, 0.3)',
              borderRight: 'none',
              borderTop: 'none',
              zIndex: 1
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              width: '100px',
              height: '100px',
              border: '2px solid rgba(167, 139, 250, 0.3)',
              borderLeft: 'none',
              borderTop: 'none',
              zIndex: 1
            }}
          />

          {/* 中央能量核心 */}
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              zIndex: -1
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* 特殊組合的額外特效 */}
          {isSpecialCombo && (
            <>
              {/* 能量爆發 */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '1000px',
                  height: '1000px',
                  background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
                  borderRadius: '50%',
                  zIndex: -1
                }}
                animate={{
                  scale: [0.5, 1.5, 0.5],
                  opacity: [0, 0.4, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
              
              {/* 金色光環 */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '1200px',
                  height: '1200px',
                  border: '3px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '50%',
                  zIndex: -1
                }}
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </>
          )}

          {/* 開場動畫 */}
          <AnimatePresence>
            {animationPhase === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}
              >
                {/* 能量陣背景 */}
                <Box
                  sx={{
                    position: 'relative',
                    width: '400px',
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* 外圈符文 */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: 'absolute',
                      width: '350px',
                      height: '350px',
                      border: '2px solid rgba(167, 139, 250, 0.6)',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, transparent 30%, rgba(167, 139, 250, 0.1) 70%)'
                    }}
                  />
                  
                  {/* 中圈星軌 */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    style={{
                      position: 'absolute',
                      width: '250px',
                      height: '250px',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, transparent 40%, rgba(245, 158, 11, 0.05) 60%)'
                    }}
                  />
                  
                  {/* 內圈能量 */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      position: 'absolute',
                      width: '150px',
                      height: '150px',
                      background: 'radial-gradient(circle, rgba(167, 139, 250, 0.8) 0%, transparent 70%)',
                      borderRadius: '50%'
                    }}
                  />

                  {/* 商品圖示漂浮動畫 */}
                  {selectedProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ 
                        opacity: 0,
                        scale: 0,
                        x: Math.cos((index * 2 * Math.PI) / selectedProducts.length) * 200,
                        y: Math.sin((index * 2 * Math.PI) / selectedProducts.length) * 200
                      }}
                      animate={{ 
                        opacity: 1,
                        scale: 1,
                        x: 0,
                        y: 0
                      }}
                      transition={{ 
                        delay: 0.5 + index * 0.2,
                        duration: 1,
                        ease: "easeOut"
                      }}
                      style={{
                        position: 'absolute',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: `2px solid ${getRarityColor(product.rarity)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}
                    >
                      <img 
                        src={`/picture/${String(product.id).padStart(2, '0')}.png`}
                        alt={product.name}
                        style={{
                          width: '30px',
                          height: '30px',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iMTUiIHk9IjE1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6Dlj6/lm77niYc8L3RleHQ+PC9zdmc+'
                        }}
                      />
                    </motion.div>
                  ))}

                  {/* 能量聚合球 */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 1],
                      opacity: [0, 1, 0.8]
                    }}
                    transition={{ 
                      delay: 1.5,
                      duration: 1,
                      ease: "easeOut"
                    }}
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'radial-gradient(circle, rgba(167, 139, 250, 1) 0%, rgba(139, 92, 246, 0.8) 50%, transparent 100%)',
                      borderRadius: '50%',
                      boxShadow: '0 0 50px rgba(167, 139, 250, 0.8)',
                      position: 'relative',
                      zIndex: 5
                    }}
                  />

                  {/* 特殊效果 */}
                  {showSpecialEffect && (
                    <>
                      <motion.div
                        animate={{ 
                          rotate: 360,
                          scale: [1, 1.5, 1]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        style={{
                          position: 'absolute',
                          width: '500px',
                          height: '500px',
                          border: '3px solid rgba(239, 68, 68, 0.6)',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, transparent 20%, rgba(239, 68, 68, 0.1) 80%)',
                          zIndex: 1
                        }}
                      />
                      <motion.div
                        animate={{ 
                          rotate: -360,
                          scale: [1, 1.3, 1]
                        }}
                        transition={{ 
                          duration: 4,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        style={{
                          position: 'absolute',
                          width: '600px',
                          height: '600px',
                          border: '2px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, transparent 30%, rgba(245, 158, 11, 0.05) 70%)',
                          zIndex: 1
                        }}
                      />
                    </>
                  )}
                </Box>

                {/* 載入文字 */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  style={{
                    position: 'absolute',
                    bottom: '20%',
                    textAlign: 'center'
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(167, 139, 250, 0.8)',
                      fontFamily: 'Orbitron, monospace'
                    }}
                  >
                    {isSpecialCombo ? '✨ 宇宙能量匯聚中 ✨' : '🔮 靈魂創造中 🔮'}
                  </Typography>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 報告書內容 */}
          <AnimatePresence>
            {animationPhase === 1 && (
              <motion.div
                id="soul-report-content"
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <Card
                  sx={{
                    background: 'rgba(30, 27, 75, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: isSpecialCombo ? '3px solid rgba(239, 68, 68, 0.6)' : '2px solid rgba(167, 139, 250, 0.3)',
                    borderRadius: 4,
                    boxShadow: isSpecialCombo 
                      ? '0 20px 60px rgba(239, 68, 68, 0.4), 0 0 100px rgba(239, 68, 68, 0.2)'
                      : '0 20px 60px rgba(167, 139, 250, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: isSpecialCombo 
                        ? 'linear-gradient(45deg, transparent, rgba(239, 68, 68, 0.1), transparent)'
                        : 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
                      opacity: 0.5,
                      pointerEvents: 'none'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        linear-gradient(90deg, transparent 0%, rgba(167, 139, 250, 0.1) 50%, transparent 100%),
                        linear-gradient(0deg, transparent 0%, rgba(139, 92, 246, 0.1) 50%, transparent 100%)
                      `,
                      opacity: 0.3,
                      pointerEvents: 'none',
                      animation: 'scanLines 3s ease-in-out infinite',
                      '@keyframes scanLines': {
                        '0%, 100%': { opacity: 0.1 },
                        '50%': { opacity: 0.4 }
                      }
                    }
                  }}
                >
                  
                  
                 

                  <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                  {/* 標題（移除特效，與背景同色系） */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Typography
                      variant="h3"
                      component="h1"
                      sx={{
                        textAlign: 'center',
                        mb: { xs: 2, sm: 3, md: 4 },
                        fontSize: { xs: '1.8rem', sm: '2.2rem', md: '3rem' },
                        color: 'text.primary',
                        fontFamily: 'Orbitron, monospace',
                        fontWeight: 900,
                        textShadow: isSpecialCombo 
                            ? '0 0 20px gold'
                            : '0 0 20px rgba(245, 158, 11, 0.5)'
                      }}
                    >
                      神之創造報告書
                    </Typography>
                  </motion.div>

                    {/* 靈魂稱號 */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    >
                      <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3, md: 4 } }}>
                        <Typography
                          variant="h4"
                          sx={{
                            color: isSpecialCombo ? 'error.main' : 'warning.main',
                            fontWeight: 'bold',
                            textShadow: isSpecialCombo 
                              ? '0 0 20px rgba(239, 68, 68, 0.8)'
                              : '0 0 20px rgba(245, 158, 11, 0.5)',
                            mb: 1,
                            fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' }
                          }}
                        >
                          🏆 靈魂稱號
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            color: isSpecialCombo ? 'error.main' : 'warning.main',
                            fontWeight: 'bold',
                            textShadow: isSpecialCombo 
                              ? '0 0 20px rgba(239, 68, 68, 0.8)'
                              : '0 0 20px rgba(245, 158, 11, 0.5)',
                            mb: 1,
                            fontSize: { xs: '1.2rem', sm: '1.5rem', md: '2rem' }
                          }}
                        >
                          {soulTitle}
                        </Typography>
                      </Box>
                    </motion.div>

                    {/* 成分清單 */}
                    <motion.div
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 3, 
                          color: 'primary.main', 
                          fontWeight: 'bold',
                          fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' },
                          textAlign: 'center'
                        }}
                      >
                        🧪 成分清單
                      </Typography>
                      
                      {/* 圖片並排置中展示 */}
                      <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gap: { xs: 2, sm: 3 },
                            mb: { xs: 3, sm: 4 },
                            justifyContent: 'center',
                            justifyItems: 'center',
                            alignItems: 'center',
                            placeContent: 'center',
                            mx: 'auto',
                            maxWidth: '900px' // 可選：讓內容寬度限制更美觀
                        }}
                      >
                        {selectedProducts.map((product, index) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                          >
                            <Card
                              sx={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(10px)',
                                border: `2px solid ${getRarityColor(product.rarity)}40`,
                                borderRadius: 3,
                                overflow: 'hidden',
                                position: 'relative',
                                width: { xs: 160, sm: 180, md: 200 },
                                aspectRatio: '3 / 4',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  borderColor: `${getRarityColor(product.rarity)}80`,
                                  boxShadow: `0 8px 32px ${getRarityColor(product.rarity)}30`,
                                  background: 'rgba(255, 255, 255, 0.08)'
                                }
                              }}
                            >
                              {/* 商品圖片 */}
                              <Box
                                sx={{
                                  position: 'relative',
                                  width: '100%',
                                  height: { xs: '120px', sm: '140px', md: '160px' },
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: `linear-gradient(135deg, ${getRarityColor(product.rarity)}20, transparent)`,
                                  overflow: 'hidden'
                                }}
                              >
                                <motion.img
                                  src={`/picture/${String(product.id).padStart(2, '0')}.png`}
                                  alt={product.name}
                                  style={{
                                    width: '100%',
                                    height: '90%',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iMzAiIHk9IjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6Dlj6/lm77niYc8L3RleHQ+PC9zdmc+'
                                  }}
                                  whileHover={{ scale: 1.1 }}
                                  transition={{ duration: 0.2 }}
                                />
                                
                                
                              </Box>

                              {/* 商品資訊 */}
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, flex: '1 1 auto' }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    mb: 1,
                                    textAlign: 'center',
                                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                    lineHeight: 1.2,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {product.name}
                                </Typography>

                                {/* 優缺點摘要 */}
                                <Box sx={{ mt: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'success.main',
                                      fontSize: '0.7rem',
                                      display: 'block',
                                      mb: 0.5,
                                      fontWeight: 500
                                    }}
                                  >
                                    ✓ {product.pros.length > 20 ? product.pros.substring(0, 20) + '...' : product.pros}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'error.main',
                                      fontSize: '0.7rem',
                                      display: 'block',
                                      fontWeight: 500
                                    }}
                                  >
                                    ⚠ {product.cons.length > 20 ? product.cons.substring(0, 20) + '...' : product.cons}
                                  </Typography>
                                </Box>
                              </CardContent>

                              {/* 懸停時顯示完整資訊 */}
                              <motion.div
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: 'rgba(0, 0, 0, 0.9)',
                                  backdropFilter: 'blur(5px)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  padding: '16px',
                                  borderRadius: '12px'
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'white',
                                    fontWeight: 600,
                                    mb: 2,
                                    textAlign: 'center',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  {product.name}
                                </Typography>
                                
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'success.light',
                                    mb: 1,
                                    fontSize: '0.75rem',
                                    textAlign: 'center',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {product.description}
                                </Typography>
                                
                                
                              </motion.div>
                            </Card>
                          </motion.div>
                        ))}
                      </Box>
                    </motion.div>

                    <Divider sx={{ my: { xs: 2, sm: 3 }, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                    {/* 靈魂屬性表：發光條形圖（置於成分清單與神的評語之間） */}
                    {attributeData.length > 0 && (
                      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            mb: 2, 
                            color: 'primary.main', 
                            fontWeight: 'bold',
                            textAlign: 'center'
                          }}
                        >
                          🔬 靈魂屬性表
                        </Typography>

                        {/* 定義漸層（從 Common 灰到最高稀有度色）供條形圖使用 */}
                        <svg width="0" height="0" aria-hidden>
                          <defs>
                            <linearGradient id="rarityGradientBar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#9CA3AF" />
                              <stop offset="100%" stopColor={topRarityColor} />
                            </linearGradient>
                          </defs>
                        </svg>

                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                          {attributeData.map((attr) => (
                            <Box key={attr.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ width: 80, color: 'text.secondary', textAlign: 'right', fontSize: 14 }}>
                                {attr.name}
                              </Typography>
                              <Box sx={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${attr.value}%`,
                                    background: 'url(#)',
                                    // 使用 CSS 畫刷參考 linear-gradient via mask 製造 glow
                                    '&::before': {
                                      content: '""',
                                      position: 'absolute',
                                      inset: 0,
                                      background: 'linear-gradient(90deg, #9CA3AF, ' + topRarityColor + ')',
                                    },
                                    boxShadow: `0 0 12px ${topRarityColor}66`,
                                    borderRadius: 999
                                  }}
                                />
                              </Box>
                              <Typography sx={{ width: 48, color: 'text.primary', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>
                                {attr.value}%
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* 代價與評語 */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: { xs: 2, sm: 3, md: 4 }, 
                      mb: { xs: 2, sm: 3, md: 4 },
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                        style={{ flex: 1 }}
                      >
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            mb: 2, 
                            color: 'error.main', 
                            fontWeight: 'bold',
                            fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' }
                          }}
                        >
                          💰 要付出的代價
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          {selectedProducts.map((product, index) => (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1.4 + index * 0.1, duration: 0.3 }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  py: 1,
                                  px: 2,
                                  mb: 1,
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  borderRadius: 2,
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  '&:hover': {
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    borderColor: 'rgba(239, 68, 68, 0.5)',
                                  },
                                  transition: 'all 0.3s ease'
                                }}
                              >
                                
                                <Typography
                                  variant="body1"
                                  sx={{
                                    color: 'error.main',
                                    fontWeight: 'bold',
                                    textShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                                  }}
                                >
                                  <strong> {product.price} </strong>
                                </Typography>
                              </Box>
                            </motion.div>
                          ))}
                        </Box>
                        
                         
                        
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.4, duration: 0.5 }}
                        style={{ flex: 1 }}
                      >
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            mb: 2, 
                            color: 'warning.main', 
                            fontWeight: 'bold',
                            fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' }
                          }}
                        >
                          👑 神的評語
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            color: 'text.primary',
                            lineHeight: 1.6,
                            background: isSpecialCombo 
                              ? 'rgba(241, 238, 27, 0.2)'
                              : 'rgba(245, 210, 11, 0.1)',
                            padding: 2,
                            borderRadius: 2,
                            border: isSpecialCombo 
                              ? '1px solid rgba(239, 193, 68, 0.3)'
                              : '1px solid rgba(245, 163, 11, 0.3)'
                          }}
                        >
                          {godComment}
                        </Typography>
                      </motion.div>
                    </Box>

                    {/* 按鈕區域 */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6, duration: 0.5 }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        gap: { xs: 1, sm: 2 }, 
                        justifyContent: 'center', 
                        flexWrap: 'wrap',
                        flexDirection: { xs: 'column', sm: 'row' }
                      }}>
                        <Button
                          variant="contained"
                          startIcon={<RefreshIcon />}
                          onClick={handleReset}
                          fullWidth={false}
                          sx={{
                            background: 'linear-gradient(45deg, #10B981, #059669)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #059669, #047857)',
                              transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease',
                            minWidth: { xs: '100%', sm: 'auto' }
                          }}
                        >
                          重新創造
                        </Button>
                        
                        <Button
                          variant="contained"
                          startIcon={<CameraIcon />}
                          onClick={handleScreenshot}
                          fullWidth={false}
                          sx={{
                            background: 'linear-gradient(45deg, #3B82F6, #2563EB)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #2563EB, #1D4ED8)',
                              transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease',
                            minWidth: { xs: '100%', sm: 'auto' }
                          }}
                        >
                          截圖並分享
                        </Button>
                        
    
                      </Box>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* 提示訊息 */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity="success"
          sx={{
            background: 'rgba(30, 27, 75, 0.95)',
            color: 'white',
            border: '1px solid rgba(167, 139, 250, 0.3)'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}

export default SoulReport