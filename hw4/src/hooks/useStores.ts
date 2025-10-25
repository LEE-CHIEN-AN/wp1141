/**
 * 修復後的 useStores Hook
 * 簡化版本，避免複雜的狀態管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Store } from '../types'
import { storesAPI, favoritesAPI } from '../services/api'

export const useStores = (userFavorites?: string[]) => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userFavoritesRef = useRef<string[]>([])

  // 更新 ref 當 userFavorites 改變時
  useEffect(() => {
    userFavoritesRef.current = userFavorites || []
  }, [userFavorites])

  const fetchStores = useCallback(async (params: {
    bounds?: string
    q?: string
    tags?: string
    forceRefresh?: boolean
  } = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await storesAPI.getStores(params)
      
      // 處理 304 Not Modified 響應
      if (data === null) {
        // 304 響應，不更新狀態，返回空陣列
        console.log('使用快取的商店數據')
        return { items: [] }
      }
      
      const items = data.items || data
      
      // 根據用戶收藏狀態設定 isFavorite
      const storesWithFavorites = items.map((store: Store) => ({
        ...store,
        isFavorite: userFavoritesRef.current.includes(store.id)
      }))
      setStores(storesWithFavorites)
      
      return { items: storesWithFavorites }
    } catch (err: any) {
      const errorMessage = err.message || '載入商店資料失敗'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createStore = async (storeData: {
    name: string
    lat: number
    lng: number
    address?: string
    openingHours?: string
    tagNames?: string[]
    mainPhotoId?: string
    googleMapUrl?: string
    instagramUrl?: string
  }) => {
    try {
      const newStore = await storesAPI.createStore(storeData)
      const storeWithFavorite = {
        ...newStore,
        isFavorite: userFavorites?.includes(newStore.id) || false
      }
      setStores(prev => [storeWithFavorite, ...prev])
      return storeWithFavorite
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const toggleFavorite = async (storeId: string, isFavorited: boolean) => {
    try {
      if (isFavorited) {
        await favoritesAPI.unfavorite(storeId)
      } else {
        await favoritesAPI.favorite(storeId)
      }
      
      // 更新本地狀態
      setStores(prev => prev.map(store => 
        store.id === storeId 
          ? { ...store, isFavorite: !isFavorited }
          : store
      ))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  // 當用戶收藏狀態改變時，更新 stores 的收藏狀態
  useEffect(() => {
    if (userFavorites) {
      setStores(prev => prev.map(store => ({
        ...store,
        isFavorite: userFavorites.includes(store.id)
      })))
    } else {
      setStores(prev => prev.map(store => ({
        ...store,
        isFavorite: false
      })))
    }
  }, [userFavorites])

  // 移除初始載入，讓調用者控制何時載入

  return {
    stores,
    loading,
    error,
    fetchStores,
    createStore,
    toggleFavorite,
  }
}