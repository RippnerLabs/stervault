// Request batching utility to reduce API calls and improve performance

interface BatchedRequest<T> {
  id: string
  resolve: (value: T) => void
  reject: (error: any) => void
  timestamp: number
}

interface BatchConfig {
  maxBatchSize: number
  maxWaitTime: number // milliseconds
  minWaitTime: number // milliseconds
}

export class RequestBatcher<T> {
  private queue: BatchedRequest<T>[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly config: BatchConfig

  constructor(
    private executeBatch: (requests: BatchedRequest<T>[]) => Promise<void>,
    config: Partial<BatchConfig> = {}
  ) {
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 10,
      maxWaitTime: config.maxWaitTime ?? 100, // 100ms max wait
      minWaitTime: config.minWaitTime ?? 10   // 10ms min wait
    }
  }

  public addRequest(): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: BatchedRequest<T> = {
        id: Math.random().toString(36).substr(2, 9),
        resolve,
        reject,
        timestamp: Date.now()
      }

      this.queue.push(request)

      // Schedule batch execution if not already scheduled
      if (!this.batchTimeout) {
        this.scheduleBatchExecution()
      }

      // Force execution if batch is full
      if (this.queue.length >= this.config.maxBatchSize) {
        this.executePendingBatch()
      }
    })
  }

  private scheduleBatchExecution(): void {
    // Use minimum wait time for responsiveness
    this.batchTimeout = setTimeout(() => {
      this.executePendingBatch()
    }, this.config.minWaitTime)
  }

  private async executePendingBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    if (this.queue.length === 0) {
      return
    }

    const currentBatch = this.queue.splice(0, this.config.maxBatchSize)

    try {
      await this.executeBatch(currentBatch)
    } catch (error) {
      // Reject all requests in the batch
      currentBatch.forEach(request => {
        request.reject(error)
      })
    }

    // If there are more requests, schedule another batch
    if (this.queue.length > 0) {
      this.scheduleBatchExecution()
    }
  }

  public destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('RequestBatcher destroyed'))
    })
    this.queue = []
  }
}

// Specific batcher for token account requests
export class TokenAccountBatcher {
  private batcher: RequestBatcher<any>

  constructor(private connection: any) {
    this.batcher = new RequestBatcher(
      this.executeBatch.bind(this),
      {
        maxBatchSize: 5, // Smaller batch size for token accounts
        maxWaitTime: 200,
        minWaitTime: 50
      }
    )
  }

  private async executeBatch(requests: BatchedRequest<any>[]): Promise<void> {
    // For now, execute requests individually but with a delay between them
    // In a more advanced implementation, we could use batch RPC calls
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      
      try {
        // Add small delay between requests to avoid overwhelming the API
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // This would be replaced with actual token account fetching logic
        const result = await this.fetchTokenAccount()
        request.resolve(result)
      } catch (error) {
        request.reject(error)
      }
    }
  }

  private async fetchTokenAccount(): Promise<any> {
    // Placeholder - implement actual token account fetching
    return {}
  }

  public requestTokenAccount(): Promise<any> {
    return this.batcher.addRequest()
  }

  public destroy(): void {
    this.batcher.destroy()
  }
}

// Cache with TTL for reducing redundant requests
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>()
  
  constructor(private defaultTTL: number = 5 * 60 * 1000) {} // 5 minutes default

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL)
    this.cache.set(key, { value, expiry })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const globalCache = new TTLCache()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  globalCache.cleanup()
}, 5 * 60 * 1000) 