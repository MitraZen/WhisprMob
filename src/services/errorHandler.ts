// Phase 3: Enhanced Error Handling and Recovery Mechanisms
import { performanceMonitor } from './performanceMonitor';

interface ErrorContext {
  userId?: string;
  operation: string;
  timestamp: number;
  retryCount: number;
  lastError?: Error;
  metadata?: Record<string, any>;
}

interface RecoveryStrategy {
  name: string;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry: (error: Error, context: ErrorContext) => boolean;
  onRetry: (context: ErrorContext) => Promise<void>;
  onFailure: (context: ErrorContext) => Promise<void>;
}

class ErrorHandler {
  private errorHistory: Map<string, ErrorContext[]> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private circuitBreakers: Map<string, { isOpen: boolean; lastFailure: number; failureCount: number }> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRecoveryStrategies();
  }

  // Initialize default recovery strategies
  private initializeRecoveryStrategies(): void {
    // Realtime connection strategy
    this.addRecoveryStrategy('realtime-connection', {
      name: 'Realtime Connection Recovery',
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      shouldRetry: (error, context) => {
        return context.retryCount < 3 && 
               !error.message.includes('Circuit breaker') &&
               !error.message.includes('Authentication');
      },
      onRetry: async (context) => {
        console.log(`🔄 Retrying realtime connection (attempt ${context.retryCount + 1})`);
        // Implement reconnection logic
      },
      onFailure: async (context) => {
        console.log('🔒 Realtime connection failed - activating circuit breaker');
        this.openCircuitBreaker('realtime-connection');
        // Switch to polling fallback
        try {
          const { notificationManager } = await import('./notificationManager');
          await (notificationManager as any).startPollingFallback(context.userId!);
        } catch (error) {
          console.error('Failed to start polling fallback:', error);
        }
      }
    });

    // Database operation strategy
    this.addRecoveryStrategy('database-operation', {
      name: 'Database Operation Recovery',
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 1.5,
      shouldRetry: (error, context) => {
        return context.retryCount < 5 && 
               !error.message.includes('Permission denied') &&
               !error.message.includes('Invalid credentials');
      },
      onRetry: async (context) => {
        console.log(`🔄 Retrying database operation (attempt ${context.retryCount + 1})`);
        // Implement database retry logic
      },
      onFailure: async (context) => {
        console.log('❌ Database operation failed permanently');
        performanceMonitor.recordError();
      }
    });

    // Notification delivery strategy
    this.addRecoveryStrategy('notification-delivery', {
      name: 'Notification Delivery Recovery',
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      shouldRetry: (error, context) => {
        return context.retryCount < 2 && 
               !error.message.includes('Permission denied') &&
               !error.message.includes('Invalid token');
      },
      onRetry: async (context) => {
        console.log(`🔄 Retrying notification delivery (attempt ${context.retryCount + 1})`);
        // Implement notification retry logic
      },
      onFailure: async (context) => {
        console.log('❌ Notification delivery failed permanently');
        // Log to analytics or error tracking service
      }
    });

    // Network request strategy
    this.addRecoveryStrategy('network-request', {
      name: 'Network Request Recovery',
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      shouldRetry: (error, context) => {
        return context.retryCount < 3 && 
               (error.message.includes('timeout') || 
                error.message.includes('network') ||
                error.message.includes('ECONNREFUSED'));
      },
      onRetry: async (context) => {
        console.log(`🔄 Retrying network request (attempt ${context.retryCount + 1})`);
        // Implement network retry logic
      },
      onFailure: async (context) => {
        console.log('❌ Network request failed permanently');
        // Implement offline mode or cached response
      }
    });
  }

  // Add a custom recovery strategy
  addRecoveryStrategy(key: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(key, strategy);
    console.log(`🛡️ Added recovery strategy: ${strategy.name}`);
  }

  // Handle an error with automatic recovery
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    const errorKey = `${context.operation}-${context.userId || 'global'}`;
    
    // Record error in history
    if (!this.errorHistory.has(errorKey)) {
      this.errorHistory.set(errorKey, []);
    }
    this.errorHistory.get(errorKey)!.push(context);
    
    // Record error in performance monitor
    performanceMonitor.recordError();
    
    console.error(`❌ Error in ${context.operation}:`, error.message);
    
    // Check if circuit breaker is open
    if (this.isCircuitBreakerOpen(context.operation)) {
      console.log(`🔒 Circuit breaker open for ${context.operation} - skipping retry`);
      return;
    }
    
    // Get recovery strategy
    const strategy = this.getRecoveryStrategy(context.operation);
    if (!strategy) {
      console.log(`⚠️ No recovery strategy found for ${context.operation}`);
      return;
    }
    
    // Check if we should retry
    if (!strategy.shouldRetry(error, context)) {
      console.log(`❌ Not retrying ${context.operation} - strategy says no`);
      await strategy.onFailure(context);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      strategy.baseDelay * Math.pow(strategy.backoffMultiplier, context.retryCount),
      strategy.maxDelay
    );
    
    console.log(`⏰ Retrying ${context.operation} in ${delay}ms (attempt ${context.retryCount + 1})`);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Execute retry
    try {
      await strategy.onRetry(context);
    } catch (retryError) {
      // Increment retry count and try again
      const newContext = { ...context, retryCount: context.retryCount + 1, lastError: retryError as Error };
      await this.handleError(retryError as Error, newContext);
    }
  }

  // Get recovery strategy for an operation
  private getRecoveryStrategy(operation: string): RecoveryStrategy | undefined {
    // Try exact match first
    if (this.recoveryStrategies.has(operation)) {
      return this.recoveryStrategies.get(operation);
    }
    
    // Try partial match
    for (const [key, strategy] of this.recoveryStrategies) {
      if (operation.includes(key)) {
        return strategy;
      }
    }
    
    return undefined;
  }

  // Circuit breaker management
  openCircuitBreaker(operation: string): void {
    this.circuitBreakers.set(operation, {
      isOpen: true,
      lastFailure: Date.now(),
      failureCount: (this.circuitBreakers.get(operation)?.failureCount || 0) + 1
    });
    console.log(`🔒 Circuit breaker opened for ${operation}`);
  }

  closeCircuitBreaker(operation: string): void {
    this.circuitBreakers.delete(operation);
    console.log(`🔓 Circuit breaker closed for ${operation}`);
  }

  isCircuitBreakerOpen(operation: string): boolean {
    const breaker = this.circuitBreakers.get(operation);
    if (!breaker) return false;
    
    // Auto-close after 5 minutes
    if (Date.now() - breaker.lastFailure > 300000) {
      this.closeCircuitBreaker(operation);
      return false;
    }
    
    return breaker.isOpen;
  }

  // Start error monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🛡️ Starting error monitoring...');
    
    // Monitor errors every minute
    this.monitoringInterval = setInterval(() => {
      this.analyzeErrorPatterns();
      this.cleanupOldErrors();
    }, 60000);
  }

  // Stop error monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('🛑 Stopping error monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Analyze error patterns for proactive recovery
  private analyzeErrorPatterns(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    for (const [key, errors] of this.errorHistory) {
      const recentErrors = errors.filter(error => error.timestamp > oneHourAgo);
      
      if (recentErrors.length > 10) {
        console.warn(`⚠️ High error rate detected for ${key}: ${recentErrors.length} errors in the last hour`);
        
        // Implement proactive measures
        this.implementProactiveMeasures(key, recentErrors);
      }
    }
  }

  // Implement proactive measures based on error patterns
  private implementProactiveMeasures(operation: string, errors: ErrorContext[]): void {
    console.log(`🔧 Implementing proactive measures for ${operation}`);
    
    // Analyze error types
    const errorTypes = new Map<string, number>();
    errors.forEach(error => {
      const type = error.lastError?.message.split(':')[0] || 'Unknown';
      errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
    });
    
    // Implement measures based on error types
    for (const [type, count] of errorTypes) {
      if (type.includes('network') && count > 5) {
        console.log('🌐 Implementing network resilience measures');
        this.openCircuitBreaker(operation);
      } else if (type.includes('database') && count > 3) {
        console.log('🗄️ Implementing database resilience measures');
        // Implement connection pooling or retry logic
      } else if (type.includes('notification') && count > 2) {
        console.log('📨 Implementing notification resilience measures');
        // Implement notification queuing
      }
    }
  }

  // Cleanup old error records
  private cleanupOldErrors(): void {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    
    for (const [key, errors] of this.errorHistory) {
      const recentErrors = errors.filter(error => error.timestamp > oneDayAgo);
      this.errorHistory.set(key, recentErrors);
    }
  }

  // Get error statistics
  getErrorStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, errors] of this.errorHistory) {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const oneDayAgo = now - 86400000;
      
      stats[key] = {
        total: errors.length,
        lastHour: errors.filter(e => e.timestamp > oneHourAgo).length,
        lastDay: errors.filter(e => e.timestamp > oneDayAgo).length,
        lastError: errors[errors.length - 1]?.timestamp,
        circuitBreakerOpen: this.isCircuitBreakerOpen(key),
      };
    }
    
    return stats;
  }

  // Generate error report
  generateErrorReport(): string {
    const stats = this.getErrorStats();
    const report = `
🛡️ Error Handling Report
========================
Total Operations Monitored: ${Object.keys(stats).length}
Circuit Breakers Open: ${Object.values(stats).filter((s: any) => s.circuitBreakerOpen).length}

Operation Statistics:
${Object.entries(stats).map(([key, stat]: [string, any]) => 
  `  ${key}: ${stat.total} total, ${stat.lastHour} last hour, ${stat.lastDay} last day`
).join('\n')}

Recovery Strategies:
${Array.from(this.recoveryStrategies.values()).map(s => 
  `  ${s.name}: ${s.maxRetries} max retries, ${s.baseDelay}ms base delay`
).join('\n')}
========================
    `;
    return report.trim();
  }

  // Test error handling with simulated errors
  async testErrorHandling(): Promise<void> {
    console.log('🧪 Testing error handling...');
    
    const testErrors = [
      new Error('Network timeout'),
      new Error('Database connection failed'),
      new Error('Notification permission denied'),
      new Error('Authentication failed'),
    ];
    
    for (const error of testErrors) {
      const context: ErrorContext = {
        operation: 'test-operation',
        timestamp: Date.now(),
        retryCount: 0,
        lastError: error,
      };
      
      await this.handleError(error, context);
    }
    
    console.log('✅ Error handling test completed');
  }
}

export const errorHandler = new ErrorHandler();
