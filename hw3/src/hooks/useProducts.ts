// src/hooks/useProducts.ts
import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { Product } from '../types'
import { CSV_PATHS } from '../constants'

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Papa.parse(CSV_PATHS.PRODUCTS, {
      header: true,
      download: true,
      complete: (results) => {
        try {
          const parsedProducts: Product[] = results.data.map((row: any) => ({
            id: parseInt(row.id),
            name: row.name,
            category: row.category,
            description: row.description,
            rarity: row.rarity,
            price: row.price,
            pros: row.pros,
            cons: row.cons
          }))
          setProducts(parsedProducts)
          setError(null)
        } catch (err) {
          setError('解析商品資料時發生錯誤')
        } finally {
          setLoading(false)
        }
      },
      error: () => {
        setError('載入商品資料時發生錯誤')
        setLoading(false)
      }
    })
  }, [])

  return { products, loading, error }
}

