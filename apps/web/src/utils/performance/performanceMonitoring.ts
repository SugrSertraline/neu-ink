// 性能监控工具函数
import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  reRenderCount: number;
  memoryUsage?: number;
  timestamp: number;
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitorOptions {
  enableMemoryTracking?: boolean;
  enableRenderTracking?: boolean;
  sampleRate?: number;
  maxSamples?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor(
  componentName: string,
  options: PerformanceMonitorOptions = {}
) {
  const {
    enableMemoryTracking = false,
    enableRenderTracking = true,
    sampleRate = 1,
    maxSamples = 100,
    onMetricsUpdate,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics[]>([]);

  // 记录渲染开始
  const startRender = useCallback(() => {
    if (!enableRenderTracking) return;
    startTimeRef.current = performance.now();
    renderCountRef.current++;
  }, [enableRenderTracking]);

  // 记录渲染结束
  const endRender = useCallback(() => {
    if (!enableRenderTracking || startTimeRef.current === 0) return;

    const renderTime = performance.now() - startTimeRef.current;
    const memoryUsage = enableMemoryTracking && (performance as any).memory 
      ? (performance as any).memory.usedJSHeapSize 
      : undefined;

    const newMetric: PerformanceMetrics = {
      renderTime,
      componentCount: 1,
      reRenderCount: renderCountRef.current,
      memoryUsage,
      timestamp: Date.now(),
    };

    // 根据采样率决定是否记录
    if (Math.random() <= sampleRate) {
      const updatedMetrics = [...metricsRef.current, newMetric];
      
      // 限制样本数量
      if (updatedMetrics.length > maxSamples) {
        updatedMetrics.shift();
      }
      
      metricsRef.current = updatedMetrics;
      setMetrics(updatedMetrics);
      
      onMetricsUpdate?.(newMetric);
    }

    startTimeRef.current = 0;
  }, [enableRenderTracking, enableMemoryTracking, sampleRate, maxSamples, onMetricsUpdate]);

  // 获取平均渲染时间
  const getAverageRenderTime = useCallback(() => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return total / metrics.length;
  }, [metrics]);

  // 获取最大渲染时间
  const getMaxRenderTime = useCallback(() => {
    if (metrics.length === 0) return 0;
    return Math.max(...metrics.map(metric => metric.renderTime));
  }, [metrics]);

  // 清除指标
  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
    setMetrics([]);
    renderCountRef.current = 0;
  }, []);

  return {
    metrics,
    startRender,
    endRender,
    getAverageRenderTime,
    getMaxRenderTime,
    clearMetrics,
    renderCount: renderCountRef.current,
  };
}

/**
 * 渲染性能监控 Hook
 */
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const [performanceStats, setPerformanceStats] = useState<{
    renderCount: number;
    averageRenderTime: number;
    maxRenderTime: number;
    lastRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    lastRenderTime: 0,
  });

  const startRenderTime = useRef<number>(0);

  // 开始渲染计时
  const startTiming = useCallback(() => {
    startRenderTime.current = performance.now();
  }, []);

  // 结束渲染计时
  const endTiming = useCallback(() => {
    if (startRenderTime.current === 0) return;

    const renderTime = performance.now() - startRenderTime.current;
    renderCountRef.current++;
    renderTimesRef.current.push(renderTime);

    // 只保留最近50次渲染记录
    if (renderTimesRef.current.length > 50) {
      renderTimesRef.current.shift();
    }

    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
    const maxRenderTime = Math.max(...renderTimesRef.current);

    setPerformanceStats({
      renderCount: renderCountRef.current,
      averageRenderTime,
      maxRenderTime,
      lastRenderTime: renderTime,
    });

    startRenderTime.current = 0;
  }, []);

  return {
    startTiming,
    endTiming,
    performanceStats,
  };
}

/**
 * 内存使用监控 Hook
 */
export function useMemoryMonitor(interval: number = 5000) {
  const [memoryStats, setMemoryStats] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryStats = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        setMemoryStats({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        });
      }
    };

    updateMemoryStats();
    const intervalId = setInterval(updateMemoryStats, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return memoryStats;
}

/**
 * 网络性能监控 Hook
 */
