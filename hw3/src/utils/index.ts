// src/utils/index.ts
import { Product, RarityType } from '../types'
import { RARITY_COLORS, RARITY_ICONS } from '../constants'

export const getRarityColor = (rarity: string): string => {
  return RARITY_COLORS[rarity as RarityType] || '#6B7280'
}

export const getRarityIcon = (rarity: string): string => {
  return RARITY_ICONS[rarity as RarityType] || '⚫'
}

export const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)]
}

export const checkSpecialCombo = (products: Product[]): boolean => {
  if (products.length === 0) return false
  
  const rarities = products.map(p => p.rarity)
  const uniqueRarities = new Set(rarities)
  
  // 全同稀有度
  if (uniqueRarities.size === 1) return true
  
  // Mythic + Legendary 組合
  if (rarities.includes('Mythic') && rarities.includes('Legendary')) return true
  
  // 全 Rare
  if (rarities.every(r => r === 'Rare')) return true
  
  return false
}

export const calculateTotalPrice = (products: Product[]): number => {
  return products.reduce((total, product) => {
    const price = parseFloat(product.price) || 0
    return total + price
  }, 0)
}

export const formatPrice = (price: string): string => {
  return price || '免費'
}

export const convertGoogleDriveUrl = (url: string): string => {
  // 從 Google Drive 分享連結中提取檔案 ID
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    // 使用 Google Drive 的直接圖片連結格式
    return `https://drive.google.com/uc?export=view&id=${match[1]}`
  }
  return url // 如果無法解析，返回原始 URL
}

export const convertGoogleDriveAudioUrl = (url: string): string => {
  // 從 Google Drive 分享連結中提取檔案 ID
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match && match[1]) {
    // 使用 Google Drive 的直接音訊連結格式
    return `https://drive.google.com/uc?export=download&id=${match[1]}`
  }
  return url // 如果無法解析，返回原始 URL
}

export const getImagePath = (productId: number): string => {
  return `/picture/${productId.toString().padStart(2, '0')}.png`
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

