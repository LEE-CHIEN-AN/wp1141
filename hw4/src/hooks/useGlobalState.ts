import React, { useState, createContext, useContext, ReactNode } from 'react'
import { User } from '../types'

interface GlobalState {
  user: User | null
  isAuthenticated: boolean
  theme: 'light' | 'dark'
  language: 'zh-TW' | 'en-US'
}

const GlobalStateContext = createContext<GlobalState | null>(null)

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [state] = useState<GlobalState>({
    user: null,
    isAuthenticated: false,
    theme: 'light',
    language: 'zh-TW'
  })

  return React.createElement(
    GlobalStateContext.Provider,
    { value: state },
    children
  )
}

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext)
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider')
  }
  return context
}

export const useGlobalStateManager = () => {
  const state = useGlobalState()
  return state
}

export const useAuthState = () => {
  const { user, isAuthenticated } = useGlobalState()
  return { user, isAuthenticated }
}

export const useUIState = () => {
  const { theme, language } = useGlobalState()
  return { theme, language }
}

export const useAppState = () => {
  const state = useGlobalState()
  return { isOnline: true, isAppReady: true }
}