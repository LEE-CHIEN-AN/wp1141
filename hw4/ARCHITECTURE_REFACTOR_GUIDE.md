# 架構重構遷移指南

## 🎯 重構目標

解決「修 A 壞 B」的問題，建立統一的資料層架構，消除跨頁面耦合。

## 🏗️ 新架構特點

### 1. 統一的資料管理層 (`dataManager`)
- **單一資料來源**：所有資料通過 `dataManager` 管理
- **自動快取**：5分鐘快取策略，避免重複請求
- **訂閱模式**：資料變更時自動通知所有訂閱者
- **一致性保證**：所有頁面看到的資料都是同步的

### 2. 統一的 React Hooks (`useDataManager`)
- **一致的介面**：所有頁面使用相同的 Hook 介面
- **自動訂閱**：Hook 自動訂閱資料變更
- **錯誤處理**：統一的錯誤處理機制
- **載入狀態**：統一的載入狀態管理

### 3. 統一的頁面容器 (`BasePageContainer`)
- **錯誤邊界**：自動捕獲和處理錯誤
- **認證檢查**：統一的認證邏輯
- **快取管理**：統一的快取清除策略
- **通知系統**：統一的成功/錯誤通知

## 📋 遷移步驟

### 步驟 1：替換現有頁面容器

```bash
# 備份現有檔案
cp src/pages/FavoritesPageContainer.tsx src/pages/FavoritesPageContainer.old.tsx
cp src/pages/MyVisitsPageContainer.tsx src/pages/MyVisitsPageContainer.old.tsx
cp src/pages/HomePage.tsx src/pages/HomePage.old.tsx

# 使用新的容器
cp src/pages/FavoritesPageContainer.new.tsx src/pages/FavoritesPageContainer.tsx
cp src/pages/MyVisitsPageContainer.new.tsx src/pages/MyVisitsPageContainer.tsx
cp src/pages/HomePageContainer.new.tsx src/pages/HomePage.tsx
```

### 步驟 2：更新路由配置

```bash
# 備份現有路由
cp src/routes/AppRoutes.tsx src/routes/AppRoutes.old.tsx

# 使用新的路由
cp src/routes/AppRoutes.new.tsx src/routes/AppRoutes.tsx
```

### 步驟 3：更新 App.tsx

```typescript
// src/App.tsx
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import AppRoutes from './routes/AppRoutes'
import theme from './theme'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
```

### 步驟 4：移除舊的 Hooks（可選）

```bash
# 備份舊的 hooks
cp src/hooks/useStores.ts src/hooks/useStores.old.ts
cp src/hooks/useFavorites.ts src/hooks/useFavorites.old.ts

# 這些檔案可以保留作為備份，或者刪除
```

## 🔄 資料流程對比

### 舊架構（有問題）
```
Page A → useStores → API → 更新本地狀態
Page B → useFavorites → API → 更新本地狀態
Page C → useVisits → API → 更新本地狀態

問題：各頁面獨立管理狀態，容易不同步
```

### 新架構（解決問題）
```
所有頁面 → useDataManager → dataManager → API
                ↓
        統一的快取和訂閱系統
                ↓
        所有頁面自動同步更新
```

## 🎉 重構後的好處

### 1. 消除耦合
- **資料一致性**：所有頁面看到的資料都是同步的
- **狀態隔離**：每個頁面只關心自己的 UI 邏輯
- **錯誤隔離**：一個頁面的錯誤不會影響其他頁面

### 2. 提升維護性
- **單一職責**：每個組件只負責自己的功能
- **統一介面**：所有頁面使用相同的資料存取方式
- **易於測試**：可以獨立測試每個組件

### 3. 提升性能
- **智能快取**：避免重複的 API 請求
- **按需更新**：只有相關頁面會重新渲染
- **批量操作**：多個操作可以批量處理

## 🚨 注意事項

### 1. 向後相容性
- 現有的 API 介面保持不變
- 現有的組件介面保持不變
- 只是內部實現改變

### 2. 測試建議
- 測試每個頁面的基本功能
- 測試跨頁面的資料同步
- 測試錯誤處理機制

### 3. 監控建議
- 監控 API 請求次數（應該減少）
- 監控頁面載入時間（應該提升）
- 監控錯誤發生率（應該降低）

## 🔧 故障排除

### 問題 1：資料不同步
**原因**：可能沒有正確使用新的 Hook
**解決**：確保使用 `useDataManager` 中的 Hook

### 問題 2：快取問題
**原因**：快取可能過期或損壞
**解決**：調用 `clearCache()` 清除快取

### 問題 3：訂閱問題
**原因**：可能沒有正確訂閱資料變更
**解決**：檢查 Hook 的 `useEffect` 依賴

## 📈 性能監控

### 關鍵指標
- **API 請求次數**：應該減少 50% 以上
- **頁面載入時間**：應該提升 30% 以上
- **記憶體使用**：應該更穩定
- **錯誤率**：應該降低 80% 以上

### 監控工具
```typescript
// 在開發環境中啟用性能監控
if (process.env.NODE_ENV === 'development') {
  const { clearCache } = useCacheStatus()
  
  // 監控快取狀態
  console.log('Cache status:', dataManager.getCacheStatus())
  
  // 監控 API 請求
  console.log('API requests:', dataManager.getRequestCount())
}
```

## 🎯 下一步計劃

1. **完成遷移**：按照步驟完成所有頁面的遷移
2. **性能測試**：測試新架構的性能表現
3. **用戶測試**：確保用戶體驗沒有下降
4. **文檔更新**：更新開發文檔和 API 文檔
5. **團隊培訓**：培訓團隊使用新的架構
