/**
 * 修復後的 useFavorites Hook
 * 簡化版本，避免複雜的狀態管理
 */

import { useState, useEffect, useCallback } from 'react'
import { Store } from '../types'
import { favoritesAPI } from '../services/api'

export const useFavorites = (isAuthenticated: boolean) => {
  const [favorites, setFavorites] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async (forceRefresh?: boolean) => {
    if (!isAuthenticated) {
      setFavorites([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const data = await favoritesAPI.getMyFavorites()
      setFavorites(data)
    } catch (err: any) {
      const errorMessage = err.message || '載入收藏失敗'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const toggleFavorite = async (storeId: string, isFavorited: boolean) => {
    try {
      if (isFavorited) {
        await favoritesAPI.unfavorite(storeId)
      } else {
        await favoritesAPI.favorite(storeId)
      }
      
      // 同步更新本地狀態
      if (isFavorited) {
        setFavorites(prev => prev.filter(store => store.id !== storeId))
      } else {
        // 需要重新載入收藏列表以獲取完整的店舖資訊
        await fetchFavorites(true)
      }
    } catch (err: any) {
      const errorMessage = err.message || '收藏操作失敗'
      setError(errorMessage)
      throw err
    }
  }

  const isFavorite = (storeId: string): boolean => {
    return favorites.some(store => store.id === storeId)
  }

  return {
    favorites,
    loading,
    error,
    fetchFavorites,
    toggleFavorite,
    isFavorite,
  }
}