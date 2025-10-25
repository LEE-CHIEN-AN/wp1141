/**
 * 共用的狀態管理 Hook
 * 提供統一的狀態管理模式，減少重複代碼
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// 通用狀態介面
interface BaseState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: number
}

// 狀態管理選項
interface StateManagerOptions {
  enableCache?: boolean
  cacheTimeout?: number // 毫秒
  autoRetry?: boolean
  retryCount?: number
  retryDelay?: number
}

// 狀態管理器類
class StateManager<T> {
  private state: BaseState<T> = {
    data: null,
    loading: false,
    error: null,
    lastUpdated: 0
  }

  private listeners: Set<(state: BaseState<T>) => void> = new Set()
  private options: StateManagerOptions

  constructor(options: StateManagerOptions = {}) {
    this.options = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5分鐘
      autoRetry: false,
      retryCount: 3,
      retryDelay: 1000,
      ...options
    }
  }

  // 訂閱狀態變更
  subscribe(listener: (state: BaseState<T>) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // 通知所有訂閱者
  private notify() {
    this.listeners.forEach(listener => listener(this.state))
  }

  // 更新狀態
  private updateState(updates: Partial<BaseState<T>>) {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  // 檢查快取是否有效
  private isCacheValid(): boolean {
    if (!this.options.enableCache) return false
    return Date.now() - this.state.lastUpdated < this.options.cacheTimeout!
  }

  // 設置載入狀態
  setLoading(loading: boolean) {
    this.updateState({ loading })
  }

  // 設置資料
  setData(data: T) {
    this.updateState({
      data,
      loading: false,
      error: null,
      lastUpdated: Date.now()
    })
  }

  // 設置錯誤
  setError(error: string) {
    this.updateState({
      error,
      loading: false
    })
  }

  // 清除錯誤
  clearError() {
    this.updateState({ error: null })
  }

  // 重置狀態
  reset() {
    this.updateState({
      data: null,
      loading: false,
      error: null,
      lastUpdated: 0
    })
  }

  // 獲取當前狀態
  getState(): BaseState<T> {
    return { ...this.state }
  }

  // 執行異步操作
  async execute<TResult>(
    operation: () => Promise<TResult>,
    options: {
      useCache?: boolean
      onSuccess?: (result: TResult) => void
      onError?: (error: any) => void
    } = {}
  ): Promise<TResult | null> {
    const { useCache = true, onSuccess, onError } = options

    // 如果使用快取且快取有效，返回快取資料
    if (useCache && this.isCacheValid() && this.state.data) {
      return this.state.data as unknown as TResult
    }

    this.setLoading(true)
    this.clearError()

    try {
      const result = await operation()
      this.setData(result as unknown as T)
      onSuccess?.(result)
      return result
    } catch (error: any) {
      const errorMessage = error?.message || '操作失敗'
      this.setError(errorMessage)
      onError?.(error)
      return null
    }
  }

  // 重試機制
  async executeWithRetry<TResult>(
    operation: () => Promise<TResult>,
    options: {
      useCache?: boolean
      onSuccess?: (result: TResult) => void
      onError?: (error: any) => void
    } = {}
  ): Promise<TResult | null> {
    const { useCache = true, onSuccess, onError } = options

    if (!this.options.autoRetry) {
      return this.execute(operation, options)
    }

    let lastError: any
    const retryCount = this.options.retryCount!

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.execute(operation, { useCache: false, onSuccess, onError })
        if (result) return result
      } catch (error: any) {
        lastError = error
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelay! * (attempt + 1)))
        }
      }
    }

    onError?.(lastError)
    return null
  }
}

// 使用狀態管理的 Hook
export const useStateManager = <T>(
  options: StateManagerOptions = {}
) => {
  const managerRef = useRef<StateManager<T> | null>(null)
  
  if (!managerRef.current) {
    managerRef.current = new StateManager<T>(options)
  }

  const [state, setState] = useState<BaseState<T>>(managerRef.current.getState())

  useEffect(() => {
    const unsubscribe = managerRef.current!.subscribe(setState)
    return unsubscribe
  }, [])

  return {
    ...state,
    setLoading: useCallback((loading: boolean) => {
      managerRef.current!.setLoading(loading)
    }, []),
    setData: useCallback((data: T) => {
      managerRef.current!.setData(data)
    }, []),
    setError: useCallback((error: string) => {
      managerRef.current!.setError(error)
    }, []),
    clearError: useCallback(() => {
      managerRef.current!.clearError()
    }, []),
    reset: useCallback(() => {
      managerRef.current!.reset()
    }, []),
    execute: useCallback(async <TResult>(
      operation: () => Promise<TResult>,
      options: {
        useCache?: boolean
        onSuccess?: (result: TResult) => void
        onError?: (error: any) => void
      } = {}
    ) => {
      return managerRef.current!.execute(operation, options)
    }, []),
    executeWithRetry: useCallback(async <TResult>(
      operation: () => Promise<TResult>,
      options: {
        useCache?: boolean
        onSuccess?: (result: TResult) => void
        onError?: (error: any) => void
      } = {}
    ) => {
      return managerRef.current!.executeWithRetry(operation, options)
    }, [])
  }
}

// 專門用於 API 呼叫的狀態管理 Hook
export const useApiState = <T>(
  options: StateManagerOptions = {}
) => {
  const stateManager = useStateManager<T>({
    enableCache: true,
    cacheTimeout: 5 * 60 * 1000,
    autoRetry: true,
    retryCount: 3,
    retryDelay: 1000,
    ...options
  })

  return stateManager
}

// 專門用於表單狀態的狀態管理 Hook
export const useFormState = <T extends Record<string, any>>(
  initialData: T,
  options: StateManagerOptions = {}
) => {
  const stateManager = useStateManager<T>({
    enableCache: false,
    autoRetry: false,
    ...options
  })

  // 初始化表單資料
  useEffect(() => {
    stateManager.setData(initialData)
  }, [initialData])

  const updateField = useCallback((field: keyof T, value: any) => {
    const currentData = stateManager.data || initialData
    stateManager.setData({
      ...currentData,
      [field]: value
    })
  }, [stateManager, initialData])

  const updateFields = useCallback((updates: Partial<T>) => {
    const currentData = stateManager.data || initialData
    stateManager.setData({
      ...currentData,
      ...updates
    })
  }, [stateManager, initialData])

  const resetForm = useCallback(() => {
    stateManager.setData(initialData)
    stateManager.clearError()
  }, [stateManager, initialData])

  return {
    ...stateManager,
    updateField,
    updateFields,
    resetForm
  }
}

// 專門用於列表狀態的狀態管理 Hook
export const useListState = <T>(
  options: StateManagerOptions = {}
) => {
  const stateManager = useStateManager<T[]>({
    enableCache: true,
    cacheTimeout: 5 * 60 * 1000,
    autoRetry: true,
    retryCount: 3,
    retryDelay: 1000,
    ...options
  })

  const addItem = useCallback((item: T) => {
    const currentList = stateManager.data || []
    stateManager.setData([...currentList, item])
  }, [stateManager])

  const updateItem = useCallback((index: number, item: T) => {
    const currentList = stateManager.data || []
    const newList = [...currentList]
    newList[index] = item
    stateManager.setData(newList)
  }, [stateManager])

  const removeItem = useCallback((index: number) => {
    const currentList = stateManager.data || []
    const newList = currentList.filter((_, i) => i !== index)
    stateManager.setData(newList)
  }, [stateManager])

  const findAndUpdateItem = useCallback((predicate: (item: T) => boolean, updates: Partial<T>) => {
    const currentList = stateManager.data || []
    const newList = currentList.map(item => 
      predicate(item) ? { ...item, ...updates } : item
    )
    stateManager.setData(newList)
  }, [stateManager])

  const findAndRemoveItem = useCallback((predicate: (item: T) => boolean) => {
    const currentList = stateManager.data || []
    const newList = currentList.filter(item => !predicate(item))
    stateManager.setData(newList)
  }, [stateManager])

  return {
    ...stateManager,
    addItem,
    updateItem,
    removeItem,
    findAndUpdateItem,
    findAndRemoveItem
  }
}
