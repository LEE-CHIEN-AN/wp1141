/**
 * 組件複用性改善機制
 * 提供組件組合、繼承、混入等功能
 */

import React, { ComponentType, ReactNode } from 'react'
import { 
  StandardComponentProps, 
  InteractiveComponentProps, 
  DataComponentProps,
  MediaComponentProps,
  SocialComponentProps 
} from './interfaces'

// 組件混入介面
export interface ComponentMixin {
  name: string
  props?: Record<string, any>
  methods?: Record<string, Function>
  lifecycle?: {
    componentDidMount?: () => void
    componentWillUnmount?: () => void
    componentDidUpdate?: (prevProps: any, prevState: any) => void
  }
}

// 組件混入管理器
export class ComponentMixinManager {
  private static mixins = new Map<string, ComponentMixin>()

  static register(mixin: ComponentMixin) {
    this.mixins.set(mixin.name, mixin)
  }

  static get(name: string): ComponentMixin | undefined {
    return this.mixins.get(name)
  }

  static apply<P extends object>(
    Component: ComponentType<P>,
    mixinNames: string[]
  ): ComponentType<P> {
    const mixins = mixinNames.map(name => this.mixins.get(name)).filter(Boolean) as ComponentMixin[]
    
    return class MixedComponent extends React.Component<P> {
      componentDidMount() {
        mixins.forEach(mixin => {
          mixin.lifecycle?.componentDidMount?.()
        })
      }

      componentWillUnmount() {
        mixins.forEach(mixin => {
          mixin.lifecycle?.componentWillUnmount?.()
        })
      }

      componentDidUpdate(prevProps: P, prevState: any) {
        mixins.forEach(mixin => {
          mixin.lifecycle?.componentDidUpdate?.(prevProps, prevState)
        })
      }

      render() {
        const enhancedProps = { ...this.props }
        
        // 應用混入的 props
        mixins.forEach(mixin => {
          if (mixin.props) {
            Object.assign(enhancedProps, mixin.props)
          }
        })

        return <Component {...enhancedProps} />
      }
    }
  }
}

// 組件組合器
export class ComponentComposer {
  static compose<P extends object>(
    components: Array<ComponentType<P>>
  ): ComponentType<P> {
    return function ComposedComponent(props: P) {
      return components.reduce((acc, Component) => {
        return <Component {...props}>{acc}</Component>
      }, null as ReactNode)
    }
  }

  static withWrapper<P extends object>(
    Wrapper: ComponentType<{ children: ReactNode }>,
    Component: ComponentType<P>
  ): ComponentType<P> {
    return function WrappedComponent(props: P) {
      return (
        <Wrapper>
          <Component {...props} />
        </Wrapper>
      )
    }
  }

  static withCondition<P extends object>(
    condition: (props: P) => boolean,
    Component: ComponentType<P>,
    Fallback?: ComponentType<P>
  ): ComponentType<P> {
    return function ConditionalComponent(props: P) {
      if (condition(props)) {
        return <Component {...props} />
      }
      
      if (Fallback) {
        return <Fallback {...props} />
      }
      
      return null
    }
  }
}

// 組件繼承器
export class ComponentInheritor {
  static extend<P extends object, S = {}>(
    BaseComponent: ComponentType<P>,
    extensions: {
      props?: Partial<P>
      state?: S
      methods?: Record<string, Function>
      lifecycle?: {
        componentDidMount?: () => void
        componentWillUnmount?: () => void
        componentDidUpdate?: (prevProps: P, prevState: S) => void
      }
    }
  ): ComponentType<P> {
    return class ExtendedComponent extends React.Component<P, S> {
      constructor(props: P) {
        super(props)
        this.state = extensions.state || ({} as S)
      }

      componentDidMount() {
        extensions.lifecycle?.componentDidMount?.()
      }

      componentWillUnmount() {
        extensions.lifecycle?.componentWillUnmount?.()
      }

      componentDidUpdate(prevProps: P, prevState: S) {
        extensions.lifecycle?.componentDidUpdate?.(prevProps, prevState)
      }

      render() {
        const enhancedProps = { ...this.props, ...extensions.props }
        return <BaseComponent {...enhancedProps} />
      }
    }
  }
}

// 組件裝飾器
export class ComponentDecorator {
  static withLoading<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & { loading?: boolean }> {
    return function LoadingDecorator(props: P & { loading?: boolean }) {
      if (props.loading) {
        return <div>載入中...</div>
      }
      return <Component {...props} />
    }
  }

  static withError<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & { error?: string | null; onRetry?: () => void }> {
    return function ErrorDecorator(props: P & { error?: string | null; onRetry?: () => void }) {
      if (props.error) {
        return (
          <div>
            錯誤：{props.error}
            {props.onRetry && <button onClick={props.onRetry}>重試</button>}
          </div>
        )
      }
      return <Component {...props} />
    }
  }

  static withEmpty<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & { isEmpty?: boolean; emptyMessage?: string }> {
    return function EmptyDecorator(props: P & { isEmpty?: boolean; emptyMessage?: string }) {
      if (props.isEmpty) {
        return <div>{props.emptyMessage || '暫無資料'}</div>
      }
      return <Component {...props} />
    }
  }

