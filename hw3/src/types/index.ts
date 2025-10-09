// src/types/index.ts
export interface Product {
  id: number
  name: string
  category: string
  description: string
  rarity: string
  price: string
  pros: string
  cons: string
}

export interface SoulTitle {
  trigger_item_id: number
  name: string
  category: string
  rarity: string
  title: string
}

export interface DivineQuote {
  trigger_item_id: number
  name: string
  category: string
  rarity: string
  quote: string
}

export interface ProductCardProps {
  product: Product
  onAddToMix: () => void
  isHovered: boolean
  isPurchased: boolean
}

export interface VendingMachineGridProps {
  products: Product[]
  filterCategory: string
  filterRarity: string
  onAddToMix: (product: Product) => void
  purchasedProducts: Set<number>
}

export interface MixDrawerProps {
  selectedProducts: Product[]
  onRemoveProduct: (productId: number) => void
  onReset: () => void
  open?: boolean
  onToggle?: () => void
}

export interface SoulReportProps {
  open: boolean
  selectedProducts: Product[]
  onClose: () => void
  onRecreate: () => void
}

export interface FilterBarProps {
  categories: string[]
  rarities: string[]
  filterCategory: string
  filterRarity: string
  onCategoryChange: (category: string) => void
  onRarityChange: (rarity: string) => void
}

export interface SpaceBackgroundProps {
  audioRef?: React.RefObject<HTMLAudioElement>
}

export type RarityType = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

export type CategoryType = '能力' | '性格' | '習慣' | '詛咒' | '特殊體質' | '喜好' | '怪癖'

export interface GodWarningState {
  show: boolean
  message: string
}

