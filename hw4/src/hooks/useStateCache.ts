/**
 * 狀態快取機制
 * 提供智能的狀態快取和失效管理
 */

import { useRef, useCallback, useEffect } from 'react'

// 快取項目介面
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time To Live (毫秒)
  accessCount: number
  lastAccessed: number
}

// 快取配置
interface CacheConfig {
  maxSize?: number
  defaultTTL?: number
  cleanupInterval?: number
}

// 狀態快取管理器
class StateCacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private config: Required<CacheConfig>

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5分鐘
      cleanupInterval: 60 * 1000, // 1分鐘
      ...config
    }

    // 定期清理過期項目
    setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  // 設置快取
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    }

    // 如果快取已滿，移除最舊的項目
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, item)
  }

  // 獲取快取
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    
    // 檢查是否過期
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    // 更新訪問統計
    item.accessCount++
    item.lastAccessed = now

    return item.data
  }

  // 檢查快取是否存在且有效
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // 刪除快取
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // 清除所有快取
  clear(): void {
    this.cache.clear()
  }

  // 獲取快取統計
  getStats() {
    const now = Date.now()
    let totalSize = 0
    let expiredCount = 0
    let totalAccessCount = 0

    for (const [key, item] of this.cache.entries()) {
      totalSize++
      totalAccessCount += item.accessCount
      
      if (now - item.timestamp > item.ttl) {
        expiredCount++
      }
    }

    return {
      totalSize,
      expiredCount,
      totalAccessCount,
      hitRate: totalAccessCount > 0 ? (totalSize - expiredCount) / totalAccessCount : 0
    }
  }

  // 清理過期項目
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // 移除最舊的項目
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

// 導出單例實例
export const stateCacheManager = new StateCacheManager()

// 使用狀態快取的 Hook
export const useStateCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    enabled?: boolean
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
  } = {}
) => {
  const { ttl, enabled = true, onSuccess, onError } = options
  const fetcherRef = useRef(fetcher)
  const isFetchingRef = useRef(false)

  // 更新 fetcher 引用
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  // 獲取資料
  const getData = useCallback(async (): Promise<T | null> => {
    if (!enabled) return null

    // 檢查快取
    const cachedData = stateCacheManager.get<T>(key)
    if (cachedData) {
      return cachedData
    }

    // 如果正在獲取，等待完成
    if (isFetchingRef.current) {
      return new Promise((resolve) => {
        const checkCache = () => {
          const data = stateCacheManager.get<T>(key)
          if (data) {
            resolve(data)
          } else if (!isFetchingRef.current) {
            resolve(null)
          } else {
            setTimeout(checkCache, 100)
          }
        }
        checkCache()
      })
    }

    // 開始獲取資料
    isFetchingRef.current = true

    try {
      const data = await fetcherRef.current()
      stateCacheManager.set(key, data, ttl)
      onSuccess?.(data)
      return data
    } catch (error: any) {
      onError?.(error)
      return null
    } finally {
      isFetchingRef.current = false
    }
  }, [key, ttl, enabled, onSuccess, onError])

  // 預載入資料
  const preload = useCallback(async (): Promise<void> => {
    await getData()
  }, [getData])

  // 失效快取
  const invalidate = useCallback(() => {
    stateCacheManager.delete(key)
  }, [key])

  // 更新快取
  const updateCache = useCallback((data: T) => {
    stateCacheManager.set(key, data, ttl)
  }, [key, ttl])

  // 獲取快取狀態
  const getCacheStatus = useCallback(() => {
    return {
      hasCache: stateCacheManager.has(key),
      data: stateCacheManager.get<T>(key),
      stats: stateCacheManager.getStats()
    }
  }, [key])

  return {
    getData,
    preload,
    invalidate,
    updateCache,
    getCacheStatus
  }
}

// 使用多個狀態快取的 Hook
export const useStateCacheBatch = <T>(
  keys: string[],
  fetchers: Record<string, () => Promise<T>>,
  options: {
    ttl?: number
    enabled?: boolean
    onSuccess?: (key: string, data: T) => void
    onError?: (key: string, error: any) => void
  } = {}
) => {
  const { ttl, enabled = true, onSuccess, onError } = options

  // 獲取所有資料
  const getAllData = useCallback(async (): Promise<Record<string, T | null>> => {
    if (!enabled) return {}

    const results: Record<string, T | null> = {}
    const promises: Promise<void>[] = []

    keys.forEach(key => {
      const promise = (async () => {
        try {
          const cachedData = stateCacheManager.get<T>(key)
          if (cachedData) {
            results[key] = cachedData
            return
          }

          const fetcher = fetchers[key]
          if (!fetcher) {
            results[key] = null
            return
          }

          const data = await fetcher()
          stateCacheManager.set(key, data, ttl)
          results[key] = data
          onSuccess?.(key, data)
        } catch (error: any) {
          results[key] = null
          onError?.(key, error)
        }
      })()
      promises.push(promise)
    })

    await Promise.all(promises)
    return results
  }, [keys, fetchers, ttl, enabled, onSuccess, onError])

  // 失效所有快取
  const invalidateAll = useCallback(() => {
    keys.forEach(key => stateCacheManager.delete(key))
  }, [keys])

  // 更新特定快取
  const updateCache = useCallback((key: string, data: T) => {
    stateCacheManager.set(key, data, ttl)
  }, [ttl])

  return {
    getAllData,
    invalidateAll,
    updateCache
  }
}

// 狀態快取統計 Hook
export const useStateCacheStats = () => {
  const getStats = useCallback(() => {
    return stateCacheManager.getStats()
  }, [])

  const clearCache = useCallback(() => {
    stateCacheManager.clear()
  }, [])

  return {
    getStats,
    clearCache
  }
}
