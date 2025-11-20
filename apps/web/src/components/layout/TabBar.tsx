'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

const glowMap = {
  blue: 'shadow-[0_0_14px_rgba(40,65,138,0.35)]',
  indigo: 'shadow-[0_0_14px_rgba(44,83,166,0.32)]',
  cyan: 'shadow-[0_0_14px_rgba(98,170,214,0.34)]',
  slate: 'shadow-[0_0_14px_rgba(108,128,155,0.28)]',
  purple: 'shadow-[0_0_14px_rgba(40,65,138,0.32)]',
};

const gradientMap = {
  blue: 'from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92',
  indigo: 'from-[#3050A5]/90 via-[#28418A]/88 to-[#1F3469]/90',
  cyan: 'from-[#66A9D6]/90 via-[#4E88C2]/86 to-[#2D5E97]/90',
  slate: 'from-[#667696]/92 via-[#5A6783]/90 to-[#4A566E]/90',
  purple: 'from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92',
};

type Badge = { label: string; variant: 'public' | 'personal' };

function TabBarContent({
  navItems,
  onNavigate,
  onCloseTab: _onCloseTab,
  isAuthenticated,
}: TabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tabs, activeTabId, loadingTabId, setLoading, setActiveTab, removeTab } = useTabStore();

  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
<<<<<<< HEAD
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
=======
>>>>>>> origin/main

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const visibleTabs = React.useMemo(() => {
    if (isAuthenticated) return tabs;
    return tabs.filter(tab => {
      const config = navItems.find(item => item.id === tab.id);
      return !config?.requiresAuth;
    });
  }, [tabs, navItems, isAuthenticated]);

  const currentHref = React.useMemo(() => {
    const base = pathname ?? '';
    const query = searchParams?.toString();
    return query ? `${base}?${query}` : base;
  }, [pathname, searchParams]);

  useEffect(() => {
    const tabBar = tabBarRef.current;
    if (!tabBar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const glowElements = tabBar.querySelectorAll<HTMLElement>('[data-glow="true"]');

      glowElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        element.style.setProperty('--cursor-x', `${x}px`);
        element.style.setProperty('--cursor-y', `${y}px`);
      });
    };

    tabBar.addEventListener('mousemove', handleMouseMove);
    return () => tabBar.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!activeTabId) return;
    const timer = window.setTimeout(() => scrollToTab(activeTabId), 50);
    return () => window.clearTimeout(timer);
  }, [activeTabId]);

  useEffect(() => {
    if (!loadingTabId) return;
    const targetTab = tabs.find(tab => tab.id === loadingTabId);
    if (!targetTab) return;

    if (currentHref === targetTab.path) {
      const timer = window.setTimeout(() => setLoading(false, null), 160);
      return () => window.clearTimeout(timer);
    }
  }, [loadingTabId, tabs, currentHref, setLoading]);

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

<<<<<<< HEAD
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(event.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = '';
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
      scrollContainerRef.current.style.cursor = '';
    }
  }, [isDragging]);
