'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Home, Library, FolderTree, Settings, FileText, Loader2, Minus, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTabStore, Tab } from '@/app/store/useTabStore';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<Tab['type'], React.ReactNode> = {
  dashboard: <Home className="w-5 h-5 transition-all duration-300" />,
  library: <Library className="w-5 h-5 transition-all duration-300" />,
  checklist: <FolderTree className="w-5 h-5 transition-all duration-300" />,
  settings: <Settings className="w-5 h-5 transition-all duration-300" />,
  paper: <FileText className="w-5 h-5 transition-all duration-300" />,
};

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { tabs, activeTabId, setActiveTab, closeTab, loadingTabId, setLoading } = useTabStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  }, [tabs]);

  // 鼠标滚轮横向滚动
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // 如果已经在横向滚动，或者按住了 Shift 键
      if (Math.abs(e.deltaX) > 0 || e.shiftKey) {
        return; // 让浏览器默认处理
      }
      
      // 将纵向滚动转换为横向滚动
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
    const walk = (x - startX) * 2; // 滚动速度倍数
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
    // 使用 setTimeout 确保 DOM 已更新
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

  const onClickTab = async (tab: Tab) => {
    (document.activeElement as HTMLElement)?.blur();

    if (tab.id === activeTabId) return;
    
    const currentPath = window.location.pathname;
    if (currentPath === tab.path) {
      setActiveTab(tab.id);
      setLoading(false, null);
      return;
    }
    
    setLoading(true, tab.id);
    
    try {
      setActiveTab(tab.id);
      await router.push(tab.path);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false, null);
    }
  };

  const onCloseTab = async (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    (document.activeElement as HTMLElement)?.blur();

    if (tab.id === 'dashboard') return;
    
    if (tab.id === activeTabId) {
      const currentIndex = tabs.findIndex(t => t.id === tab.id);
      let targetTab: Tab | null = null;
      
      if (currentIndex > 0) {
        targetTab = tabs[currentIndex - 1];
      } else if (tabs.length > 1) {
        targetTab = tabs[currentIndex + 1];
      }
      
      if (targetTab) {
        if (window.location.pathname === targetTab.path) {
          setActiveTab(targetTab.id);
          setLoading(false, null);
        } else {
          setLoading(true, targetTab.id);
          try {
            setActiveTab(targetTab.id);
            await router.push(targetTab.path);
          } catch (error) {
            console.error('Navigation error:', error);
            setLoading(false, null);
          }
        }
      }
    }
    
    closeTab(tab.id);
  };


  return (
    <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm gap-2">
      {/* 标签页列表容器 - 带渐变遮罩和箭头 */}
      <div className="relative flex-1 h-full overflow-hidden flex items-center">
        {/* 左箭头按钮 */}
        {showLeftGradient && (
          <button
            onClick={() => scrollToDirection('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-10 flex items-center justify-center bg-gradient-to-r from-white/95 dark:from-slate-900/95 to-transparent hover:from-white dark:hover:from-slate-900 transition-all group"
            title="向左滚动"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
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
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isLoading = loadingTabId === tab.id;
            const baseBtn =
              "relative inline-flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-medium group overflow-hidden flex-shrink-0 max-w-[200px]";
            const activeStylesMap: Record<Tab['type'], string> = {
              dashboard: "bg-gradient-to-r from-[#284286] to-[#3a5ba8] text-white shadow-lg shadow-[#284286]/20 scale-[1.02]",
              library: "bg-gradient-to-r from-[#3d4d99] to-[#4a5fb3] text-white shadow-lg shadow-indigo-500/20 scale-[1.02]",
              checklist: "bg-gradient-to-r from-[#2d5f7a] to-[#3a7694] text-white shadow-lg shadow-cyan-600/20 scale-[1.02]",
              settings: "bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/20 scale-[1.02]",
              paper: "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]",
            };
            const inactiveStyles =
              "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:scale-[1.02]";

            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <div className="relative group/tab">
                    <button
                      data-tab-id={tab.id}
                      onClick={() => onClickTab(tab)}
                      disabled={isLoading}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={cn(
                        baseBtn,
                        "focus:outline-none focus-visible:outline-none focus:ring-0",
                        isActive ? activeStylesMap[tab.type] : inactiveStyles,
                        isLoading && "opacity-75 cursor-wait"
                      )}
                    >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg" />
                    )}

                    <span className={cn(isActive ? "scale-110" : "group-hover:scale-110")}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : iconMap[tab.type]}
                    </span>

                      <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{tab.title}</span>

                    {isActive && !isLoading && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}

                      {tab.id !== 'dashboard' && (
                        <X
                          onClick={(e) => onCloseTab(e, tab)}
                          className={cn(
                            "w-4 h-4 transition-all duration-300 hover:text-red-400",
                            isActive ? "" : "opacity-60 group-hover:opacity-100 group-hover:scale-110"
                          )}
                        />
                      )}
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200">
                  <p>{tab.title}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* 右箭头按钮 */}
        {showRightGradient && (
          <button
            onClick={() => scrollToDirection('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-10 flex items-center justify-center bg-gradient-to-l from-white/95 dark:from-slate-900/95 to-transparent hover:from-white dark:hover:from-slate-900 transition-all group"
            title="向右滚动"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
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