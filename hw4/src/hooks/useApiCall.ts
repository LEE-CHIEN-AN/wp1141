/**
 * 統一的 API 呼叫 Hook
 * 提供一致的 API 呼叫方式，包含重試機制和錯誤處理
 */

import { useCallback } from 'react'
import { useErrorHandler } from './useErrorHandler'

interface ApiCallOptions {
  retries?: number
  retryDelay?: number
  timeout?: number
  showSuccessMessage?: boolean
  successMessage?: string
}

export const useApiCall = () => {
  const { handleError, handleSuccess } = useErrorHandler()

  const apiCall = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    options: ApiCallOptions = {}
  ): Promise<T | null> => {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 10000,
      showSuccessMessage = false,
      successMessage = '操作成功'
    } = options

    let lastError: any

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 創建超時 Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('請求超時')), timeout)
        })

        // 執行 API 呼叫
        const result = await Promise.race([
          apiFunction(),
          timeoutPromise
        ])

        // 成功時顯示訊息
        if (showSuccessMessage && successMessage) {
          handleSuccess(successMessage)
        }

        return result
      } catch (error: any) {
        lastError = error

        // 如果不是最後一次嘗試，等待後重試
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
          continue
        }
      }
    }

    // 所有重試都失敗了
    handleError(lastError)
    return null
  }, [handleError, handleSuccess])

  // 專門用於資料載入的 API 呼叫
  const loadData = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    options: Omit<ApiCallOptions, 'showSuccessMessage'> = {}
  ): Promise<T | null> => {
    return apiCall(apiFunction, { ...options, showSuccessMessage: false })
  }, [apiCall])

  // 專門用於資料更新的 API 呼叫
  const updateData = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    successMessage: string = '更新成功',
    options: Omit<ApiCallOptions, 'showSuccessMessage' | 'successMessage'> = {}
  ): Promise<T | null> => {
    return apiCall(apiFunction, { 
      ...options, 
      showSuccessMessage: true, 
      successMessage 
    })
  }, [apiCall])

  // 專門用於資料刪除的 API 呼叫
  const deleteData = useCallback(async <T>(
    apiFunction: () => Promise<T>,
    successMessage: string = '刪除成功',
    options: Omit<ApiCallOptions, 'showSuccessMessage' | 'successMessage'> = {}
  ): Promise<T | null> => {
    return apiCall(apiFunction, { 
      ...options, 
      showSuccessMessage: true, 
      successMessage 
    })
  }, [apiCall])

  return {
    apiCall,
    loadData,
    updateData,
    deleteData
  }
}

/**
 * 批次 API 呼叫 Hook
 * 用於同時執行多個 API 呼叫
 */
export const useBatchApiCall = () => {
  const { handleError } = useErrorHandler()

  const batchCall = useCallback(async <T>(
    apiFunctions: Array<() => Promise<T>>,
    options: {
      failFast?: boolean // 是否在一個失敗時立即停止
      showSuccessMessage?: boolean
      successMessage?: string
    } = {}
  ): Promise<Array<T | null>> => {
    const { failFast = false, showSuccessMessage = false, successMessage = '批次操作完成' } = options

    const results: Array<T | null> = []
    const errors: any[] = []

    for (let i = 0; i < apiFunctions.length; i++) {
      try {
        const result = await apiFunctions[i]()
        results.push(result)
      } catch (error: any) {
        results.push(null)
        errors.push(error)

        if (failFast) {
          handleError(error)
          break
        }
      }
    }

    // 如果有錯誤且不是 failFast 模式，顯示錯誤
    if (errors.length > 0 && !failFast) {
      handleError(new Error(`批次操作完成，但有 ${errors.length} 個操作失敗`))
    }

    return results
  }, [handleError])

  return { batchCall }
}

/**
 * 樂觀更新 Hook
 * 用於在 API 呼叫前先更新 UI，失敗時回滾
 */
export const useOptimisticUpdate = () => {
  const { handleError } = useErrorHandler()

  const optimisticUpdate = useCallback(async <T>(
    optimisticUpdateFn: () => T,
    apiFunction: () => Promise<T>,
    rollbackFn: () => void,
    options: {
      showSuccessMessage?: boolean
      successMessage?: string
    } = {}
  ): Promise<T | null> => {
    const { showSuccessMessage = false, successMessage = '操作成功' } = options

    // 先執行樂觀更新
    optimisticUpdateFn()

    try {
      // 執行實際的 API 呼叫
      const result = await apiFunction()

      // 成功時顯示訊息
      if (showSuccessMessage && successMessage) {
        // handleSuccess(successMessage) // 這裡需要導入 handleSuccess
      }

      return result
    } catch (error: any) {
      // 失敗時回滾
      rollbackFn()
      handleError(error)
      return null
    }
  }, [handleError])

  return { optimisticUpdate }
}
