'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BookOpen, Library, Settings, CheckSquare } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/stores/useTabStore';
import { NavItem } from '@/types/navigation';

import TabBar from './TabBar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

/** 将 pathname 与 search params 拼成完整 href，便于比较 */
function useCurrentHref(pathname: string | null, searchParams: ReturnType<typeof useSearchParams>) {
  return React.useMemo(() => {
    const base = pathname ?? '';
    const query = searchParams?.toString();
    return query ? `${base}?${query}` : base;
  }, [pathname, searchParams]);
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentHref = useCurrentHref(pathname, searchParams);

  const { user, isAdmin, isAuthenticated } = useAuth();
  const {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    removeTab,
    loadingTabId,
    setLoading,
  } = useTabStore();

  const navigationConfig: NavItem[] = [
    {
      id: 'public-library',
      type: 'public-library',
      label: '论文库',
      icon: BookOpen,
      path: '/library?section=public',
      requiresAuth: false,
      activeColor: 'purple',
      badge: (user, isAdmin) => (isAdmin ? '管理' : undefined),
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
      closable: false,
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
      closable: false,
      showInSidebar: true,
      isPermanentTab: false,
      disabled: true,
    },
    {
      id: 'settings',
      type: 'settings',
      label: '设置',
      icon: Settings,
      path: '/settings',
      requiresAuth: true,
      activeColor: 'slate',
      closable: false,
      showInSidebar: true,
      isPermanentTab: false,
    },
  ];

  const visibleNavItems = React.useMemo(() => {
    return navigationConfig.filter(item => {
      if (!isAuthenticated && item.requiresAuth) return false;
      return true;
    });
  }, [isAuthenticated]);

  const handleNavigate = useCallback(
    async (item: NavItem) => {
      if (item.requiresAuth && !isAuthenticated) {
        router.push('/login');
        return;
      }
      if (item.disabled) return;

      const targetHref = item.path ?? '/';
      const [targetPathname] = targetHref.split('?');
      const existingTab = tabs.find(t => t.id === item.id);

      if (currentHref === targetHref) {
        if (existingTab) {
          setActiveTab(item.id);
        } else {
          addTab({
            id: item.id,
            type: item.type,
            title: item.label,
            path: targetHref,
          });
          setActiveTab(item.id);
        }
        setLoading(false, null);
        return;
      }

      setLoading(true, item.id);

      if (existingTab) {
        setActiveTab(item.id);
      } else {
        addTab({
          id: item.id,
          type: item.type,
          title: item.label,
          path: targetHref,
        });
        setActiveTab(item.id);
      }

      try {
        if (pathname === targetPathname && currentHref !== targetHref) {
          await router.push(targetHref);
        } else {
          await router.push(targetHref);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        setLoading(false, null);
      }
    },
    [
      currentHref,
      isAuthenticated,
      pathname,
      tabs,
      router,
      addTab,
      setActiveTab,
      setLoading,
    ],
  );

  const handleCloseTab = useCallback(
    async (tabId: string) => {
      const tabConfig = navigationConfig.find(item => item.id === tabId);
      if (tabConfig && !tabConfig.closable) return;

      const tabToClose = tabs.find(t => t.id === tabId);
      if (!tabToClose) return;

      if (tabId === activeTabId) {
        const visibleTabs = tabs.filter(tab => {
          const config = navigationConfig.find(item => item.id === tab.id);
          if (!isAuthenticated && config?.requiresAuth) return false;
          return true;
        });

        const currentIndex = visibleTabs.findIndex(t => t.id === tabId);
        let targetTab: typeof visibleTabs[number] | null = null;

        if (currentIndex > 0) {
          targetTab = visibleTabs[currentIndex - 1];
        } else if (visibleTabs.length > 1) {
          targetTab = visibleTabs[currentIndex + 1];
        }

        if (targetTab) {
          const targetHref = targetTab.path;
          const [targetPathname] = targetHref.split('?');

          if (currentHref === targetHref) {
            setActiveTab(targetTab.id);
            setLoading(false, null);
          } else {
            setLoading(true, targetTab.id);
            try {
              setActiveTab(targetTab.id);
              if (pathname === targetPathname && currentHref !== targetHref) {
                await router.push(targetHref);
              } else {
                await router.push(targetHref);
              }
            } catch (error) {
              console.error('Navigation error:', error);
              setLoading(false, null);
            }
          }
        }
      }

      removeTab(tabId);
    },
    [
      tabs,
      activeTabId,
      currentHref,
      pathname,
      isAuthenticated,
      router,
      setActiveTab,
      setLoading,
      removeTab,
    ],
  );

  useEffect(() => {
    const isPaperPath = /^\/(paper|papers)\//.test(pathname || '');
    if (!isPaperPath) return;

    const hasPaperTab = tabs.some(t => t.type === 'paper' && t.path === pathname);

    const isPristine =
      tabs.length === 1 &&
      tabs[0]?.id === 'public-library' &&
      activeTabId === 'public-library';

    if (!hasPaperTab && isPristine) {
      setLoading(true, 'public-library');
      router.replace('/library?section=public');
    }
  }, [pathname, tabs, activeTabId, setLoading, router]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        navItems={visibleNavItems}
        activeTabId={activeTabId}
        loadingTabId={loadingTabId}
        onNavigate={handleNavigate}
        user={user}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TabBar
          navItems={navigationConfig}
          onNavigate={handleNavigate}
          onCloseTab={handleCloseTab}
          isAuthenticated={isAuthenticated}
        />

        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
