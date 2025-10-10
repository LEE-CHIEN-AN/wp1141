// src/constants/index.ts
export const GOD_WARNING_MESSAGES = [
  '夠了人類，你的靈魂容量快爆炸。',
  '購買超過上限？這可不是抽卡系統。',
  '神的倉庫也滿了，請釋放一些理智空間。',
  '宇宙提示：靈魂插槽已滿，請手動清除。',
  '別鬧，這不是無限背包模組。'
]

export const SPECIAL_COMBO_QUOTES = [
  '你挑戰了宇宙的極限。',
  '群星為你的勇氣而閃耀。',
  '這是命運的選擇，也是命運的見證。',
  '你觸及了神之領域的邊界。',
  '宇宙的平衡因你而改變。'
]

export const RARITY_COLORS = {
  Common: '#9CA3AF',
  Uncommon: '#10B981',
  Rare: '#3B82F6',
  Epic: '#8B5CF6',
  Legendary: '#F59E0B',
  Mythic: '#EF4444'
} as const

export const RARITY_ICONS = {
  Common: '⚪',
  Uncommon: '🟢',
  Rare: '🔵',
  Epic: '🟣',
  Legendary: '🟡',
  Mythic: '🔴'
} as const

export const MAX_SELECTED_PRODUCTS = 5

export const DEFAULT_AUDIO_VOLUME = 0.3

export const ANIMATION_DURATION = {
  FAST: 0.3,
  NORMAL: 0.5,
  SLOW: 1.0
} as const

export const CSV_PATHS = {
  PRODUCTS: '/weird_vending_machine.csv',
  SOUL_TITLES: '/soul_titles.csv',
  DIVINE_QUOTES: '/divine_quotes.csv'
} as const

export const IMAGE_PATHS = {
  BASE: '/picture/',
  FALLBACK: '無可圖片'
} as const


