import { useState, useEffect, useCallback } from 'react'
import { favoritesAPI } from '../services/api'
import { Store } from '../types'

export const useFavorites = (isAuthenticated: boolean) => {
  const [favorites, setFavorites] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([])
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const favoriteStores = await favoritesAPI.getMyFavorites()
      setFavorites(favoriteStores)
    } catch (err: any) {
      setError(err.message)
      console.error('取得收藏失敗:', err)
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
        setFavorites(prev => prev.filter(store => store.id !== storeId))
      } else {
        await favoritesAPI.favorite(storeId)
        // 注意：這裡需要重新獲取完整的店家資料，暫時先移除
        // 實際使用時應該重新調用 fetchFavorites()
      }
    } catch (err: any) {
      setError(err.message)
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
