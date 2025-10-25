/**
 * 容器組件和展示組件分離架構
 * 實現關注點分離，提高組件複用性
 */

import React from 'react'
import { 
  StandardComponentProps, 
  InteractiveComponentProps, 
  DataComponentProps,
  MediaComponentProps,
  SocialComponentProps 
} from './interfaces'
import { PageContainer, Card, List, Form } from './index'

// 容器組件基礎類
export abstract class ContainerComponent<P = {}, S = {}> extends React.Component<P, S> {
  // 子類必須實現的方法
  abstract renderPresentation(): React.ReactNode
  
  // 可選的生命週期方法
  componentDidMount?(): void
  componentWillUnmount?(): void
  componentDidUpdate?(prevProps: P, prevState: S): void
  
  // 統一的渲染方法
  render() {
    return this.renderPresentation()
  }
}

// 展示組件基礎類
export abstract class PresentationComponent<P = {}> extends React.Component<P> {
  // 子類必須實現的方法
  abstract renderContent(): React.ReactNode
  
  // 可選的生命週期方法
  componentDidMount?(): void
  componentWillUnmount?(): void
  componentDidUpdate?(prevProps: P): void
  
  // 統一的渲染方法
  render() {
    return this.renderContent()
  }
}

// 高階組件：容器組件裝飾器
export function withContainer<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return class ContainerWrapper extends ContainerComponent<P> {
    renderPresentation() {
      return <WrappedComponent {...this.props} />
    }
  }
}

// 高階組件：展示組件裝飾器
export function withPresentation<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return class PresentationWrapper extends PresentationComponent<P> {
    renderContent() {
      return <WrappedComponent {...this.props} />
    }
  }
}

// 頁面容器組件
export interface PageContainerProps extends StandardComponentProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
}

export class PageContainerComponent extends ContainerComponent<PageContainerProps> {
  renderPresentation() {
    const { 
      title, 
      subtitle, 
      actions, 
      maxWidth, 
      children,
      loading,
      error,
      onRetry,
      isEmpty,
      emptyMessage,
      emptyIcon,
      emptyAction
    } = this.props

    return (
      <PageContainer
        title={title}
        subtitle={subtitle}
        actions={actions}
        maxWidth={maxWidth}
        loading={loading}
        error={error}
        onRetry={onRetry}
        isEmpty={isEmpty}
        emptyState={{
          icon: emptyIcon,
          title: emptyMessage,
          action: emptyAction
        }}
      >
        {children}
      </PageContainer>
    )
  }
}

// 卡片容器組件
export interface CardContainerProps extends InteractiveComponentProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  variant?: 'elevation' | 'outlined'
  padding?: number
}

export class CardContainerComponent extends ContainerComponent<CardContainerProps> {
  renderPresentation() {
    const { 
      title, 
      subtitle, 
      actions, 
      variant, 
      padding, 
      children,
      loading,
      error,
      onRetry,
      isEmpty,
      emptyMessage,
      emptyIcon,
      emptyAction,
      onClick,
      disabled,
      editing,
      onEdit,
      onSave,
      onCancel,
      onDelete
    } = this.props

    return (
      <Card
        title={title}
        subtitle={subtitle}
        actions={actions}
        variant={variant}
        padding={padding}
      >
        <StandardComponentWrapper
          loading={loading}
          error={error}
          onRetry={onRetry}
          isEmpty={isEmpty}
          emptyMessage={emptyMessage}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        >
          {children}
        </StandardComponentWrapper>
      </Card>
    )
  }
}

// 列表容器組件
export interface ListContainerProps extends DataComponentProps {
  items: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  keyExtractor?: (item: any, index: number) => string
  emptyMessage?: string
}

