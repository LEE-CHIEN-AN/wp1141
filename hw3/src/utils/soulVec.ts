// 計算 6 維靈魂屬性向量與規則

export type SoulVec = {
  action: number
  social: number
  sanity: number
  creativity: number
  resilience: number
  chaos: number
}

export type ProductLike = {
  id: number
  name: string
  category: string
  rarity: string
  pros?: string
  cons?: string
  price?: string
  description?: string
}

export const rarityMul: Record<string, number> = {
  Common: 1,
  Uncommon: 1.15,
  Rare: 1.35,
  Epic: 1.6,
  Legendary: 1.9,
  Mythic: 2.2
}

export const baseByCategory: Record<string, SoulVec> = {
  '能力': { action: 6, social: 2, sanity: 1, creativity: 3, resilience: 3, chaos: 1 },
  '性格': { action: 2, social: 3, sanity: 2, creativity: 2, resilience: 2, chaos: 2 },
  '習慣': { action: 3, social: 1, sanity: 2, creativity: 1, resilience: 3, chaos: 1 },
  '詛咒': { action: 0, social: -1, sanity: -4, creativity: 1, resilience: -2, chaos: 6 },
  '特殊體質': { action: 3, social: 2, sanity: 0, creativity: 3, resilience: 2, chaos: 2 },
  '喜好': { action: 1, social: 2, sanity: 0, creativity: 2, resilience: 0, chaos: 1 },
  '怪癖': { action: 0, social: 0, sanity: -1, creativity: 2, resilience: 0, chaos: 4 },
  default: { action: 1, social: 1, sanity: 1, creativity: 1, resilience: 1, chaos: 1 }
}

export const LEXICON: Record<string, Partial<SoulVec>> = {
  // 正向詞
  '效率': { action: +4 },
  '靈感': { creativity: +4 },
  '魅力': { social: +4 },
  '永不放棄': { resilience: +5 },
  '穩定': { sanity: +3 },
  '專注': { sanity: +4 },
  '快樂': { social: +2, sanity: +1 },

  // 反向詞 / 代價
  '焦慮': { sanity: -4, chaos: +2 },
  '失眠': { sanity: -5, action: +1 },
  '尷尬': { social: -2, chaos: +3 },
  '拖延': { action: -5, chaos: +2 },
  '爆肝': { resilience: -4, action: +2 },
  '社會性死亡': { social: -6, chaos: +4 }
}

const empty: SoulVec = { action: 0, social: 0, sanity: 0, creativity: 0, resilience: 0, chaos: 0 }

const add = (a: SoulVec, b: Partial<SoulVec>): SoulVec => ({
  action: a.action + (b.action || 0),
  social: a.social + (b.social || 0),
  sanity: a.sanity + (b.sanity || 0),
  creativity: a.creativity + (b.creativity || 0),
  resilience: a.resilience + (b.resilience || 0),
  chaos: a.chaos + (b.chaos || 0)
})

const mul = (a: SoulVec, k: number): SoulVec => ({
  action: a.action * k,
  social: a.social * k,
  sanity: a.sanity * k,
  creativity: a.creativity * k,
  resilience: a.resilience * k,
  chaos: a.chaos * k
})

const scanLexicon = (text?: string): SoulVec => {
  if (!text) return { ...empty }
  const t = text.toLowerCase()
  let v = { ...empty }
  Object.entries(LEXICON).forEach(([kw, delta]) => {
    if (t.includes(kw)) v = add(v, delta)
  })
  return v
}

const softCap = (x: number) => 100 * (1 - Math.exp(-x / 25))

export function computeSoulVec(items: ProductLike[]): SoulVec {
  let total = { ...empty }
  for (const p of items) {
    const base = baseByCategory[p.category] ?? baseByCategory['default']
    const kw = scanLexicon(`${p.name} ${p.description ?? ''} ${p.pros ?? ''} ${p.cons ?? ''} ${p.price ?? ''}`)
    const v = add(base, kw)
    const r = rarityMul[p.rarity] ?? 1
    total = add(total, mul(v, r))
  }
  return {
    action: Math.max(0, softCap(total.action)),
    social: Math.max(0, softCap(total.social)),
    sanity: Math.max(0, softCap(total.sanity)),
    creativity: Math.max(0, softCap(total.creativity)),
    resilience: Math.max(0, softCap(total.resilience)),
    chaos: Math.max(0, softCap(total.chaos))
  }
}