=======
>>>>>>> origin/main

  const scrollToDirection = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 220;
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

  const closeTab = useCallback(
    async (tabId: string) => {
      if (tabId === 'public-library') return;

      const tabToClose = tabs.find(tab => tab.id === tabId);
      if (!tabToClose) return;

      // 保存当前滚动位置
      const mainElement = document.querySelector('main');
      const currentScrollY = window.scrollY;
      const currentMainScrollTop = mainElement ? mainElement.scrollTop : 0;
      
      // 如果是关闭当前活动标签页，需要切换到其他标签页
      if (tabId === activeTabId) {
        const currentIndex = visibleTabs.findIndex(tab => tab.id === tabId);
        let targetTab: (typeof visibleTabs)[number] | null = null;

        if (currentIndex > 0) {
          targetTab = visibleTabs[currentIndex - 1];
        } else if (visibleTabs.length > 1) {
          targetTab = visibleTabs[currentIndex + 1];
        }

        if (targetTab) {
          const targetHref = targetTab.path;
          const [targetPathname] = targetHref.split('?');

          setActiveTab(targetTab.id);

          if (currentHref === targetHref) {
            setLoading(false, null);
          } else {
            setLoading(true, targetTab.id);
            try {
              await router.push(targetHref);
              
              // 延迟恢复滚动位置，等待 DOM 完全更新
              setTimeout(() => {
                // 等待下一个事件循环，确保布局稳定
                const restoreScroll = () => {
                  const updatedMainElement = document.querySelector('main');
                  if (currentMainScrollTop > 0 && updatedMainElement) {
                    updatedMainElement.scrollTop = currentMainScrollTop;
                  } else {
                    window.scrollTo(0, currentScrollY);
                  }
                };
                
                // 使用 requestAnimationFrame 确保 DOM 更新完成
                requestAnimationFrame(() => {
                  requestAnimationFrame(restoreScroll);
                });
              }, 150);
            } catch (error) {
              // 静默处理导航错误
              setLoading(false, null);
            }
          }
        }
      }

      removeTab(tabId);
    },
    [
      activeTabId,
      currentHref,
      pathname,
      removeTab,
      router,
      setActiveTab,
      setLoading,
      tabs,
      visibleTabs,
    ],
  );

  const onClickTab = (tabId: string) => {
    const tab = tabs.find(item => item.id === tabId);
    if (!tab) return;

<<<<<<< HEAD
=======
    // 如果点击的是当前活动标签页，不做任何操作
    if (tabId === activeTabId && currentHref === tab.path) {
      return;
    }

>>>>>>> origin/main
    const navItem = navItems.find(item => item.id === tabId);
    if (navItem) {
      onNavigate(navItem);
      return;
    }

    setActiveTab(tabId);
    setLoading(true, tabId);

    try {
      router.push(tab.path);
    } catch (error) {
      // 静默处理导航错误
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

  const handleCloseTabClick = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation();
    void closeTab(tabId);
  };

  const isTabClosable = (tabId: string) => tabId !== 'public-library';

  const resolveTabBadge = (tab: typeof tabs[number]): Badge | null => {
    const navItem = navItems.find(item => item.id === tab.id);
    const source =
      typeof (tab.data as { source?: unknown })?.source === 'string'
        ? ((tab.data as { source?: string }).source ?? '').toLowerCase()
        : undefined;

    const fromRoute = (pattern: RegExp) => pattern.test(tab.path ?? '');
    const isPublic =
      navItem?.id === 'public-library' ||
      source?.startsWith('public') ||
      fromRoute(/section=public/i) ||
      fromRoute(/source=public/i) ||
      fromRoute(/\/public(-library)?\b/i);
    const isPersonal =
      navItem?.id === 'library' ||
      source?.startsWith('personal') ||
      fromRoute(/section=personal/i) ||
      fromRoute(/source=personal/i) ||
      fromRoute(/\/personal(-library)?\b/i);

    if (isPublic) return { label: '公共', variant: 'public' };
    if (isPersonal) return { label: '个人', variant: 'personal' };

    if (tab.type === 'paper') {
      return source?.startsWith('public')
        ? { label: '公共', variant: 'public' }
        : { label: '个人', variant: 'personal' };
    }

    return null;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={tabBarRef}
        className="h-14 flex items-center px-4 border-b border-white/60 bg-white/72 backdrop-blur-3xl gap-2 shadow-[0_20px_54px_rgba(15,23,42,0.16)] rounded-t-2xl"
        data-glow="true"
      >
        <div className="relative flex-1 h-full overflow-hidden flex items-center">
          {showLeftGradient && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => scrollToDirection('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-linear-to-r from-white/85 via-white/80 to-transparent hover:from-white/95 rounded-lg shadow-[0_8px_22px_rgba(40,65,138,0.14)] transition-all backdrop-blur-2xl border border-white/65"
                  data-glow="true"
                >
                  <ChevronLeft className="w-4 h-4 text-[#28418A]" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="tooltip-bubble border border-white/65 bg-white/85 backdrop-blur-2xl text-[#28418A] shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
              >
                <p className="text-xs font-medium">向左滚动</p>
              </TooltipContent>
            </Tooltip>
          )}

          <div
            ref={scrollContainerRef}
<<<<<<< HEAD
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="flex items-center gap-2 h-full overflow-x-auto overflow-y-hidden scrollbar-hide py-2 select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
=======
            className="flex items-center gap-2 h-full overflow-x-auto overflow-y-hidden scrollbar-hide py-2 select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
>>>>>>> origin/main
          >
            {visibleTabs.map(tab => {
              const isActive = tab.id === activeTabId;
              const isLoading = loadingTabId === tab.id;
              const navItem = navItems.find(item => item.id === tab.id);
              const Icon = navItem?.icon;
              const canClose = isTabClosable(tab.id);
              const colorKey = (navItem?.activeColor as keyof typeof glowMap) ?? 'blue';
              const glow = glowMap[colorKey] ?? glowMap.blue;
              const gradient = gradientMap[colorKey] ?? gradientMap.blue;
              const badge = resolveTabBadge(tab);
              const displayTitle =
                tab.type === 'paper' && badge ? `${badge.label} · ${tab.title}` : tab.title;

              const baseBtn =
                'relative inline-flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-xl text-sm font-medium group overflow-hidden shrink-0 w-[240px] transition-all duration-250 border border-white/45 backdrop-blur-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4769b8]/45 focus-visible:ring-offset-[1.5px] focus-visible:ring-offset-white';
              const activeStyles = isActive
                ? `bg-gradient-to-r ${gradient} text-white shadow-md ${glow} scale-[1.01]`
                : 'text-slate-700 bg-white/55 hover:bg-white/78 hover:text-slate-900 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)]';

              return (
                <div key={tab.id} className="relative group/tab">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        role="button"
                        tabIndex={isLoading ? -1 : 0}
                        aria-disabled={isLoading}
                        data-tab-id={tab.id}
                        data-glow="true"
                        onClick={() => onClickTab(tab.id)}
                        onKeyDown={event => handleTabKeyDown(event, tab.id, isLoading)}
                        onMouseDown={event => {
                          event.stopPropagation();
                          if (isLoading) event.preventDefault();
                        }}
                        className={cn(baseBtn, activeStyles, isLoading && 'opacity-80 cursor-wait')}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-white shadow-[0_0_9px_rgba(255,255,255,0.58)]" />
                        )}

                        {badge && (
                          <span
                            className={cn(
                              'inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full border backdrop-blur-sm transition-colors duration-200',
                              badge.variant === 'public'
                                ? 'bg-[#E8EEF9] text-[#28418A] border-[#d1d9ed]'
                                : 'bg-[#F7C242]/80 text-[#7A4E00] border-[#f3d586]',
                              isActive && 'bg-white/38 text-white border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.48)]',
                            )}
                          >
                            {badge.label}
                          </span>
                        )}

                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : Icon ? (
                          <Icon
                            className={cn(
                              'w-4.5 h-4.5 transition-all duration-300',
                              isActive
                                ? 'text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.16)] scale-110'
                                : 'text-[#28418A] group-hover:scale-110',
                            )}
                          />
                        ) : null}

                        <span className="min-w-0 flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                          {displayTitle}
                        </span>

                        {canClose && (
                          <button
                            type="button"
                            onClick={event => handleCloseTabClick(event, tab.id)}
                            className={cn(
                              'w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 border backdrop-blur-sm cursor-pointer',
                              isActive
                                ? 'bg-white/34 text-white hover:bg-white/48 hover:text-white border-white/50'
                                : 'bg-white/48 hover:bg-white/70 hover:text-slate-600 text-slate-400 border-white/40 opacity-0 group-hover/tab:opacity-100',
                            )}
                            data-glow="true"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isActive && !isLoading && (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.72)]" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={6}
                      className="rounded-xl border border-white/60 bg-white/95 px-3 py-2 text-sm font-medium text-[#28418A] shadow-[0_10px_22px_rgba(40,65,138,0.16)] backdrop-blur-xl"
                    >
                      <p className="leading-tight">{displayTitle}</p>
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
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center bg-linear-to-l from-white/85 via-white/80 to-transparent hover:from-white/95 rounded-lg shadow-[0_8px_22px_rgba(40,65,138,0.14)] transition-all backdrop-blur-2xl border border-white/65"
                  data-glow="true"
                >
                  <ChevronRight className="w-4 h-4 text-[#28418A]" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="tooltip-bubble border border-white/65 bg-white/85 backdrop-blur-2xl text-[#28418A] shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
              >
                <p className="text-xs font-medium">向右滚动</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .tooltip-bubble {
            position: relative;
            border-radius: 0.75rem;
            padding: 0.5rem 0.75rem;
          }
          .tooltip-bubble::after {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            background: inherit;
            border-left: inherit;
            border-top: inherit;
            transform: rotate(45deg);
            filter: drop-shadow(0 6px 12px rgba(40, 65, 138, 0.12));
          }
          .tooltip-bubble[data-side='bottom']::after {
            top: -6px;
            left: calc(50% - 6px);
          }
          .tooltip-bubble[data-side='top']::after {
            bottom: -6px;
            left: calc(50% - 6px);
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}

export default function TabBar(props: TabBarProps) {
  return (
    <Suspense fallback={<div className="h-14 flex items-center justify-center">加载中...</div>}>
      <TabBarContent {...props} />
    </Suspense>
  );
}
