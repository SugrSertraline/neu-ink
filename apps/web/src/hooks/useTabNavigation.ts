import { useCallback, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTabStore } from '@/store/ui/tabStore';

interface UseTabNavigationOptions {
  onNavigationStart?: (tabId: string) => void;
  onNavigationEnd?: (tabId: string) => void;
  onError?: (error: Error, tabId: string) => void;
}

// 标签页内容缓存
const tabContentCache = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}>();

// 预加载队列
const preloadQueue = new Set<string>();
let isPreloading = false;

export function useTabNavigation(options: UseTabNavigationOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tabs, activeTabId, loadingTabId, setLoading, setActiveTab } = useTabStore();
  
  const navigationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isNavigatingRef = useRef(false);

  // 获取当前完整的 href
  const getCurrentHref = useCallback(() => {
    const base = pathname ?? '';
    const query = searchParams?.toString();
    return query ? `${base}?${query}` : base;
  }, [pathname, searchParams]);

  // 缓存标签页内容
  const cacheTabContent = useCallback((tabId: string, data: any, ttl = 5 * 60 * 1000) => {
    tabContentCache.set(tabId, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  // 获取缓存的标签页内容
  const getCachedTabContent = useCallback((tabId: string) => {
    const cached = tabContentCache.get(tabId);
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      tabContentCache.delete(tabId);
      return null;
    }
    
    return cached.data;
  }, []);

  // 清理过期的缓存
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    for (const [tabId, cached] of tabContentCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        tabContentCache.delete(tabId);
      }
    }
  }, []);

  // 预加载标签页内容
  const preloadTabContent = useCallback(async (tabId: string, tabPath: string) => {
    if (preloadQueue.has(tabId) || isPreloading || getCachedTabContent(tabId)) {
      return;
    }

    preloadQueue.add(tabId);
    isPreloading = true;

    try {
      // 这里可以根据不同的标签页类型预加载不同的内容
      // 例如：论文页面可以预加载论文数据，库页面可以预加载论文列表等
      console.log(`Preloading content for tab: ${tabId}`);
      
      // 模拟预加载延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 缓存预加载的内容
      cacheTabContent(tabId, { preloaded: true, path: tabPath });
    } catch (error) {
      console.error(`Failed to preload tab ${tabId}:`, error);
    } finally {
      preloadQueue.delete(tabId);
      isPreloading = false;
    }
  }, [getCachedTabContent, cacheTabContent]);

  // 优化的标签页切换函数
  const navigateToTab = useCallback(async (tabId: string, tabPath: string) => {
    // 防止重复导航
    if (isNavigatingRef.current) {
      return;
    }

    const currentHref = getCurrentHref();
    
    // 如果已经是当前标签页且路径相同，不做任何操作
    if (tabId === activeTabId && currentHref === tabPath) {
      return;
    }

    isNavigatingRef.current = true;
    options.onNavigationStart?.(tabId);
    
    setActiveTab(tabId);
    setLoading(true, tabId);

    try {
      // 检查是否有缓存的内容
      const cachedContent = getCachedTabContent(tabId);
      if (cachedContent) {
        console.log(`Using cached content for tab: ${tabId}`);
      }

      await router.push(tabPath);
      
      // 导航成功后缓存当前标签页
      cacheTabContent(tabId, { path: tabPath, lastVisited: Date.now() });
      
      options.onNavigationEnd?.(tabId);
    } catch (error) {
      console.error('Navigation error:', error);
      options.onError?.(error as Error, tabId);
      setLoading(false, null);
    } finally {
      // 使用防抖来重置导航状态
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
        setLoading(false, null);
      }, 300);
    }
  }, [getCurrentHref, activeTabId, setActiveTab, setLoading, router, getCachedTabContent, cacheTabContent, options]);

  // 预加载相邻的标签页
  const preloadAdjacentTabs = useCallback(() => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
    if (currentIndex === -1) return;

    // 预加载前一个和后一个标签页
    const adjacentIndices = [currentIndex - 1, currentIndex + 1].filter(index => 
      index >= 0 && index < tabs.length
    );

    adjacentIndices.forEach(index => {
      const tab = tabs[index];
      if (tab && tab.path) {
        // 延迟预加载，避免影响当前页面性能
        setTimeout(() => preloadTabContent(tab.id, tab.path), 500);
      }
    });
  }, [tabs, activeTabId, preloadTabContent]);

  // 清理缓存
  const clearTabCache = useCallback((tabId?: string) => {
    if (tabId) {
      tabContentCache.delete(tabId);
    } else {
      tabContentCache.clear();
    }
  }, []);

  // 定期清理过期缓存
  useEffect(() => {
    const interval = setInterval(cleanExpiredCache, 60 * 1000); // 每分钟清理一次
    return () => clearInterval(interval);
  }, [cleanExpiredCache]);

  // 当标签页切换完成后，预加载相邻标签页
  useEffect(() => {
    if (!loadingTabId && activeTabId) {
      const timer = setTimeout(preloadAdjacentTabs, 1000); // 延迟1秒后预加载
      return () => clearTimeout(timer);
    }
  }, [loadingTabId, activeTabId, preloadAdjacentTabs]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return {
    navigateToTab,
    preloadTabContent,
    getCachedTabContent,
    clearTabCache,
    isNavigating: isNavigatingRef.current,
    preloadAdjacentTabs
  };
}