export function useNetworkMonitor() {
  const [networkStats, setNetworkStats] = useState<{
    online: boolean;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  }>({
    online: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
  });

  useEffect(() => {
    const updateNetworkStats = () => {
      const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

      if (connection) {
        setNetworkStats({
          online: navigator.onLine,
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        });
      }
    };

    const handleOnline = () => {
      setNetworkStats(prev => ({ ...prev, online: true }));
      updateNetworkStats();
    };

    const handleOffline = () => {
      setNetworkStats(prev => ({ ...prev, online: false }));
    };

    const handleConnectionChange = () => {
      updateNetworkStats();
    };

    updateNetworkStats();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStats;
}

/**
 * 性能警告 Hook
 */
export function usePerformanceWarnings(options: {
  maxRenderTime?: number;
  maxMemoryUsage?: number;
  maxReRenders?: number;
  onWarning?: (type: string, data: any) => void;
} = {}) {
  const {
    maxRenderTime = 16, // 60fps
    maxMemoryUsage = 50 * 1024 * 1024, // 50MB
    maxReRenders = 100,
    onWarning,
  } = options;

  const checkPerformance = useCallback((metrics: PerformanceMetrics) => {
    // 检查渲染时间
    if (metrics.renderTime > maxRenderTime) {
      const warning = {
        type: 'RENDER_TIME',
        message: `Render time ${metrics.renderTime.toFixed(2)}ms exceeds threshold ${maxRenderTime}ms`,
        data: metrics,
      };
      onWarning?.(warning.type, warning);
      console.warn(warning.message);
    }

    // 检查内存使用
    if (metrics.memoryUsage && metrics.memoryUsage > maxMemoryUsage) {
      const warning = {
        type: 'MEMORY_USAGE',
        message: `Memory usage ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB exceeds threshold ${(maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
        data: metrics,
      };
      onWarning?.(warning.type, warning);
      console.warn(warning.message);
    }

    // 检查重渲染次数
    if (metrics.reRenderCount > maxReRenders) {
      const warning = {
        type: 'RE_RENDERS',
        message: `Re-render count ${metrics.reRenderCount} exceeds threshold ${maxReRenders}`,
        data: metrics,
      };
      onWarning?.(warning.type, warning);
      console.warn(warning.message);
    }
  }, [maxRenderTime, maxMemoryUsage, maxReRenders, onWarning]);

  return {
    checkPerformance,
  };
}

/**
 * 性能报告生成器
 */
export class PerformanceReporter {
  private metrics: PerformanceMetrics[] = [];
  private componentName: string;

  constructor(componentName: string) {
    this.componentName = componentName;
  }

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
  }

  generateReport() {
    if (this.metrics.length === 0) {
      return {
        componentName: this.componentName,
        summary: 'No performance data available',
        metrics: [],
      };
    }

    const renderTimes = this.metrics.map(m => m.renderTime);
    const memoryUsages = this.metrics.map(m => m.memoryUsage).filter(Boolean) as number[];
    
    const report = {
      componentName: this.componentName,
      summary: {
        totalRenders: this.metrics.length,
        averageRenderTime: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
        maxRenderTime: Math.max(...renderTimes),
        minRenderTime: Math.min(...renderTimes),
        averageMemoryUsage: memoryUsages.length > 0 
          ? memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length 
          : 0,
        maxMemoryUsage: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      },
      metrics: this.metrics,
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  private generateRecommendations() {
    const recommendations: string[] = [];
    const renderTimes = this.metrics.map(m => m.renderTime);
    const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;

    if (avgRenderTime > 16) {
      recommendations.push('Consider optimizing component rendering - average render time exceeds 16ms');
    }

    const memoryUsages = this.metrics.map(m => m.memoryUsage).filter(Boolean) as number[];
    if (memoryUsages.length > 0) {
      const avgMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
      if (avgMemoryUsage > 50 * 1024 * 1024) {
        recommendations.push('High memory usage detected - consider memory optimization');
      }
    }

    const reRenderCounts = this.metrics.map(m => m.reRenderCount);
    const maxReRenders = Math.max(...reRenderCounts);
    if (maxReRenders > 100) {
      recommendations.push('High re-render count detected - consider using React.memo or useMemo');
    }

    return recommendations;
  }

  clear() {
    this.metrics = [];
  }
}