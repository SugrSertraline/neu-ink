'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTabStore } from '@/stores/useTabStore';
import { NavItem } from '@/types/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TabBarProps {
  navItems: NavItem[];
  onNavigate: (item: NavItem) => void;
  onCloseTab: (tabId: string) => void;
  isAuthenticated: boolean;
}

export default function TabBar({
  navItems,
  onNavigate,
  onCloseTab,
  isAuthenticated,
}: TabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { tabs, activeTabId, loadingTabId, setLoading, setActiveTab } = useTabStore();

  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const visibleTabs = React.useMemo(() => {
    if (isAuthenticated) return tabs;
    return tabs.filter((tab) => {
      const config = navItems.find((item) => item.id === tab.id);
      return !config?.requiresAuth;
    });
  }, [tabs, navItems, isAuthenticated]);

  useEffect(() => {
    if (activeTabId) {
      const timeoutId = window.setTimeout(() => scrollToTab(activeTabId), 50);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeTabId]);

  useEffect(() => {
    if (!loadingTabId) return;

    const targetTab = tabs.find((tab) => tab.id === loadingTabId);
    if (!targetTab) return;

    if (pathname === targetTab.path) {
      const timer = window.setTimeout(() => {
        setLoading(false, null);
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [loadingTabId, tabs, pathname, setLoading]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > 0 || event.shiftKey) return;
      if (Math.abs(event.deltaY) === 0) return;

      event.preventDefault();
      container.scrollLeft += event.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft: currentLeft, scrollWidth, clientWidth } = container;
      setShowLeftGradient(currentLeft > 10);
      setShowRightGradient(currentLeft < scrollWidth - clientWidth - 10);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [visibleTabs]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(event.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging || !scrollContainerRef.current) return;
      event.preventDefault();
      const x = event.pageX - scrollContainerRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft],
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
    }
  }, [isDragging]);

  const scrollToDirection = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    const delta = direction === 'left' ? -scrollAmount : scrollAmount;
    scrollContainerRef.current.scrollTo({
      left: scrollContainerRef.current.scrollLeft + delta,
      behavior: 'smooth',
    });
  };

  const scrollToTab = (tabId: string) => {
    const element = document.querySelector<HTMLElement>(`[data-tab-id="${tabId}"]`);
    if (!element || !scrollContainerRef.current) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  const onClickTab = (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;

    const navItem = navItems.find((item) => item.id === tabId);
    if (navItem) {
      onNavigate(navItem);
      return;
    }

    setActiveTab(tabId);
    setLoading(true, tabId);

    try {
      router.push(tab.path);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false, null);
    }
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    tabId: string,
    disabled: boolean,
  ) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClickTab(tabId);
    }
  };

  const handleCloseTab = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    onCloseTab(tabId);
  };

  const isTabClosable = (tabId: string) => {
    if (visibleTabs.length <= 1) return false;
    const navItem = navItems.find((item) => item.id === tabId);
    if (navItem?.closable === false) return false;
    return true;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-12 flex items-center px-4 border-b border-neutral-200/60 dark:border-neutral-700/60 bg-linear-to-r from-neutral-50/95 via-white/95 to-neutral-100/90 dark:from-neutral-900/85 dark:via-neutral-900/80 dark:to-neutral-850/80 backdrop-blur-lg gap-2 shadow-sm">
        <div className="relative flex-1 h-full overflow-hidden flex items-center">
          {showLeftGradient && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => scrollToDirection('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-linear-to-r from-white/95 via-white/90 dark:from-neutral-900/95 dark:via-neutral-900/90 to-transparent hover:from-white dark:hover:from-neutral-800 transition-all group rounded-lg shadow-md"
                >
                  <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">向左滚动</p>
              </TooltipContent>
            </Tooltip>
          )}

          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="flex items-center gap-2 h-full overflow-x-auto overflow-y-hidden scrollbar-hide py-2 cursor-grab active:cursor-grabbing select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visibleTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isLoading = loadingTabId === tab.id;
              const navItem = navItems.find((item) => item.id === tab.id);
              const Icon = navItem?.icon;
              const canClose = isTabClosable(tab.id);

              const baseBtn =
                'relative inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-sm font-medium group overflow-hidden shrink-0 max-w-[220px] backdrop-blur-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900';
              const activeStyles = isActive
                ? 'bg-neutral-900/85 text-white border-neutral-700 shadow-[0_12px_28px_-14px_rgba(15,15,15,0.65)]'
                : 'text-neutral-700 dark:text-neutral-200 bg-white/75 dark:bg-neutral-800/70 hover:bg-neutral-100/80 dark:hover:bg-neutral-700 border-neutral-200/70 dark:border-neutral-600/40';

              return (
                <div key={tab.id} className="relative group/tab">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role="button"
                        tabIndex={isLoading ? -1 : 0}
                        aria-disabled={isLoading}
                        data-tab-id={tab.id}
                        onClick={() => onClickTab(tab.id)}
                        onKeyDown={(event) => handleTabKeyDown(event, tab.id, isLoading)}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          if (isLoading) event.preventDefault();
                        }}
                        className={cn(baseBtn, activeStyles, isLoading && 'opacity-70 cursor-wait')}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-current" />
                        ) : Icon ? (
                          <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-current')} />
                        ) : null}

                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                          {tab.title}
                        </span>

                        {canClose && (
                          <button
                            type="button"
                            onClick={(event) => handleCloseTab(event, tab.id)}
                            className={cn(
                              'w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-200',
                              isActive
                                ? 'text-white/80 hover:text-white hover:bg-white/10'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/70 opacity-0 group-hover/tab:opacity-100',
                            )}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-sm">{tab.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>

          {showRightGradient && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => scrollToDirection('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-linear-to-l from-white/95 via-white/90 dark:from-neutral-900/95 dark:via-neutral-900/90 to-transparent hover:from-white dark:hover:from-neutral-800 transition-all group rounded-lg shadow-md"
                >
                  <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-800 dark:group-hover:text-neutral-100 transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">向右滚动</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