export class ListContainerComponent extends ContainerComponent<ListContainerProps> {
  renderPresentation() {
    const { 
      items, 
      renderItem, 
      keyExtractor, 
      emptyMessage,
      loading,
      error,
      onRetry,
      searchQuery,
      onSearchChange,
      onSearchSubmit,
      placeholder,
      searchLoading,
      sortBy,
      sortOrder,
      onSortChange,
      sortOptions,
      currentPage,
      totalPages,
      pageSize,
      totalItems,
      onPageChange,
      onPageSizeChange,
      filters,
      onFilterChange,
      filterOptions,
      selectedItems,
      onSelectionChange,
      multiSelect,
      selectAll,
      onSelectAll
    } = this.props

    return (
      <List
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        emptyMessage={emptyMessage}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    )
  }
}

// 表單容器組件
export interface FormContainerProps extends InteractiveComponentProps {
  onSubmit?: (data: any) => void
  onReset?: () => void
  submitText?: string
  resetText?: string
  showReset?: boolean
}

export class FormContainerComponent extends ContainerComponent<FormContainerProps> {
  renderPresentation() {
    const { 
      onSubmit, 
      onReset, 
      submitText, 
      resetText, 
      showReset,
      children,
      loading,
      error,
      onRetry,
      isEmpty,
      emptyMessage,
      emptyIcon,
      emptyAction,
      onClick,
      disabled,
      editing,
      onEdit,
      onSave,
      onCancel,
      onDelete
    } = this.props

    return (
      <Form
        onSubmit={onSubmit}
        onReset={onReset}
        loading={loading}
        error={error}
        submitText={submitText}
        resetText={resetText}
        showReset={showReset}
      >
        {children}
      </Form>
    )
  }
}

// 標準組件包裝器
interface StandardComponentWrapperProps extends StandardComponentProps {}

const StandardComponentWrapper: React.FC<StandardComponentWrapperProps> = ({
  children,
  loading,
  error,
  onRetry,
  isEmpty,
  emptyMessage,
  emptyIcon,
  emptyAction
}) => {
  if (loading) {
    return <div>載入中...</div>
  }

  if (error) {
    return (
      <div>
        錯誤：{error}
        {onRetry && <button onClick={onRetry}>重試</button>}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div>
        {emptyIcon && <div>{emptyIcon}</div>}
        <div>{emptyMessage || '暫無資料'}</div>
        {emptyAction && <div>{emptyAction}</div>}
      </div>
    )
  }

  return <>{children}</>
}

// 組件工廠：創建容器組件
export function createContainerComponent<P extends object>(
  componentType: 'page' | 'card' | 'list' | 'form',
  props: P
) {
  switch (componentType) {
    case 'page':
      return <PageContainerComponent {...(props as PageContainerProps)} />
    case 'card':
      return <CardContainerComponent {...(props as CardContainerProps)} />
    case 'list':
      return <ListContainerComponent {...(props as ListContainerProps)} />
    case 'form':
      return <FormContainerComponent {...(props as FormContainerProps)} />
    default:
      throw new Error(`Unknown component type: ${componentType}`)
  }
}

// 組件註冊器：註冊自定義組件
export class ComponentRegistry {
  private static components = new Map<string, React.ComponentType<any>>()

  static register(name: string, component: React.ComponentType<any>) {
    this.components.set(name, component)
  }

  static get(name: string): React.ComponentType<any> | undefined {
    return this.components.get(name)
  }

  static unregister(name: string) {
    this.components.delete(name)
  }

  static list(): string[] {
    return Array.from(this.components.keys())
  }
}

// 組件渲染器：動態渲染組件
export interface ComponentRendererProps {
  componentType: string
  props: any
  fallback?: React.ReactNode
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  componentType,
  props,
  fallback = <div>組件未找到</div>
}) => {
  const Component = ComponentRegistry.get(componentType)
  
  if (!Component) {
    return <>{fallback}</>
  }

  return <Component {...props} />
}

// 組件測試工具
export class ComponentTestUtils {
  static createMockProps<P extends object>(props: P): P {
    return {
      ...props,
      testId: `test-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  static createMockContainerProps(): StandardComponentProps {
    return {
      loading: false,
      error: null,
      isEmpty: false,
      emptyMessage: '暫無資料'
    }
  }

  static createMockInteractiveProps(): InteractiveComponentProps {
    return {
      ...this.createMockContainerProps(),
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
      ...this.createMockContainerProps(),
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
