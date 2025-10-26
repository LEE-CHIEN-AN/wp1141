# 漸進式架構改善計劃

## 🎯 目標
解決「修 A 壞 B」的問題，採用漸進式改善方式，確保現有功能正常運作。

## 📋 改善階段

### 階段 1：統一錯誤處理 (優先級：高)
**問題**：各頁面獨立處理錯誤，沒有統一的錯誤處理機制
**解決方案**：
- 創建統一的錯誤處理 Hook
- 統一 Toast 通知系統
- 添加錯誤邊界組件

### 階段 2：改善資料同步 (優先級：高)
**問題**：各頁面獨立管理狀態，容易不同步
**解決方案**：
- 改善現有 Hooks 的資料同步
- 添加資料失效機制
- 統一 API 呼叫方式

### 階段 3：優化狀態管理 (優先級：中)
**問題**：狀態散佈在各個組件中
**解決方案**：
- 集中化狀態管理
- 添加狀態快取
- 改善狀態更新邏輯

### 階段 4：重構組件架構 (優先級：低)
**問題**：組件職責不清，耦合度高
**解決方案**：
- 分離容器組件和展示組件
- 統一組件介面
- 改善組件複用性

## 🚀 實施步驟

### 步驟 1：統一錯誤處理
1. 創建 `useErrorHandler` Hook
2. 創建 `ErrorBoundary` 組件
3. 統一 Toast 通知系統
4. 在各頁面中應用

### 步驟 2：改善資料同步
1. 分析現有 Hooks 的資料流
2. 添加資料失效機制
3. 統一 API 呼叫方式
4. 測試資料同步效果

### 步驟 3：優化狀態管理
1. 識別重複的狀態邏輯
2. 創建共用的狀態管理 Hook
3. 添加狀態快取機制
4. 測試狀態一致性

### 步驟 4：重構組件架構
1. 分離容器組件和展示組件
2. 統一組件介面
3. 改善組件複用性
4. 測試組件功能

## 📊 成功指標

### 階段 1 成功指標
- [ ] 統一的錯誤處理機制
- [ ] 一致的 Toast 通知
- [ ] 錯誤邊界正常工作
- [ ] 錯誤不會影響其他頁面

### 階段 2 成功指標
- [ ] 資料同步正常
- [ ] API 呼叫統一
- [ ] 資料失效機制正常
- [ ] 跨頁面資料一致性

### 階段 3 成功指標
- [ ] 狀態管理集中化
- [ ] 狀態快取正常
- [ ] 狀態更新邏輯清晰
- [ ] 性能提升明顯

### 階段 4 成功指標
- [ ] 組件職責清晰
- [ ] 組件複用性提升
- [ ] 組件介面統一
- [ ] 維護性提升

## 🔧 技術方案

### 統一錯誤處理
```typescript
// useErrorHandler Hook
export const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'error'
  })

  const handleError = (error: any) => {
    const message = error.message || '發生未知錯誤'
    setError(message)
    setSnackbar({
      open: true,
      message,
      severity: 'error'
    })
  }

  const clearError = () => {
    setError(null)
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  return { error, snackbar, handleError, clearError }
}
```

### 改善資料同步
```typescript
// 改善現有 Hook
export const useStores = (params = {}) => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await storesAPI.getStores(params)
      setStores(data.items || data)
    } catch (err: any) {
      setError(err.message)
      throw err // 重新拋出錯誤供上層處理
    } finally {
      setLoading(false)
    }
  }, [params.bounds, params.q, params.tags])

  // 添加資料失效機制
  const invalidateStores = useCallback(() => {
    fetchStores()
  }, [fetchStores])

  return {
    stores,
    loading,
    error,
    refetch: fetchStores,
    invalidate: invalidateStores
  }
}
```

### 狀態管理優化
```typescript
// 共用的狀態管理
export const useAppState = () => {
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    globalError,
    setGlobalError,
    isOnline
  }
}
```

## 📈 預期效果

### 短期效果 (1-2 週)
- 錯誤處理統一化
- 資料同步改善
- 開發體驗提升

### 中期效果 (1 個月)
- 狀態管理優化
- 性能提升
- 維護性改善

### 長期效果 (2-3 個月)
- 架構清晰化
- 組件複用性提升
- 開發效率提升

## 🎉 總結

漸進式改善的優勢：
1. **風險低**：每次只改善一個方面，不會破壞現有功能
2. **可測試**：每個階段都可以獨立測試
3. **可回滾**：如果出現問題，可以快速回滾
4. **持續改善**：可以根據實際情況調整改善計劃

這個計劃將幫助我們逐步解決「修 A 壞 B」的問題，同時保持系統的穩定性。