  static withStandard<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & StandardComponentProps> {
    return ComponentDecorator.withEmpty(
      ComponentDecorator.withError(
        ComponentDecorator.withLoading(Component)
      )
    )
  }
}

// 組件工廠
export class ComponentFactory {
  static createStandard<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & StandardComponentProps> {
    return ComponentDecorator.withStandard(Component)
  }

  static createInteractive<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & InteractiveComponentProps> {
    return ComponentDecorator.withStandard(Component) as ComponentType<P & InteractiveComponentProps>
  }

  static createData<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & DataComponentProps> {
    return ComponentDecorator.withStandard(Component) as ComponentType<P & DataComponentProps>
  }

  static createMedia<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & MediaComponentProps> {
    return ComponentDecorator.withStandard(Component) as ComponentType<P & MediaComponentProps>
  }

  static createSocial<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P & SocialComponentProps> {
    return ComponentDecorator.withStandard(Component) as ComponentType<P & SocialComponentProps>
  }
}

// 組件配置器
export interface ComponentConfig {
  name: string
  type: 'standard' | 'interactive' | 'data' | 'media' | 'social'
  props: Record<string, any>
  mixins?: string[]
  wrappers?: string[]
  conditions?: Array<{
    condition: (props: any) => boolean
    component: string
  }>
}

export class ComponentConfigurator {
  private static configs = new Map<string, ComponentConfig>()

  static register(config: ComponentConfig) {
    this.configs.set(config.name, config)
  }

  static create(name: string, baseComponent: ComponentType<any>): ComponentType<any> {
    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`Component config not found: ${name}`)
    }

    let Component = baseComponent

    // 應用混入
    if (config.mixins) {
      Component = ComponentMixinManager.apply(Component, config.mixins)
    }

    // 應用包裝器
    if (config.wrappers) {
      config.wrappers.forEach(wrapperName => {
        const Wrapper = ComponentRegistry.get(wrapperName)
        if (Wrapper) {
          Component = ComponentComposer.withWrapper(Wrapper, Component)
        }
      })
    }

    // 應用條件
    if (config.conditions) {
      config.conditions.forEach(({ condition, component }) => {
        const ConditionalComponent = ComponentRegistry.get(component)
        if (ConditionalComponent) {
          Component = ComponentComposer.withCondition(
            condition,
            Component,
            ConditionalComponent
          )
        }
      })
    }

    // 應用類型裝飾器
    switch (config.type) {
      case 'standard':
        Component = ComponentFactory.createStandard(Component)
        break
      case 'interactive':
        Component = ComponentFactory.createInteractive(Component)
        break
      case 'data':
        Component = ComponentFactory.createData(Component)
        break
      case 'media':
        Component = ComponentFactory.createMedia(Component)
        break
      case 'social':
        Component = ComponentFactory.createSocial(Component)
        break
    }

    return Component
  }
}

// 組件測試工具
export class ComponentTestUtils {
  static createTestWrapper<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P> {
    return function TestWrapper(props: P) {
      return (
        <div data-testid="component-wrapper">
          <Component {...props} />
        </div>
      )
    }
  }

  static createMockProps<P extends object>(props: P): P {
    return {
      ...props,
      testId: `test-${Math.random().toString(36).substr(2, 9)}`
    }
  }

  static createStandardTestProps(): StandardComponentProps {
    return {
      loading: false,
      error: null,
      isEmpty: false,
      emptyMessage: '暫無資料',
      testId: 'test-standard'
    }
  }

  static createInteractiveTestProps(): InteractiveComponentProps {
    return {
      ...this.createStandardTestProps(),
      onClick: jest.fn(),
      disabled: false,
      editing: false,
      onEdit: jest.fn(),
      onSave: jest.fn(),
      onCancel: jest.fn(),
      onDelete: jest.fn()
    }
  }

  static createDataTestProps(): DataComponentProps {
    return {
      ...this.createStandardTestProps(),
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

// 組件性能優化工具
export class ComponentPerformanceUtils {
  static withMemo<P extends object>(
    Component: ComponentType<P>,
    areEqual?: (prevProps: P, nextProps: P) => boolean
  ): ComponentType<P> {
    return React.memo(Component, areEqual)
  }

  static withCallback<P extends object>(
    Component: ComponentType<P>,
    dependencies: any[]
  ): ComponentType<P> {
    return React.useCallback(Component, dependencies) as ComponentType<P>
  }

  static withMemoValue<T>(
    value: T,
    dependencies: any[]
  ): T {
    return React.useMemo(() => value, dependencies)
  }

  static withLazy<P extends object>(
    Component: ComponentType<P>
  ): ComponentType<P> {
    return React.lazy(() => Promise.resolve({ default: Component }))
  }
}

// 組件生命週期管理
export class ComponentLifecycleManager {
  private static subscriptions = new Map<string, Set<() => void>>()

  static subscribe(componentId: string, callback: () => void) {
    if (!this.subscriptions.has(componentId)) {
      this.subscriptions.set(componentId, new Set())
    }
    this.subscriptions.get(componentId)!.add(callback)
  }

  static unsubscribe(componentId: string, callback: () => void) {
    this.subscriptions.get(componentId)?.delete(callback)
  }

  static notify(componentId: string) {
    this.subscriptions.get(componentId)?.forEach(callback => callback())
  }

  static cleanup(componentId: string) {
    this.subscriptions.delete(componentId)
  }
}
