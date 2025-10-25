import { useState, useMemo } from 'react'
import { Store } from '../types'

export const useSearch = (stores: Store[]) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) {
      return stores
    }

    const query = searchQuery.toLowerCase().trim()
    
    return stores.filter(store => {
      // 搜尋店名
      if (store.name.toLowerCase().includes(query)) {
        return true
      }
      
      // 搜尋地址
      if (store.address.toLowerCase().includes(query)) {
        return true
      }
      
      // 搜尋標籤
      if (store.tags?.some(tag => tag.name.toLowerCase().includes(query))) {
        return true
      }
      
      return false
    })
  }, [stores, searchQuery])

  const handleSearch = async () => {
    setIsSearching(true)
    
    // 模擬搜尋延遲
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setIsSearching(false)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  return {
    searchQuery,
    setSearchQuery,
    filteredStores,
    isSearching,
    handleSearch,
    clearSearch
  }
}
