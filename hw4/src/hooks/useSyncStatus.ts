/**
 * 資料同步狀態監控 Hook
 * 提供資料同步狀態的可視化監控
 */

import { useState, useEffect } from 'react'
import { dataSyncManager } from './useDataSync'

interface SyncStatus {
  stores: {
    isLoading: boolean
    error: string | null
    lastUpdated: number
    count: number
  }
  favorites: {
    isLoading: boolean
    error: string | null
    lastUpdated: number
    count: number
  }
  visits: {
    isLoading: boolean
    error: string | null
    lastUpdated: number
    count: number
  }
}

export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => 
    dataSyncManager.getCacheStatus()
  )

  useEffect(() => {
    // 訂閱所有資料變更
    const unsubscribeStores = dataSyncManager.subscribe('stores', () => {
      setSyncStatus(dataSyncManager.getCacheStatus())
    })

    const unsubscribeFavorites = dataSyncManager.subscribe('favorites', () => {
      setSyncStatus(dataSyncManager.getCacheStatus())
    })

    const unsubscribeVisits = dataSyncManager.subscribe('visits', () => {
      setSyncStatus(dataSyncManager.getCacheStatus())
    })

    return () => {
      unsubscribeStores()
      unsubscribeFavorites()
      unsubscribeVisits()
    }
  }, [])

  // 檢查是否有任何資料正在載入
  const isAnyLoading = syncStatus.stores.isLoading || 
                      syncStatus.favorites.isLoading || 
                      syncStatus.visits.isLoading

  // 檢查是否有任何錯誤
  const hasAnyError = syncStatus.stores.error || 
                     syncStatus.favorites.error || 
                     syncStatus.visits.error

  // 獲取最後更新時間
  const getLastUpdated = (type: 'stores' | 'favorites' | 'visits') => {
    const timestamp = syncStatus[type].lastUpdated
    if (timestamp === 0) return null
    return new Date(timestamp)
  }

  // 檢查快取是否過期（5分鐘）
  const isCacheExpired = (type: 'stores' | 'favorites' | 'visits') => {
    const lastUpdated = syncStatus[type].lastUpdated
    if (lastUpdated === 0) return true
    return Date.now() - lastUpdated > 5 * 60 * 1000
  }

  // 獲取資料統計
  const getDataStats = () => {
    return {
      totalStores: syncStatus.stores.count,
      totalFavorites: syncStatus.favorites.count,
      totalVisits: syncStatus.visits.count,
      isLoading: isAnyLoading,
      hasError: hasAnyError
    }
  }

  return {
    syncStatus,
    isAnyLoading,
    hasAnyError,
    getLastUpdated,
    isCacheExpired,
    getDataStats
  }
}

/**
 * 資料同步指示器組件
 * 顯示資料同步狀態的視覺指示器
 */
export const useSyncIndicator = () => {
  const { isAnyLoading, hasAnyError, getDataStats } = useSyncStatus()

  const getIndicatorStatus = () => {
    if (hasAnyError) return 'error'
    if (isAnyLoading) return 'loading'
    return 'success'
  }

  const getIndicatorMessage = () => {
    if (hasAnyError) return '資料同步錯誤'
    if (isAnyLoading) return '正在同步資料...'
    return '資料已同步'
  }

  return {
    status: getIndicatorStatus(),
    message: getIndicatorMessage(),
    stats: getDataStats()
  }
}
