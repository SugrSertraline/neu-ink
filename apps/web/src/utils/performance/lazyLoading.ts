// 懒加载工具函数
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * 懒加载状态
 */
export interface LazyLoadState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  loaded: boolean;
}

/**
 * 懒加载配置
 */
export interface LazyLoadOptions {
  trigger?: 'visible' | 'manual' | 'immediate';
  rootMargin?: string;
  threshold?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * 懒加载 Hook
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  options: LazyLoadOptions = {}
) {
  const {
    trigger = 'visible',
    rootMargin = '50px',
    threshold = 0.1,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<LazyLoadState<T>>({
    data: null,
    loading: false,
    error: null,
    loaded: false,
  });

  const [retryCountState, setRetryCountState] = useState(0);
  const elementRef = useRef<HTMLElement>(null);
  const loadPromiseRef = useRef<Promise<T> | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    if (state.loading || state.loaded) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await loader();
      setState({
        data,
        loading: false,
        error: null,
        loaded: true,
      });
      setRetryCountState(0);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      if (retryCountState < retryCount) {
        setTimeout(() => {
          setRetryCountState(prev => prev + 1);
          loadData();
        }, retryDelay);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err,
        }));
      }
    }
  }, [loader, state.loading, state.loaded, retryCountState, retryCount, retryDelay]);

  // 手动触发加载
  const triggerLoad = useCallback(() => {
    loadData();
  }, [loadData]);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      loaded: false,
    });
    setRetryCountState(0);
    loadPromiseRef.current = null;
  }, []);

  // Intersection Observer 设置
  useEffect(() => {
    if (trigger !== 'visible' || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !state.loaded && !state.loading) {
            loadData();
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [trigger, rootMargin, threshold, state.loaded, state.loading, loadData]);

  // 立即触发
  useEffect(() => {
    if (trigger === 'immediate' && !state.loaded && !state.loading) {
      loadData();
    }
  }, [trigger, state.loaded, state.loading, loadData]);

  return {
    ...state,
    elementRef,
    triggerLoad,
    reset,
    retryCount: retryCountState,
  };
}

/**
 * 图片懒加载 Hook
 */
export function useLazyImage(src: string, options: LazyLoadOptions = {}) {
  const [imageState, setImageState] = useState<{
    loaded: boolean;
    error: boolean;
    src: string | null;
  }>({
    loaded: false,
    error: false,
    src: null,
  });

  const { elementRef, triggerLoad } = useLazyLoad(
    async () => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setImageState({ loaded: true, error: false, src });
          resolve(src);
        };
        img.onerror = () => {
          setImageState(prev => ({ ...prev, error: true }));
          reject(new Error('Failed to load image'));
        };
        img.src = src;
      });
    },
    options
  );

  return {
    ...imageState,
    elementRef,
    triggerLoad,
  };
}

/**
 * 组件懒加载 Hook
 */
export function useLazyComponent<T extends React.ComponentType<any>>(
  componentLoader: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const [Component, setComponent] = useState<T | null>(null);
  const { loading, error, triggerLoad } = useLazyLoad(
    async () => {
      const module = await componentLoader();
      return module.default;
    },
    options
  );

  useEffect(() => {
    if (!loading && !error && Component) {
      // 组件已加载
    }
  }, [loading, error, Component]);

  const LazyComponent = useMemo(() => {
    if (!Component) return null;
    return Component;
  }, [Component]);

  return {
    LazyComponent,
    loading,
    error,
    triggerLoad,
  };
}

/**
 * 批量懒加载 Hook
 */
