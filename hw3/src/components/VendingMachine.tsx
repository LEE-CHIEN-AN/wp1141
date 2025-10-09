import React, { useState } from 'react'
import ProductCard from './ProductCard'
import ProductModal from './ProductModal'
import { Product } from '../types'
import './VendingMachine.css'

interface VendingMachineProps {
  products: Product[]
}

const VendingMachine: React.FC<VendingMachineProps> = ({ products }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterRarity, setFilterRarity] = useState<string>('all')

  // 取得所有分類和稀有度
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]
  const rarities = ['all', ...Array.from(new Set(products.map(p => p.rarity)))]

  // 篩選商品
  const filteredProducts = products.filter(product => {
    const categoryMatch = filterCategory === 'all' || product.category === filterCategory
    const rarityMatch = filterRarity === 'all' || product.rarity === filterRarity
    return categoryMatch && rarityMatch
  })

  const closeModal = () => {
    setSelectedProduct(null)
  }

  return (
    <div className="vending-machine">
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="category-filter">分類：</label>
          <select 
            id="category-filter"
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? '全部' : category}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="rarity-filter">稀有度：</label>
          <select 
            id="rarity-filter"
            value={filterRarity} 
            onChange={(e) => setFilterRarity(e.target.value)}
          >
            {rarities.map(rarity => (
              <option key={rarity} value={rarity}>
                {rarity === 'all' ? '全部' : rarity}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="products-grid">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToMix={() => {}}
            isHovered={false}
            isPurchased={false}
          />
        ))}
      </div>

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default VendingMachine
