/**
 * 組件文檔和示例
 * 提供組件使用說明和示例代碼
 */

import React from 'react'
import { 
  StandardComponentProps, 
  InteractiveComponentProps, 
  DataComponentProps,
  MediaComponentProps,
  SocialComponentProps 
} from './interfaces'
import { 
  PageContainer, 
  Card, 
  List, 
  Form, 
  Loading, 
  ErrorState, 
  EmptyState 
} from './index'

// 組件文檔介面
export interface ComponentDocumentation {
  name: string
  description: string
  props: Array<{
    name: string
    type: string
    required: boolean
    description: string
    defaultValue?: any
  }>
  examples: Array<{
    title: string
    description: string
    code: string
  }>
  usage: string
  bestPractices: string[]
  commonMistakes: string[]
}

// 組件文檔生成器
export class ComponentDocumentationGenerator {
  static generateStandardComponentDocs(): ComponentDocumentation {
    return {
      name: 'StandardComponent',
      description: '標準組件，提供載入、錯誤、空狀態處理',
      props: [
        {
          name: 'loading',
          type: 'boolean',
          required: false,
          description: '是否顯示載入狀態',
          defaultValue: false
        },
        {
          name: 'error',
          type: 'string | null',
          required: false,
          description: '錯誤訊息',
          defaultValue: null
        },
        {
          name: 'onRetry',
          type: '() => void',
          required: false,
          description: '重試回調函數'
        },
        {
          name: 'isEmpty',
          type: 'boolean',
          required: false,
          description: '是否為空狀態',
          defaultValue: false
        },
        {
          name: 'emptyMessage',
          type: 'string',
          required: false,
          description: '空狀態訊息',
          defaultValue: '暫無資料'
        }
      ],
      examples: [
        {
          title: '基本使用',
          description: '最基本的標準組件使用方式',
          code: `
import { StandardComponent } from './components/Base'

function MyComponent() {
  return (
    <StandardComponent>
      <div>我的內容</div>
    </StandardComponent>
  )
}
          `
        },
        {
          title: '載入狀態',
          description: '顯示載入狀態的組件',
          code: `
import { StandardComponent } from './components/Base'

function MyComponent() {
  const [loading, setLoading] = useState(true)
  
  return (
    <StandardComponent loading={loading}>
      <div>我的內容</div>
    </StandardComponent>
  )
}
          `
        },
        {
          title: '錯誤狀態',
          description: '顯示錯誤狀態的組件',
          code: `
import { StandardComponent } from './components/Base'

function MyComponent() {
  const [error, setError] = useState(null)
  
  const handleRetry = () => {
    setError(null)
    // 重試邏輯
  }
  
  return (
    <StandardComponent 
      error={error} 
      onRetry={handleRetry}
    >
      <div>我的內容</div>
    </StandardComponent>
  )
}
          `
        }
      ],
      usage: '標準組件適用於需要統一處理載入、錯誤、空狀態的場景',
      bestPractices: [
        '總是提供有意義的空狀態訊息',
        '錯誤訊息應該簡潔明瞭',
        '重試按鈕應該有明確的動作',
        '載入狀態應該有適當的視覺反饋'
      ],
      commonMistakes: [
        '忘記處理空狀態',
        '錯誤訊息過於技術性',
        '載入狀態沒有視覺反饋',
        '重試按鈕沒有實際功能'
      ]
    }
  }

  static generateInteractiveComponentDocs(): ComponentDocumentation {
    return {
      name: 'InteractiveComponent',
      description: '交互組件，提供點擊、編輯等功能',
      props: [
        {
          name: 'onClick',
          type: '() => void',
          required: false,
          description: '點擊回調函數'
        },
        {
          name: 'disabled',
          type: 'boolean',
          required: false,
          description: '是否禁用',
          defaultValue: false
        },
        {
          name: 'editing',
          type: 'boolean',
          required: false,
          description: '是否處於編輯狀態',
          defaultValue: false
        },
        {
          name: 'onEdit',
          type: '() => void',
          required: false,
          description: '開始編輯回調函數'
        },
        {
          name: 'onSave',
          type: '(data: any) => void',
          required: false,
          description: '儲存回調函數'
        },
        {
          name: 'onCancel',
          type: '() => void',
          required: false,
          description: '取消編輯回調函數'
        },
        {
          name: 'onDelete',
          type: '() => void',
          required: false,
          description: '刪除回調函數'
        }
      ],
      examples: [
        {
          title: '基本交互',
          description: '基本的點擊交互',
          code: `
import { InteractiveComponent } from './components/Base'

function MyComponent() {
  const handleClick = () => {
    console.log('點擊了組件')
  }
  
  return (
    <InteractiveComponent onClick={handleClick}>
      <div>可點擊的內容</div>
    </InteractiveComponent>
  )
}
          `
        },
        {
          title: '編輯功能',
          description: '具有編輯功能的組件',
          code: `
import { InteractiveComponent } from './components/Base'

function MyComponent() {
  const [editing, setEditing] = useState(false)
  
  const handleEdit = () => setEditing(true)
  const handleSave = (data) => {
    console.log('儲存資料:', data)
    setEditing(false)
  }
  const handleCancel = () => setEditing(false)
  
  return (
    <InteractiveComponent 
      editing={editing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <div>可編輯的內容</div>
    </InteractiveComponent>
  )
}
          `
        }
      ],
      usage: '交互組件適用於需要用戶交互的場景，如表單、按鈕、可編輯內容等',
      bestPractices: [
        '提供清晰的視覺反饋',
        '禁用狀態應該有明確的視覺指示',
        '編輯模式應該有明確的進入和退出方式',
        '操作應該有確認機制'
      ],
      commonMistakes: [
        '沒有提供視覺反饋',
        '禁用狀態不明顯',
        '編輯模式混亂',
        '沒有操作確認'
      ]
    }
  }
}

