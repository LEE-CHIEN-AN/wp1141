import React from 'react'
import { Product } from '../types'
import './ProductModal.css'

interface ProductModalProps {
  product: Product
  onClose: () => void
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return '#9CA3AF'
      case 'Uncommon': return '#10B981'
      case 'Rare': return '#3B82F6'
      case 'Epic': return '#8B5CF6'
      case 'Legendary': return '#F59E0B'
      case 'Mythic': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'Common': return '⚪'
      case 'Uncommon': return '🟢'
      case 'Rare': return '🔵'
      case 'Epic': return '🟣'
      case 'Legendary': return '🟡'
      case 'Mythic': return '🔴'
      default: return '⚫'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <div className="product-image-large">
            <img 
              src={`/picture/${String(product.id).padStart(2, '0')}.png`} 
              alt={product.name}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LmZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6Dlj6/lm77niYc8L3RleHQ+PC9zdmc+'
              }}
            />
          </div>
          
          <div className="product-title-section">
            <h2 className="product-title">{product.name}</h2>
            <div className="rarity-section">
              <span className="rarity-icon-large">{getRarityIcon(product.rarity)}</span>
              <span 
                className="rarity-badge-large" 
                style={{ backgroundColor: getRarityColor(product.rarity) }}
              >
                {product.rarity}
              </span>
            </div>
            <p className="product-category-large">{product.category}</p>
          </div>
        </div>

        <div className="modal-body">
          <div className="product-details">
            <div className="detail-section">
              <h3>📝 商品描述</h3>
              <p>{product.description}</p>
            </div>
            
            <div className="detail-section">
              <h3>💰 價格</h3>
              <p className="price-text">{product.price}</p>
            </div>
            
            <div className="detail-section">
              <h3>✅ 優點</h3>
              <p className="pros-text">{product.pros}</p>
            </div>
            
            <div className="detail-section">
              <h3>❌ 缺點</h3>
              <p className="cons-text">{product.cons}</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="buy-button" onClick={onClose}>
            🛒 購買商品
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductModal

