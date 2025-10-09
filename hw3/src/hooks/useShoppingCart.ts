// src/hooks/useShoppingCart.ts
import { useState, useCallback } from 'react'
import { Product } from '../types'
import { MAX_SELECTED_PRODUCTS, GOD_WARNING_MESSAGES } from '../constants'

export const useShoppingCart = () => {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<Set<number>>(new Set())
  const [godWarning, setGodWarning] = useState({ show: false, message: '' })

  const addToCart = useCallback((product: Product) => {
    // 檢查是否已達到上限
    if (selectedProducts.length >= MAX_SELECTED_PRODUCTS) {
      const randomMessage = GOD_WARNING_MESSAGES[Math.floor(Math.random() * GOD_WARNING_MESSAGES.length)]
      setGodWarning({ show: true, message: randomMessage })
      return false
    }
    
    // 檢查是否重複購買
    if (selectedProducts.find(p => p.id === product.id)) {
      return false
    }
    
    // 正常加入商品
    setSelectedProducts(prev => [...prev, product])
    setPurchasedProducts(prev => new Set([...prev, product.id]))
    return true
  }, [selectedProducts])

  const removeFromCart = useCallback((productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId))
  }, [])

  const resetCart = useCallback(() => {
    setSelectedProducts([])
  }, [])

  const closeGodWarning = useCallback(() => {
    setGodWarning({ show: false, message: '' })
  }, [])

  return {
    selectedProducts,
    purchasedProducts,
    godWarning,
    addToCart,
    removeFromCart,
    resetCart,
    closeGodWarning
  }
}

