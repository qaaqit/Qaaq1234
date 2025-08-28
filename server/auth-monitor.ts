/**
 * Authentication Health Monitoring System
 * Tracks auth performance and automatically handles issues
 * Can be disabled via environment variable
 */

import { authCache } from './auth-cache';
import { authRateLimiter } from './auth-rate-limiter';
import { authPool } from './auth-pool';
import { smartAuthPriority } from './auth-priority';

interface AuthMetrics {
  totalRequests: number;
  successfulAuths: number;
  failedAuths: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
  errors: { type: string; count: number; lastOccurred: Date }[];
  lastHealthCheck: Date;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

class AuthHealthMonitor {
  private metrics: AuthMetrics;
  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_TIMES = 100;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return process.env.DISABLE_AUTH_MONITORING !== 'true';
  }

  /**
   * Initialize empty metrics
   */
  private initializeMetrics(): AuthMetrics {
    return {
      totalRequests: 0,
      successfulAuths: 0,
      failedAuths: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      errors: [],
      lastHealthCheck: new Date(),
      healthStatus: 'healthy'
    };
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (!this.isEnabled()) {
      console.log('⚠️ AUTH MONITOR: Monitoring disabled via environment variable');
      return;
    }

    // Clear existing timer if any
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Run health check periodically
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log('✅ AUTH MONITOR: Health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('🛑 AUTH MONITOR: Health monitoring stopped');
    }
  }

  /**
   * Record authentication attempt
   */
  recordAuth(success: boolean, responseTime: number, fromCache: boolean, error?: string): void {
    if (!this.isEnabled()) return;

    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulAuths++;
    } else {
      this.metrics.failedAuths++;
    }

    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Track response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
      this.responseTimes.shift();
    }

    // Calculate average response time
    this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    // Track errors
    if (error) {
      this.recordError(error);
    }

    // Check for degradation
    this.checkHealthStatus();
  }

  /**
   * Record an error occurrence
   */
  private recordError(errorType: string): void {
    const existingError = this.metrics.errors.find(e => e.type === errorType);
    
    if (existingError) {
      existingError.count++;
      existingError.lastOccurred = new Date();
    } else {
      this.metrics.errors.push({
        type: errorType,
        count: 1,
        lastOccurred: new Date()
      });
    }

    // Keep only top 10 most common errors
    this.metrics.errors.sort((a, b) => b.count - a.count);
    this.metrics.errors = this.metrics.errors.slice(0, 10);
  }

  /**
   * Check overall health status
   */
  private checkHealthStatus(): void {
    const successRate = this.metrics.successfulAuths / Math.max(this.metrics.totalRequests, 1);
    const cacheHitRate = this.metrics.cacheHits / Math.max(this.metrics.cacheHits + this.metrics.cacheMisses, 1);
    const errorRate = this.metrics.failedAuths / Math.max(this.metrics.totalRequests, 1);

    // Determine health status
    if (errorRate > 0.5 || this.metrics.avgResponseTime > 5000) {
      this.metrics.healthStatus = 'critical';
      console.error('🚨 AUTH MONITOR: Critical health status detected!');
      this.triggerRecoveryActions();
    } else if (errorRate > 0.2 || this.metrics.avgResponseTime > 2000 || successRate < 0.8) {
      this.metrics.healthStatus = 'degraded';
      console.warn('⚠️ AUTH MONITOR: Degraded health status detected');
    } else {
      this.metrics.healthStatus = 'healthy';
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isEnabled()) return;

    console.log('🏥 AUTH MONITOR: Performing health check...');
    const startTime = Date.now();

    try {
      // Check cache health
      const cacheStats = authCache.getStats();
      
      // Check rate limiter health
      const rateLimiterStats = authRateLimiter.getStats();
      
      // Check connection pool health
      const poolHealth = await authPool.healthCheck();
      
      // Check auth priority system
      const priorityStats = smartAuthPriority.getStats();

      // Log health summary
      console.log('📊 AUTH MONITOR: Health Check Summary:', {
        cacheEnabled: cacheStats.enabled,
        cacheSize: cacheStats.size,
        rateLimiterEnabled: rateLimiterStats.enabled,
        blockedIPs: rateLimiterStats.blockedIPs,
        poolHealthy: poolHealth.healthy,
        poolLatency: poolHealth.latency,
        authPriority: priorityStats.mode,
        overallStatus: this.metrics.healthStatus
      });

      this.metrics.lastHealthCheck = new Date();
    } catch (error: any) {
      console.error('❌ AUTH MONITOR: Health check failed:', error.message);
      this.recordError('health_check_failure');
    }
  }

  /**
   * Trigger automatic recovery actions for critical issues
   */
  private triggerRecoveryActions(): void {
    console.log('🔧 AUTH MONITOR: Triggering recovery actions...');

    // Clear cache if it might be causing issues
    if (authCache.getStats().size > 500) {
      authCache.clear();
      console.log('🔧 AUTH MONITOR: Cleared authentication cache');
    }

    // Reset metrics after recovery
    setTimeout(() => {
      this.metrics.totalRequests = 0;
      this.metrics.successfulAuths = 0;
      this.metrics.failedAuths = 0;
      this.responseTimes = [];
      console.log('🔧 AUTH MONITOR: Reset metrics after recovery');
    }, 5000);
  }

  /**
   * Get current metrics
   */
  getMetrics(): AuthMetrics & { enabled: boolean } {
    return {
      ...this.metrics,
      enabled: this.isEnabled()
    };
  }

  /**
   * Get health endpoint response
   */
  getHealthResponse(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: {
      successRate: number;
      cacheHitRate: number;
      avgResponseTime: number;
      errorRate: number;
    };
    components: {
      cache: boolean;
      rateLimiter: boolean;
      authPool: boolean;
      monitoring: boolean;
    };
    lastCheck: Date;
  } {
    const successRate = this.metrics.successfulAuths / Math.max(this.metrics.totalRequests, 1);
    const cacheHitRate = this.metrics.cacheHits / Math.max(this.metrics.cacheHits + this.metrics.cacheMisses, 1);
    const errorRate = this.metrics.failedAuths / Math.max(this.metrics.totalRequests, 1);

    return {
      status: this.metrics.healthStatus,
      metrics: {
        successRate: Math.round(successRate * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        avgResponseTime: Math.round(this.metrics.avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      },
      components: {
        cache: authCache.isEnabled(),
        rateLimiter: authRateLimiter.isEnabled(),
        authPool: authPool.isEnabled(),
        monitoring: this.isEnabled()
      },
      lastCheck: this.metrics.lastHealthCheck
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.responseTimes = [];
    console.log('🔄 AUTH MONITOR: Metrics reset');
  }
}

// Export singleton instance
export const authMonitor = new AuthHealthMonitor();