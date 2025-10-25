/**
 * 組件測試框架
 * 提供統一的組件測試工具和方法
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { 
  StandardComponentProps, 
  InteractiveComponentProps, 
  DataComponentProps,
  MediaComponentProps,
  SocialComponentProps 
} from './interfaces'

// 測試工具類
export class ComponentTestUtils {
  // 創建測試環境
  static createTestEnvironment(component: React.ReactElement) {
    return render(component)
  }

  // 查找元素
  static findByTestId(testId: string) {
    return screen.getByTestId(testId)
  }

  static findByText(text: string) {
    return screen.getByText(text)
  }

  static findByRole(role: string) {
    return screen.getByRole(role)
  }

  // 等待元素出現
  static async waitForElement(testId: string, timeout = 1000) {
    return await waitFor(() => screen.getByTestId(testId), { timeout })
  }

  // 模擬用戶交互
  static click(element: HTMLElement) {
    fireEvent.click(element)
  }

  static type(element: HTMLElement, text: string) {
    fireEvent.change(element, { target: { value: text } })
  }

  static submit(form: HTMLElement) {
    fireEvent.submit(form)
  }

  // 創建模擬 Props
  static createMockStandardProps(): StandardComponentProps {
    return {
      loading: false,
      error: null,
      isEmpty: false,
      emptyMessage: '暫無資料',
      testId: 'test-standard'
    }
  }

  static createMockInteractiveProps(): InteractiveComponentProps {
    return {
      ...this.createMockStandardProps(),
      onClick: jest.fn(),
      disabled: false,
      editing: false,
      onEdit: jest.fn(),
      onSave: jest.fn(),
      onCancel: jest.fn(),
      onDelete: jest.fn()
    }
  }

  static createMockDataProps(): DataComponentProps {
    return {
      ...this.createMockStandardProps(),
      searchQuery: '',
      onSearchChange: jest.fn(),
      onSearchSubmit: jest.fn(),
      placeholder: '搜尋...',
      searchLoading: false,
      sortBy: '',
      sortOrder: 'asc',
      onSortChange: jest.fn(),
      sortOptions: [],
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      totalItems: 0,
      onPageChange: jest.fn(),
      onPageSizeChange: jest.fn(),
      filters: {},
      onFilterChange: jest.fn(),
      filterOptions: {},
      selectedItems: [],
      onSelectionChange: jest.fn(),
      multiSelect: false,
      selectAll: false,
      onSelectAll: jest.fn()
    }
  }
}

// 測試用例生成器
export class TestCaseGenerator {
  // 生成標準組件測試用例
  static generateStandardTests(
    Component: React.ComponentType<StandardComponentProps>,
    componentName: string
  ) {
    describe(`${componentName} Standard Tests`, () => {
      test('renders without crashing', () => {
        const props = ComponentTestUtils.createMockStandardProps()
        render(<Component {...props} />)
        expect(screen.getByTestId('test-standard')).toBeInTheDocument()
      })

      test('shows loading state', () => {
        const props = ComponentTestUtils.createMockStandardProps()
        props.loading = true
        render(<Component {...props} />)
        expect(screen.getByText('載入中...')).toBeInTheDocument()
      })

      test('shows error state', () => {
        const props = ComponentTestUtils.createMockStandardProps()
        props.error = '測試錯誤'
        props.onRetry = jest.fn()
        render(<Component {...props} />)
        expect(screen.getByText('錯誤：測試錯誤')).toBeInTheDocument()
        expect(screen.getByText('重試')).toBeInTheDocument()
      })

      test('shows empty state', () => {
        const props = ComponentTestUtils.createMockStandardProps()
        props.isEmpty = true
        props.emptyMessage = '測試空狀態'
        render(<Component {...props} />)
        expect(screen.getByText('測試空狀態')).toBeInTheDocument()
      })

      test('handles retry action', () => {
        const props = ComponentTestUtils.createMockStandardProps()
        props.error = '測試錯誤'
        props.onRetry = jest.fn()
        render(<Component {...props} />)
        
        const retryButton = screen.getByText('重試')
        ComponentTestUtils.click(retryButton)
        
        expect(props.onRetry).toHaveBeenCalledTimes(1)
      })
    })
  }

  // 生成交互組件測試用例
  static generateInteractiveTests(
    Component: React.ComponentType<InteractiveComponentProps>,
    componentName: string
  ) {
    describe(`${componentName} Interactive Tests`, () => {
      test('handles click events', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        render(<Component {...props} />)
        
        const clickableElement = screen.getByTestId('test-standard')
        ComponentTestUtils.click(clickableElement)
        
        expect(props.onClick).toHaveBeenCalledTimes(1)
      })

      test('handles disabled state', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        props.disabled = true
        render(<Component {...props} />)
        
        const clickableElement = screen.getByTestId('test-standard')
        expect(clickableElement).toBeDisabled()
      })

      test('handles editing state', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        props.editing = true
        render(<Component {...props} />)
        
        // 檢查編輯模式下的元素
        expect(screen.getByText('編輯中')).toBeInTheDocument()
      })

      test('handles edit actions', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        render(<Component {...props} />)
        
        const editButton = screen.getByText('編輯')
        ComponentTestUtils.click(editButton)
        
        expect(props.onEdit).toHaveBeenCalledTimes(1)
      })

      test('handles save actions', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        props.editing = true
        render(<Component {...props} />)
        
        const saveButton = screen.getByText('儲存')
        ComponentTestUtils.click(saveButton)
        
        expect(props.onSave).toHaveBeenCalledTimes(1)
      })

      test('handles cancel actions', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        props.editing = true
        render(<Component {...props} />)
        
        const cancelButton = screen.getByText('取消')
        ComponentTestUtils.click(cancelButton)
        
        expect(props.onCancel).toHaveBeenCalledTimes(1)
      })

      test('handles delete actions', () => {
        const props = ComponentTestUtils.createMockInteractiveProps()
        render(<Component {...props} />)
        
        const deleteButton = screen.getByText('刪除')
        ComponentTestUtils.click(deleteButton)
        
        expect(props.onDelete).toHaveBeenCalledTimes(1)
      })
    })
  }

  // 生成數據組件測試用例
  static generateDataTests(
    Component: React.ComponentType<DataComponentProps>,
    componentName: string
  ) {
    describe(`${componentName} Data Tests`, () => {
      test('handles search functionality', () => {
        const props = ComponentTestUtils.createMockDataProps()
        render(<Component {...props} />)
        
        const searchInput = screen.getByPlaceholderText('搜尋...')
        ComponentTestUtils.type(searchInput, '測試搜尋')
        
        expect(props.onSearchChange).toHaveBeenCalledWith('測試搜尋')
      })

      test('handles search submission', () => {
        const props = ComponentTestUtils.createMockDataProps()
        render(<Component {...props} />)
        
        const searchForm = screen.getByRole('form')
        ComponentTestUtils.submit(searchForm)
        
        expect(props.onSearchSubmit).toHaveBeenCalledWith('')
      })

      test('handles sorting', () => {
        const props = ComponentTestUtils.createMockDataProps()
        props.sortOptions = [
          { value: 'name', label: '名稱' },
          { value: 'date', label: '日期' }
        ]
        render(<Component {...props} />)
        
        const sortSelect = screen.getByRole('combobox')
        ComponentTestUtils.click(sortSelect)
        
        const nameOption = screen.getByText('名稱')
        ComponentTestUtils.click(nameOption)
        
        expect(props.onSortChange).toHaveBeenCalledWith('name', 'asc')
      })

      test('handles pagination', () => {
        const props = ComponentTestUtils.createMockDataProps()
        props.totalPages = 5
        render(<Component {...props} />)
        
        const nextButton = screen.getByText('下一頁')
        ComponentTestUtils.click(nextButton)
        
        expect(props.onPageChange).toHaveBeenCalledWith(2)
      })

      test('handles filtering', () => {
        const props = ComponentTestUtils.createMockDataProps()
        props.filterOptions = {
          category: [
            { value: 'food', label: '食物' },
            { value: 'drink', label: '飲料' }
          ]
        }
        render(<Component {...props} />)
        
        const filterSelect = screen.getByLabelText('分類')
        ComponentTestUtils.click(filterSelect)
        
        const foodOption = screen.getByText('食物')
        ComponentTestUtils.click(foodOption)
        
        expect(props.onFilterChange).toHaveBeenCalledWith({ category: 'food' })
      })

      test('handles selection', () => {
        const props = ComponentTestUtils.createMockDataProps()
        props.multiSelect = true
        render(<Component {...props} />)
        
        const selectAllCheckbox = screen.getByLabelText('全選')
        ComponentTestUtils.click(selectAllCheckbox)
        
        expect(props.onSelectAll).toHaveBeenCalledWith(true)
      })
    })
  }
}

// 性能測試工具
export class PerformanceTestUtils {
  // 測量組件渲染時間
  static measureRenderTime(component: React.ReactElement): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now()
      
      render(component)
      
      // 等待下一個事件循環
      setTimeout(() => {
        const endTime = performance.now()
        resolve(endTime - startTime)
      }, 0)
    })
  }

  // 測量組件更新時間
  static measureUpdateTime(
    component: React.ReactElement,
    updateProps: Record<string, any>
  ): Promise<number> {
    return new Promise((resolve) => {
      const { rerender } = render(component)
      
      const startTime = performance.now()
      rerender({ ...component.props, ...updateProps })
      
      setTimeout(() => {
        const endTime = performance.now()
        resolve(endTime - startTime)
      }, 0)
    })
  }

  // 測量組件記憶體使用
  static measureMemoryUsage(): Promise<number> {
    return new Promise((resolve) => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        resolve(memory.usedJSHeapSize)
      } else {
        resolve(0)
      }
    })
  }
}

// 可訪問性測試工具
export class AccessibilityTestUtils {
  // 檢查可訪問性
  static async checkAccessibility(component: React.ReactElement) {
    const { container } = render(component)
    
    // 檢查 ARIA 標籤
    const elementsWithAria = container.querySelectorAll('[aria-label], [aria-labelledby]')
    expect(elementsWithAria.length).toBeGreaterThan(0)
    
    // 檢查鍵盤導航
    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    )
    expect(focusableElements.length).toBeGreaterThan(0)
    
    // 檢查顏色對比度
    const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6')
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // 這裡可以添加顏色對比度檢查邏輯
      expect(color).toBeDefined()
      expect(backgroundColor).toBeDefined()
    })
  }

  // 檢查鍵盤導航
  static async checkKeyboardNavigation(component: React.ReactElement) {
    const { container } = render(component)
    
    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    )
    
    // 測試 Tab 鍵導航
    for (let i = 0; i < focusableElements.length; i++) {
      const element = focusableElements[i] as HTMLElement
      element.focus()
      expect(document.activeElement).toBe(element)
    }
  }
}

// 測試報告生成器
export class TestReportGenerator {
  static generateReport(testResults: any[]) {
    const report = {
      total: testResults.length,
      passed: testResults.filter(result => result.status === 'passed').length,
      failed: testResults.filter(result => result.status === 'failed').length,
      skipped: testResults.filter(result => result.status === 'skipped').length,
      duration: testResults.reduce((sum, result) => sum + result.duration, 0),
      results: testResults
    }

    return report
  }

  static generateHTMLReport(report: any) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>組件測試報告</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .test-result { margin: 10px 0; padding: 10px; border-radius: 3px; }
            .passed { background: #d4edda; color: #155724; }
            .failed { background: #f8d7da; color: #721c24; }
            .skipped { background: #fff3cd; color: #856404; }
          </style>
        </head>
        <body>
          <h1>組件測試報告</h1>
          <div class="summary">
            <h2>測試摘要</h2>
            <p>總測試數: ${report.total}</p>
            <p>通過: ${report.passed}</p>
            <p>失敗: ${report.failed}</p>
            <p>跳過: ${report.skipped}</p>
            <p>總耗時: ${report.duration}ms</p>
          </div>
          <div class="results">
            <h2>測試結果</h2>
            ${report.results.map((result: any) => `
              <div class="test-result ${result.status}">
                <h3>${result.name}</h3>
                <p>狀態: ${result.status}</p>
                <p>耗時: ${result.duration}ms</p>
                ${result.error ? `<p>錯誤: ${result.error}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `
  }
}
