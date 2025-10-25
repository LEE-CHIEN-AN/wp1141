// Google Maps API 節流和快取工具
class GoogleMapsThrottle {
  private static instance: GoogleMapsThrottle
  private requestQueue: Map<string, number> = new Map()
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  
  private constructor() {}
  
  static getInstance(): GoogleMapsThrottle {
    if (!GoogleMapsThrottle.instance) {
      GoogleMapsThrottle.instance = new GoogleMapsThrottle()
    }
    return GoogleMapsThrottle.instance
  }
  
  // 節流：限制同一 API 的請求頻率
  async throttleRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    minInterval: number = 1000
  ): Promise<T> {
    const now = Date.now()
    const lastRequest = this.requestQueue.get(key) || 0
    
    if (now - lastRequest < minInterval) {
      const waitTime = minInterval - (now - lastRequest)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requestQueue.set(key, Date.now())
    return requestFn()
  }
  
  // 快取：避免重複請求
  async cachedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 300000 // 5分鐘
  ): Promise<T> {
    const cached = this.cache.get(key)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      console.log(`使用快取的 Google Maps API 結果: ${key}`)
      return cached.data
    }
    
    const data = await requestFn()
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl
    })
    
    return data
  }
  
  // 清理過期快取
  cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if ((now - cached.timestamp) >= cached.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export default GoogleMapsThrottle
