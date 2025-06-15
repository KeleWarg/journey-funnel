interface MetricData {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  track(
    name: string, 
    startTime: number, 
    success: boolean, 
    error?: string, 
    metadata?: Record<string, any>
  ): void {
    const endTime = Date.now();
    const metric: MetricData = {
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      success,
      error,
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log important metrics
    if (!success || metric.duration > 5000) {
      console.log(`[METRICS] ${name}: ${metric.duration}ms, success: ${success}${error ? `, error: ${error}` : ''}`);
    }
  }

  getMetrics(name?: string): MetricData[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getStats(name?: string): {
    count: number;
    avgDuration: number;
    successRate: number;
    totalDuration: number;
  } {
    const relevantMetrics = name ? this.metrics.filter(m => m.name === name) : this.metrics;
    
    if (relevantMetrics.length === 0) {
      return { count: 0, avgDuration: 0, successRate: 0, totalDuration: 0 };
    }

    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    const successCount = relevantMetrics.filter(m => m.success).length;

    return {
      count: relevantMetrics.length,
      avgDuration: totalDuration / relevantMetrics.length,
      successRate: (successCount / relevantMetrics.length) * 100,
      totalDuration
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

export const metrics = new MetricsCollector(); 