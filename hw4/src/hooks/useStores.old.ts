import { useState, useEffect, useCallback } from 'react'
import { Store } from '../types'
import { storesAPI, favoritesAPI } from '../services/api'

export const useStores = (userFavorites?: string[]) => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStores = useCallback(async (params: {
    bounds?: string
    q?: string
    tags?: string
  } = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await storesAPI.getStores(params)
      // 根據用戶收藏狀態設定 isFavorite
      const storesWithFavorites = data.items.map(store => ({
        ...store,
        isFavorite: userFavorites?.includes(store.id) || false
      }))
      setStores(storesWithFavorites)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userFavorites])

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

  return {
    stores,
    loading,
    error,
    fetchStores,
    createStore,
    toggleFavorite,
  }
}