export function useBatchLazyLoad<T>(
  loaders: Array<{ key: string; loader: () => Promise<T> }>,
  options: LazyLoadOptions = {}
) {
  const [states, setStates] = useState<Record<string, LazyLoadState<T>>>(() => {
    return loaders.reduce((acc, { key }) => ({
      ...acc,
      [key]: { data: null, loading: false, error: null, loaded: false }
    }), {});
  });

  const [loadedKeys, setLoadedKeys] = useState<Set<string>>(new Set());

  // 加载单个项目
  const loadItem = useCallback(async (key: string) => {
    const loaderItem = loaders.find(item => item.key === key);
    if (!loaderItem) return;

    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null }
    }));

    try {
      const data = await loaderItem.loader();
      setStates(prev => ({
        ...prev,
        [key]: { data, loading: false, error: null, loaded: true }
      }));
      setLoadedKeys(prev => new Set([...prev, key]));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      setStates(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: false, error: err }
      }));
    }
  }, [loaders]);

  // 批量加载
  const loadAll = useCallback(async () => {
    const promises = loaders.map(({ key }) => loadItem(key));
    await Promise.allSettled(promises);
  }, [loaders, loadItem]);

  // 重置
  const reset = useCallback((key?: string) => {
    if (key) {
      setStates(prev => ({
        ...prev,
        [key]: { data: null, loading: false, error: null, loaded: false }
      }));
      setLoadedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    } else {
      setStates(loaders.reduce((acc, { key }) => ({
        ...acc,
        [key]: { data: null, loading: false, error: null, loaded: false }
      }), {}));
      setLoadedKeys(new Set());
    }
  }, [loaders]);

  return {
    states,
    loadedKeys,
    loadItem,
    loadAll,
    reset,
    allLoaded: loadedKeys.size === loaders.length,
    loadingCount: Object.values(states).filter(state => state.loading).length,
  };
}

/**
 * 预加载 Hook
 */
export function usePreload<T>(
  resources: Array<string | (() => Promise<T>)>,
  options: {
    priority?: 'high' | 'normal' | 'low';
    concurrency?: number;
  } = {}
) {
  const { priority = 'normal', concurrency = 3 } = options;
  const [preloadedResources, setPreloadedResources] = useState<Map<string, T>>(new Map());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const preloadResources = async () => {
      setLoading(true);
      const results = new Map<string, T>();
      let completed = 0;

      const processResource = async (resource: string | (() => Promise<T>), index: number): Promise<void> => {
        try {
          let result: T;
          
          if (typeof resource === 'string') {
            // 预加载图片
            result = await new Promise<T>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img as any);
              img.onerror = reject;
              img.src = resource;
            });
          } else {
            // 预加载异步资源
            result = await resource();
          }
          
          results.set(typeof resource === 'string' ? resource : `resource_${index}`, result);
        } catch (error) {
          console.error('Failed to preload resource:', error);
        } finally {
          completed++;
          setProgress((completed / resources.length) * 100);
        }
      };

      // 分批处理
      for (let i = 0; i < resources.length; i += concurrency) {
        const batch = resources.slice(i, i + concurrency);
        await Promise.all(batch.map(processResource));
      }

      setPreloadedResources(results);
      setLoading(false);
      setProgress(100);
    };

    if (resources.length > 0) {
      preloadResources();
    }
  }, [resources, concurrency]);

  return {
    preloadedResources,
    loading,
    progress,
    isPreloaded: (key: string) => preloadedResources.has(key),
    getPreloaded: (key: string) => preloadedResources.get(key),
  };
}

/**
 * 渐进式加载 Hook
 */
export function useProgressiveLoad<T>(
  loaders: Array<{
    priority: number;
    loader: () => Promise<T>;
    fallback?: T;
  }>,
  options: {
    delay?: number;
    fallbackDelay?: number;
  } = {}
) {
  const { delay = 0, fallbackDelay = 100 } = options;
  const [currentData, setCurrentData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadProgressively = async () => {
      const sortedLoaders = [...loaders].sort((a, b) => a.priority - b.priority);
      
      for (let i = 0; i < sortedLoaders.length; i++) {
        const loader = sortedLoaders[i];
        setCurrentIndex(i);
        setLoading(true);

        try {
          // 如果有延迟，等待延迟时间
          if (i > 0 && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const data = await loader.loader();
          setCurrentData(data);
          setLoading(false);
          break; // 成功加载后停止
        } catch (error) {
          console.error(`Failed to load resource with priority ${loader.priority}:`, error);
          
          // 如果有回退数据，使用回退数据
          if (loader.fallback) {
            setCurrentData(loader.fallback);
            setLoading(false);
            break;
          }
          
          // 如果是最后一个加载器也失败了，等待一段时间再继续
          if (i === sortedLoaders.length - 1) {
            await new Promise(resolve => setTimeout(resolve, fallbackDelay));
          }
        }
      }
    };

    if (loaders.length > 0) {
      loadProgressively();
    }
  }, [loaders, delay, fallbackDelay]);

  return {
    data: currentData,
    loading,
    currentIndex,
    totalLoaders: loaders.length,
  };
}