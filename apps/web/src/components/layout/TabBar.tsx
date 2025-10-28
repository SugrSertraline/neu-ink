'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTabStore } from '@/stores/useTabStore';
import { NavItem } from '@/types/navigation';
import { cn } from '@/lib/utils';

interface TabBarProps {
  navItems: NavItem[];
  onNavigate: (item: NavItem) => void;
  onCloseTab: (tabId: string) => void;
  isAuthenticated: boolean;
}

export default function TabBar({ navItems, onNavigate, onCloseTab, isAuthenticated }: TabBarProps) {
  const pathname = usePathname();
  const { tabs, activeTabId, loadingTabId, setLoading } = useTabStore();
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ✅ 过滤标签页：未登录时只显示不需要权限的标签页
  const visibleTabs = React.useMemo(() => {
    if (isAuthenticated) {
      return tabs;
    }
    // 未登录时只显示不需要权限的标签页
    return tabs.filter(tab => {
      const config = navItems.find(item => item.id === tab.id);
      return !config?.requiresAuth;
    });
  }, [tabs, isAuthenticated, navItems]);

  // 当活跃标签改变时，自动滚动到可见区域
  useEffect(() => {
    if (activeTabId) {
      scrollToTab(activeTabId);
    }
  }, [activeTabId]);

  // 监听路径变化，自动清除 loading 状态
  useEffect(() => {
    if (loadingTabId) {
      const targetTab = tabs.find(t => t.id === loadingTabId);
      if (targetTab && pathname === targetTab.path) {
        const timer = setTimeout(() => {
          setLoading(false, null);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, loadingTabId, tabs, setLoading]);

  // 检查滚动位置以显示/隐藏渐变遮罩和箭头
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftGradient(scrollLeft > 10);
        setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [visibleTabs]);

  // 鼠标滚轮横向滚动
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0 || e.shiftKey) {
        return;
      }
      
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // 鼠标拖拽滚动
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = 'grab';
      }
    }
  };

  // 箭头按钮滚动
  const scrollToDirection = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    const targetScroll = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  // 滚动到指定标签，使其可见
  const scrollToTab = (tabId: string) => {
    setTimeout(() => {
      const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
      if (tabElement && scrollContainerRef.current) {
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 50);
  };

  const onClickTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const navItem = navItems.find(item => item.id === tab.id);
    if (navItem) {
      onNavigate(navItem);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onCloseTab(tabId);
  };

  return (
    <div className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-2">
      {/* 标签页列表容器 - 带渐变遮罩和箭头 */}
      <div className="relative flex-1 h-full overflow-hidden flex items-center">
        {/* 左箭头按钮 */}
        {showLeftGradient && (
          <button
            onClick={() => scrollToDirection('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-gradient-to-r from-white/95 dark:from-gray-800/95 to-transparent hover:from-white dark:hover:from-gray-800 transition-all group"
            title="向左滚动"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
          </button>
        )}
        
        {/* 滚动容器 */}
        <div 
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="flex items-center gap-2 h-full overflow-x-auto overflow-y-hidden scrollbar-hide py-2 cursor-grab active:cursor-grabbing select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isLoading = loadingTabId === tab.id;
            const navItem = navItems.find(item => item.id === tab.id);
            const Icon = navItem?.icon;

            const baseBtn =
              "relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium group overflow-hidden flex-shrink-0 max-w-[200px]";
            const activeStyles = isActive 
              ? "bg-blue-600 text-white shadow-md scale-[1.02]"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]";

            return (
              <div key={tab.id} className="relative group/tab">
                <button
                  data-tab-id={tab.id}
                  onClick={() => onClickTab(tab.id)}
                  disabled={isLoading}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={cn(
                    baseBtn,
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                    activeStyles,
                    isLoading && "opacity-75 cursor-wait"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-sm" />
                  )}

                  <span className={cn(isActive ? "scale-110" : "group-hover:scale-110")}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : Icon ? (
                      <Icon className="w-4 h-4" />
                    ) : null}
                  </span>

                  <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{tab.title}</span>

                  {isActive && !isLoading && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}

                  {/* 根据配置决定是否显示关闭按钮 */}
                  {navItem?.closable && (
                    <X
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className={cn(
                        "w-3 h-3 transition-all duration-200 hover:text-red-400",
                        isActive ? "" : "opacity-60 group-hover:opacity-100 group-hover:scale-110"
                      )}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* 右箭头按钮 */}
        {showRightGradient && (
          <button
            onClick={() => scrollToDirection('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-gradient-to-l from-white/95 dark:from-gray-800/95 to-transparent hover:from-white dark:hover:from-gray-800 transition-all group"
            title="向右滚动"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
          </button>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