// 組件示例生成器
export class ComponentExampleGenerator {
  static generateStandardExample(): React.ReactElement {
    return (
      <div>
        <h3>標準組件示例</h3>
        <StandardComponent 
          loading={false}
          error={null}
          isEmpty={false}
        >
          <div>這是標準組件的內容</div>
        </StandardComponent>
      </div>
    )
  }

  static generateInteractiveExample(): React.ReactElement {
    return (
      <div>
        <h3>交互組件示例</h3>
        <InteractiveComponent 
          onClick={() => console.log('點擊')}
          disabled={false}
          editing={false}
        >
          <div>這是交互組件的內容</div>
        </InteractiveComponent>
      </div>
    )
  }

  static generateDataExample(): React.ReactElement {
    return (
      <div>
        <h3>數據組件示例</h3>
        <DataComponent 
          searchQuery=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          placeholder="搜尋..."
          sortBy=""
          sortOrder="asc"
          onSortChange={() => {}}
          sortOptions={[]}
          currentPage={1}
          totalPages={1}
          pageSize={10}
          totalItems={0}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          filters={{}}
          onFilterChange={() => {}}
          filterOptions={{}}
          selectedItems={[]}
          onSelectionChange={() => {}}
          multiSelect={false}
          selectAll={false}
          onSelectAll={() => {}}
        >
          <div>這是數據組件的內容</div>
        </DataComponent>
      </div>
    )
  }
}

// 組件使用指南
export class ComponentUsageGuide {
  static getStandardUsageGuide(): string {
    return `
# 標準組件使用指南

## 概述
標準組件提供統一的載入、錯誤、空狀態處理，適用於大多數需要狀態管理的場景。

## 基本用法
\`\`\`tsx
import { StandardComponent } from './components/Base'

function MyComponent() {
  return (
    <StandardComponent>
      <div>我的內容</div>
    </StandardComponent>
  )
}
\`\`\`

## 狀態處理
### 載入狀態
\`\`\`tsx
<StandardComponent loading={true}>
  <div>我的內容</div>
</StandardComponent>
\`\`\`

### 錯誤狀態
\`\`\`tsx
<StandardComponent 
  error="發生錯誤" 
  onRetry={() => console.log('重試')}
>
  <div>我的內容</div>
</StandardComponent>
\`\`\`

### 空狀態
\`\`\`tsx
<StandardComponent 
  isEmpty={true}
  emptyMessage="暫無資料"
>
  <div>我的內容</div>
</StandardComponent>
\`\`\`

## 最佳實踐
1. 總是提供有意義的空狀態訊息
2. 錯誤訊息應該簡潔明瞭
3. 重試按鈕應該有明確的動作
4. 載入狀態應該有適當的視覺反饋

## 常見錯誤
1. 忘記處理空狀態
2. 錯誤訊息過於技術性
3. 載入狀態沒有視覺反饋
4. 重試按鈕沒有實際功能
    `
  }

  static getInteractiveUsageGuide(): string {
    return `
# 交互組件使用指南

## 概述
交互組件提供點擊、編輯等交互功能，適用於需要用戶交互的場景。

## 基本用法
\`\`\`tsx
import { InteractiveComponent } from './components/Base'

function MyComponent() {
  const handleClick = () => {
    console.log('點擊了組件')
  }
  
  return (
    <InteractiveComponent onClick={handleClick}>
      <div>可點擊的內容</div>
    </InteractiveComponent>
  )
}
\`\`\`

## 編輯功能
\`\`\`tsx
<InteractiveComponent 
  editing={editing}
  onEdit={() => setEditing(true)}
  onSave={(data) => {
    console.log('儲存資料:', data)
    setEditing(false)
  }}
  onCancel={() => setEditing(false)}
>
  <div>可編輯的內容</div>
</InteractiveComponent>
\`\`\`

## 最佳實踐
1. 提供清晰的視覺反饋
2. 禁用狀態應該有明確的視覺指示
3. 編輯模式應該有明確的進入和退出方式
4. 操作應該有確認機制

## 常見錯誤
1. 沒有提供視覺反饋
2. 禁用狀態不明顯
3. 編輯模式混亂
4. 沒有操作確認
    `
  }
}

// 組件遷移指南
export class ComponentMigrationGuide {
  static getMigrationSteps(): string {
    return `
# 組件遷移指南

## 遷移步驟

### 1. 識別現有組件
- 列出所有現有組件
- 識別組件的功能和狀態
- 確定組件類型（標準、交互、數據等）

### 2. 選擇新的組件架構
- 根據功能選擇合適的組件類型
- 確定需要的 Props 和狀態
- 選擇合適的混入和裝飾器

### 3. 重構組件
- 將現有組件轉換為新的架構
- 添加必要的狀態處理
- 實現統一的錯誤處理

### 4. 測試組件
- 使用統一的測試框架
- 測試所有狀態和交互
- 確保可訪問性

### 5. 文檔化
- 更新組件文檔
- 提供使用示例
- 記錄最佳實踐

## 遷移檢查清單
- [ ] 組件功能完整
- [ ] 狀態處理正確
- [ ] 錯誤處理完善
- [ ] 可訪問性符合標準
- [ ] 測試覆蓋率達標
- [ ] 文檔完整
- [ ] 性能優化
- [ ] 代碼質量檢查
    `
  }
}
