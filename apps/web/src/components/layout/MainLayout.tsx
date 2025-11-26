// apps/web/src/components/layout/MainLayout.tsx
'use client';

import React, { useCallback, useEffect, Suspense, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BookOpen, Library, Settings, CheckSquare, Users } from 'lucide-react';

import { useAuthStore } from '@/store/auth';
import { useTabStore } from '@/store/ui/tabStore';
import { NavItem } from '@/types/navigation';
import { useTabNavigation } from '@/hooks/useTabNavigation';

import TabBar from './TabBar';
import Sidebar from './Sidebar';

/** 将 pathname 与 search params 拼成完整 href，便于比较 */
function useCurrentHref(
  pathname: string | null,
  searchParams: ReturnType<typeof useSearchParams>,
) {
  return useMemo(() => {
    const base = pathname ?? '';
    const query = searchParams?.toString();
    return query ? `${base}?${query}` : base;
  }, [pathname, searchParams]);
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentHref = useCurrentHref(pathname, searchParams);

  const { user, isAdmin, isAuthenticated } = useAuthStore();
  const { tabs, activeTabId, addTab, setActiveTab, removeTab } = useTabStore();
  
  // 使用优化的标签页导航 Hook
  const {
    navigateToTab,
    preloadTabContent,
    getCachedTabContent,
    clearTabCache,
    isNavigating
  } = useTabNavigation({
    onNavigationStart: (tabId) => {
      console.log(`Starting navigation to tab: ${tabId}`);
    },
    onNavigationEnd: (tabId) => {
      console.log(`Navigation completed to tab: ${tabId}`);
    },
    onError: (error, tabId) => {
      console.error(`Navigation error for tab ${tabId}:`, error);
    }
  });

  // 导航配置
  const navigationConfig: NavItem[] = useMemo(() => [
    {
      id: 'public-library',
      type: 'public-library',
      label: '论文库',
      icon: BookOpen,
      path: '/library?section=public',
      requiresAuth: false,
      activeColor: 'blue',
      badge: (currentUser, adminFlag) => (adminFlag ? '管理' : undefined),
      closable: false,
      showInSidebar: true,
      isPermanentTab: true,
    },
    {
      id: 'library',
      type: 'library',
      label: '我的论文库',
      icon: Library,
      path: '/library?section=personal',
      requiresAuth: true,
      activeColor: 'indigo',
      closable: true,
      showInSidebar: true,
      isPermanentTab: false,
    },
    {
      id: 'checklist',
      type: 'library',
      label: '清单管理',
      icon: CheckSquare,
      path: '/checklist',
      requiresAuth: true,
      activeColor: 'cyan',
      closable: true,
      showInSidebar: true,
      isPermanentTab: false,
      disabled: true,
    },
    {
      id: 'users',
      type: 'users',
      label: '用户管理',
      icon: Users,
      path: '/users',
      requiresAuth: true,
      activeColor: 'purple',
      closable: true,
      showInSidebar: isAdmin(), // 只有管理员可见
      isPermanentTab: false,
    },
    {
      id: 'settings',
      type: 'settings',
      label: '设置',
      icon: Settings,
      path: '/settings',
      requiresAuth: true,
      activeColor: 'slate',
      closable: true,
      showInSidebar: true,
      isPermanentTab: false,
    },
  ], [isAdmin]);

  // 可见的导航项
  const visibleNavItems = useMemo(() => {
    return navigationConfig.filter(item => {
      if (!isAuthenticated && item.requiresAuth) return false;
      
      // 用户管理页面只有管理员可见
      if (item.id === 'users' && !isAdmin) return false;
      
      return true;
    });
  }, [isAuthenticated, isAdmin, navigationConfig]);

  // 优化的导航处理函数
  const handleNavigate = useCallback(
    async (item: NavItem) => {
      if (item.requiresAuth && !isAuthenticated) {
        router.push('/login');
        return;
      }
      if (item.disabled) return;

      const targetHref = item.path ?? '/';
      const existingTab = tabs.find(t => t.id === item.id);

      // 如果标签页不存在，添加它
      if (!existingTab) {
        addTab({ 
          id: item.id, 
          type: item.type, 
          title: item.label, 
          path: targetHref,
          data: { preloaded: false }
        });
      }

      // 使用优化的导航函数
      await navigateToTab(item.id, targetHref);
    },
    [
      isAuthenticated,
      tabs,
      router,
      addTab,
      navigateToTab,
    ],
  );

  // 优化的关闭标签页函数
  const handleCloseTab = useCallback(
    async (tabId: string) => {
      const tabConfig = navigationConfig.find(item => item.id === tabId);
      if (tabConfig && !tabConfig.closable) return;

      const tabToClose = tabs.find(t => t.id === tabId);
      if (!tabToClose) return;

      // 清理缓存
      clearTabCache(tabId);

      if (tabId === activeTabId) {
        const visibleTabs = tabs.filter(tab => {
          const config = navigationConfig.find(item => item.id === tab.id);
          if (!isAuthenticated && config?.requiresAuth) return false;
          return true;
        });

        const currentIndex = visibleTabs.findIndex(t => t.id === tabId);
        let targetTab: (typeof visibleTabs)[number] | null = null;

        if (currentIndex > 0) {
          targetTab = visibleTabs[currentIndex - 1];
        } else if (visibleTabs.length > 1) {
          targetTab = visibleTabs[currentIndex + 1];
        }

        if (targetTab) {
          const targetHref = targetTab.path;
          
          // 使用优化的导航函数切换到目标标签页
          await navigateToTab(targetTab.id, targetHref);
        }
      }

      removeTab(tabId);
    },
    [
      navigationConfig,
      tabs,
      activeTabId,
      isAuthenticated,
      navigateToTab,
      clearTabCache,
      removeTab,
    ],
  );

  // 处理论文路径的特殊逻辑
  useEffect(() => {
    const isPaperPath = /^\/(paper|papers)\//.test(pathname || '');
    if (!isPaperPath) return;

    const hasPaperTab = tabs.some(t => t.type === 'paper' && t.path === pathname);

    const isPristine =
      tabs.length === 1 &&
      tabs[0]?.id === 'public-library' &&
      activeTabId === 'public-library';

    if (!hasPaperTab && isPristine) {
      navigateToTab('public-library', '/library?section=public');
    }
  }, [pathname, tabs, activeTabId, navigateToTab]);

  // 预加载常用标签页
  useEffect(() => {
    // 延迟预加载，避免影响初始页面加载
    const timer = setTimeout(() => {
      // 预加载公共库和个人库
      if (isAuthenticated) {
        preloadTabContent('library', '/library?section=personal');
      }
      preloadTabContent('public-library', '/library?section=public');
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, preloadTabContent]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-[#edf1f8] via-white to-[#e0e7f5] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_15%_25%,rgba(40,65,138,0.16),transparent),radial-gradient(45%_60%_at_85%_30%,rgba(247,194,66,0.12),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[-20%] h-[36%] blur-3xl bg-[linear-gradient(120deg,rgba(40,65,138,0.12),rgba(247,194,66,0.12),rgba(89,147,205,0.12))]" />

        <div className="relative z-10 flex h-screen max-h-screen items-stretch gap-4 px-5 py-4">
          <Sidebar
            navItems={visibleNavItems}
            activeTabId={activeTabId}
            loadingTabId={isNavigating ? activeTabId : null}
            onNavigate={handleNavigate}
            user={user}
            isAdmin={isAdmin()}
            isAuthenticated={isAuthenticated}
          />

          <div
            className="flex-1 flex flex-col min-w-0 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-2xl shadow-[0_16px_52px_rgba(15,23,42,0.15)] overflow-hidden transition-all duration-300 ease-in-out"
            data-glow="true"
          >
            <TabBar
              navItems={navigationConfig}
              onNavigate={handleNavigate}
              onCloseTab={handleCloseTab}
              isAuthenticated={isAuthenticated}
            />

           <main className="flex-1 min-h-0 bg-white/78 backdrop-blur-xl overflow-y-auto relative">

              {children}
            </main>
          </div>
        </div>
      </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  );
}
