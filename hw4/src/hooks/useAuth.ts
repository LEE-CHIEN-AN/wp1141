import { useState, useEffect } from 'react'
import { User, AuthState } from '../types'
import { authAPI } from '../services/api'

interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  nickname?: string
  avatar?: string
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // 檢查認證狀態
  const checkAuth = async () => {
    try {
      const user = await authAPI.getMe()
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const user = await authAPI.login(emailOrUsername, password)
      setAuthState({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      })
      return true
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const register = async (data: RegisterData): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const user = await authAPI.register({
        username: data.username,
        email: data.email,
        password: data.password,
        nickname: data.nickname,
      })
      
      setAuthState({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      })
      
      return true
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('登出失敗:', error)
    } finally {
      setAuthState({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      })
    }
  }

  const updateUser = (updatedUser: User) => {
    setAuthState(prev => ({ ...prev, user: updatedUser }))
  }

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
  }
}