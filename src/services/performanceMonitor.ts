// Performance Monitoring Service for Phase 2 Hybrid System
import { notificationManager } from './notificationManager';
import { realtimeService } from './realtimeService';

interface PerformanceMetrics {
  realtimeSuccessRate: number;
  fallbackActivations: number;
  averageLatency: number;
  totalNotifications: number;
  realtimeNotifications: number;
  pollingNotifications: number;
  connectionHealth: 'healthy' | 'degraded' | 'failed';
  lastHealthCheck: number;
  batteryOptimization: boolean;
  backgroundMode: boolean;
}

interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetrics;
  recommendations: string[];
  alerts: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    realtimeSuccessRate: 0,
    fallbackActivations: 0,
    averageLatency: 0,
    totalNotifications: 0,
    realtimeNotifications: 0,
    pollingNotifications: 0,
    connectionHealth: 'failed',
    lastHealthCheck: 0,
    batteryOptimization: false,
    backgroundMode: false,
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private reports: PerformanceReport[] = [];
  private maxReports = 100; // Keep last 100 reports

  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('📊 Performance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('📊 Starting performance monitoring...');

    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.generateReport();
    }, 30000);

    // Initial metrics collection
    this.collectMetrics();
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
  }

  private collectMetrics(): void {
    try {
      // Get metrics from notification manager
      const notificationMetrics = notificationManager.getPerformanceMetrics();
      const serviceStatus = notificationManager.getServiceStatus();

      // Update metrics
      this.metrics = {
        ...this.metrics,
        ...notificationMetrics,
        connectionHealth: serviceStatus.connectionHealth,
        lastHealthCheck: Date.now(),
      };

      console.log('📊 Metrics collected:', {
        realtime: serviceStatus.realtime,
        polling: serviceStatus.polling,
        fallbackMode: serviceStatus.fallbackMode,
        health: serviceStatus.connectionHealth,
        notifications: this.metrics.totalNotifications,
      });
    } catch (error) {
      console.error('❌ Error collecting performance metrics:', error);
    }
  }

  private generateReport(): void {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      recommendations: this.generateRecommendations(),
      alerts: this.generateAlerts(),
    };

    // Add to reports
    this.reports.push(report);
    
    // Keep only recent reports
    if (this.reports.length > this.maxReports) {
      this.reports = this.reports.slice(-this.maxReports);
    }

    // Log significant events
    if (report.alerts.length > 0) {
      console.warn('⚠️ Performance alerts:', report.alerts);
    }

    if (report.recommendations.length > 0) {
      console.log('💡 Performance recommendations:', report.recommendations);
    }
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Realtime success rate recommendations
    if (this.metrics.realtimeSuccessRate < 80) {
      recommendations.push('Consider checking network connectivity - realtime success rate is low');
    }

    // Fallback activation recommendations
    if (this.metrics.fallbackActivations > 5) {
      recommendations.push('High fallback activations detected - investigate realtime connection stability');
    }

    // Latency recommendations
    if (this.metrics.averageLatency > 5000) {
      recommendations.push('High notification latency detected - consider optimizing network requests');
    }

    // Battery optimization recommendations
    if (this.metrics.pollingNotifications > this.metrics.realtimeNotifications * 2) {
      recommendations.push('Polling notifications exceed realtime - consider investigating realtime connection');
    }

    return recommendations;
  }

  private generateAlerts(): string[] {
    const alerts: string[] = [];

    // Connection health alerts
    if (this.metrics.connectionHealth === 'failed') {
      alerts.push('CRITICAL: Notification service connection failed');
    } else if (this.metrics.connectionHealth === 'degraded') {
      alerts.push('WARNING: Notification service running in degraded mode');
    }

    // Performance alerts
    if (this.metrics.realtimeSuccessRate < 50) {
      alerts.push('WARNING: Realtime success rate below 50%');
    }

    if (this.metrics.fallbackActivations > 10) {
      alerts.push('WARNING: Excessive fallback activations detected');
    }

    return alerts;
  }

  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getRecentReports(count: number = 10): PerformanceReport[] {
    return this.reports.slice(-count);
  }

  getPerformanceSummary(): {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    keyMetrics: {
      uptime: number;
      efficiency: number;
      reliability: number;
    };
    trends: {
      realtimeTrend: 'improving' | 'stable' | 'declining';
      fallbackTrend: 'improving' | 'stable' | 'declining';
    };
  } {
    const recentReports = this.getRecentReports(5);
    
    // Calculate overall health
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    
    if (this.metrics.connectionHealth === 'failed') {
      overallHealth = 'poor';
    } else if (this.metrics.connectionHealth === 'degraded') {
      overallHealth = 'fair';
    } else if (this.metrics.realtimeSuccessRate < 90) {
      overallHealth = 'good';
    }

    // Calculate key metrics
    const uptime = this.metrics.connectionHealth === 'healthy' ? 100 : 
                   this.metrics.connectionHealth === 'degraded' ? 75 : 0;
    
    const efficiency = this.metrics.totalNotifications > 0 ? 
      (this.metrics.realtimeNotifications / this.metrics.totalNotifications) * 100 : 0;
    
    const reliability = this.metrics.realtimeSuccessRate;

    // Calculate trends
    const realtimeTrend = this.calculateTrend(recentReports.map(r => r.metrics.realtimeSuccessRate));
    const fallbackTrend = this.calculateTrend(recentReports.map(r => r.metrics.fallbackActivations));

    return {
      overallHealth,
      keyMetrics: {
        uptime,
        efficiency,
        reliability,
      },
      trends: {
        realtimeTrend,
        fallbackTrend,
      },
    };
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    
    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  // Export metrics for external monitoring
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      recentReports: this.getRecentReports(5),
    }, null, 2);
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.metrics = {
      realtimeSuccessRate: 0,
      fallbackActivations: 0,
      averageLatency: 0,
      totalNotifications: 0,
      realtimeNotifications: 0,
      pollingNotifications: 0,
      connectionHealth: 'failed',
      lastHealthCheck: 0,
      batteryOptimization: false,
      backgroundMode: false,
    };
    this.reports = [];
    console.log('📊 Performance metrics reset');
  }
}

export const performanceMonitor = new PerformanceMonitor();
