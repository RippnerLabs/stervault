// Connection health monitoring utility for production-ready Solana apps

export interface ConnectionHealth {
  isHealthy: boolean
  latency: number
  lastCheck: Date
  errorCount: number
  status: 'healthy' | 'degraded' | 'unhealthy'
}

class ConnectionHealthMonitor {
  private health: ConnectionHealth = {
    isHealthy: true,
    latency: 0,
    lastCheck: new Date(),
    errorCount: 0,
    status: 'healthy'
  }

  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly MAX_ERROR_COUNT = 5
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private readonly LATENCY_THRESHOLD = 2000 // 2 seconds

  constructor(private connection: any) {
    this.startHealthCheck()
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const start = Date.now()
      
      // Simple health check - get latest blockhash
      await this.connection.getLatestBlockhash('confirmed')
      
      const latency = Date.now() - start
      
      // Update health status
      this.health = {
        ...this.health,
        isHealthy: true,
        latency,
        lastCheck: new Date(),
        errorCount: Math.max(0, this.health.errorCount - 1), // Decrease error count on success
        status: this.getStatusFromMetrics(latency, this.health.errorCount)
      }
    } catch (error) {
      console.warn('Connection health check failed:', error)
      
      this.health = {
        ...this.health,
        isHealthy: false,
        lastCheck: new Date(),
        errorCount: this.health.errorCount + 1,
        status: this.getStatusFromMetrics(this.health.latency, this.health.errorCount + 1)
      }
    }
  }

  private getStatusFromMetrics(latency: number, errorCount: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorCount >= this.MAX_ERROR_COUNT) {
      return 'unhealthy'
    }
    
    if (errorCount > 2 || latency > this.LATENCY_THRESHOLD) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  private startHealthCheck(): void {
    // Perform initial check
    this.performHealthCheck()
    
    // Set up periodic checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.HEALTH_CHECK_INTERVAL)
  }

  public getHealth(): ConnectionHealth {
    return { ...this.health }
  }

  public isRateLimited(): boolean {
    return this.health.errorCount >= 3 && this.health.status !== 'healthy'
  }

  public shouldThrottleRequests(): boolean {
    return this.health.status === 'degraded' || this.health.status === 'unhealthy'
  }

  public getRecommendedRetryDelay(): number {
    switch (this.health.status) {
      case 'unhealthy':
        return 10000 // 10 seconds
      case 'degraded':
        return 5000 // 5 seconds
      default:
        return 1000 // 1 second
    }
  }

  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

// Singleton instance
let healthMonitor: ConnectionHealthMonitor | null = null

export function createConnectionHealthMonitor(connection: any): ConnectionHealthMonitor {
  if (healthMonitor) {
    healthMonitor.destroy()
  }
  
  healthMonitor = new ConnectionHealthMonitor(connection)
  return healthMonitor
}

export function getConnectionHealthMonitor(): ConnectionHealthMonitor | null {
  return healthMonitor
}

// Rate limiting utilities
export const RateLimitHelpers = {
  // Check if we should delay a request based on connection health
  shouldDelayRequest: (): boolean => {
    return healthMonitor?.shouldThrottleRequests() ?? false
  },

  // Get recommended delay before next request
  getDelayMs: (): number => {
    return healthMonitor?.getRecommendedRetryDelay() ?? 1000
  },

  // Check if we're likely being rate limited
  isLikelyRateLimited: (): boolean => {
    return healthMonitor?.isRateLimited() ?? false
  },

  // Create a delay promise
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
} 