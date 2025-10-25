/**
 * 統一的組件介面規範
 * 定義所有組件應該遵循的介面標準
 */

import { ReactNode } from 'react'

// 基礎組件介面
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
  testId?: string
  id?: string
}

// 可點擊組件介面
export interface ClickableProps extends BaseComponentProps {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
}

// 可載入組件介面
export interface LoadableProps extends BaseComponentProps {
  loading?: boolean
  loadingText?: string
}

// 可錯誤組件介面
export interface ErrorableProps extends BaseComponentProps {
  error?: string | null
  onRetry?: () => void
  retryText?: string
}

// 可空狀態組件介面
export interface EmptyableProps extends BaseComponentProps {
  isEmpty?: boolean
  emptyMessage?: string
  emptyIcon?: ReactNode
  emptyAction?: ReactNode
}

// 可刷新組件介面
export interface RefreshableProps extends BaseComponentProps {
  onRefresh?: () => void
  refreshing?: boolean
}

// 可搜尋組件介面
export interface SearchableProps extends BaseComponentProps {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onSearchSubmit?: (query: string) => void
  placeholder?: string
  searchLoading?: boolean
}

// 可排序組件介面
export interface SortableProps extends BaseComponentProps {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string, order: 'asc' | 'desc') => void
  sortOptions?: Array<{ value: string; label: string }>
}

// 可分頁組件介面
export interface PaginatableProps extends BaseComponentProps {
  currentPage?: number
  totalPages?: number
  pageSize?: number
  totalItems?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

// 可過濾組件介面
export interface FilterableProps extends BaseComponentProps {
  filters?: Record<string, any>
  onFilterChange?: (filters: Record<string, any>) => void
  filterOptions?: Record<string, Array<{ value: any; label: string }>>
}

// 可選擇組件介面
export interface SelectableProps extends BaseComponentProps {
  selectedItems?: any[]
  onSelectionChange?: (items: any[]) => void
  multiSelect?: boolean
  selectAll?: boolean
  onSelectAll?: (selected: boolean) => void
}

// 可編輯組件介面
export interface EditableProps extends BaseComponentProps {
  editing?: boolean
  onEdit?: () => void
  onSave?: (data: any) => void
  onCancel?: () => void
  onDelete?: () => void
  editMode?: 'inline' | 'modal' | 'page'
}

// 可收藏組件介面
export interface FavoritableProps extends BaseComponentProps {
  isFavorited?: boolean
  onToggleFavorite?: () => void
  favoriteCount?: number
}

// 可評分組件介面
export interface RateableProps extends BaseComponentProps {
  rating?: number
  maxRating?: number
  onRatingChange?: (rating: number) => void
  readOnly?: boolean
}

// 可上傳組件介面
export interface UploadableProps extends BaseComponentProps {
  onUpload?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  uploadLoading?: boolean
}

// 可預覽組件介面
export interface PreviewableProps extends BaseComponentProps {
  previewUrl?: string
  previewType?: 'image' | 'video' | 'audio' | 'document'
  onPreview?: (url: string) => void
}

// 組合介面：常用的組件介面組合
export interface StandardComponentProps extends 
  BaseComponentProps,
  LoadableProps,
  ErrorableProps,
  EmptyableProps,
  RefreshableProps {}

export interface InteractiveComponentProps extends 
  StandardComponentProps,
  ClickableProps,
  EditableProps {}

export interface DataComponentProps extends 
  StandardComponentProps,
  SearchableProps,
  SortableProps,
  PaginatableProps,
  FilterableProps,
  SelectableProps {}

export interface MediaComponentProps extends 
  StandardComponentProps,
  PreviewableProps,
  UploadableProps {}

export interface SocialComponentProps extends 
  StandardComponentProps,
  FavoritableProps,
  RateableProps {}

// 組件類型定義
export type ComponentType = 
  | 'container'
  | 'presentation'
  | 'form'
  | 'list'
  | 'card'
  | 'modal'
  | 'dialog'
  | 'button'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'progress'
  | 'spinner'
  | 'alert'
  | 'notification'
  | 'badge'
  | 'chip'
  | 'avatar'
  | 'image'
  | 'video'
  | 'audio'
  | 'map'
  | 'chart'
  | 'table'
  | 'calendar'
  | 'datepicker'
  | 'file'
  | 'upload'
  | 'download'
  | 'preview'
  | 'editor'
  | 'viewer'
  | 'gallery'
  | 'carousel'
  | 'tabs'
  | 'accordion'
  | 'stepper'
  | 'breadcrumb'
  | 'pagination'
  | 'search'
  | 'filter'
  | 'sort'
  | 'export'
  | 'print'
  | 'share'
  | 'copy'
  | 'save'
  | 'load'
  | 'refresh'
  | 'settings'
  | 'help'
  | 'about'
  | 'contact'
  | 'feedback'
  | 'support'
