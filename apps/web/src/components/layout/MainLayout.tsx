'use client';

import React, { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, Library, Settings, CheckSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/stores/useTabStore';
import { NavItem } from '@/types/navigation';
import TabBar from './TabBar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { tabs, activeTabId, addTab, setActiveTab, removeTab, loadingTabId, setLoading } = useTabStore();

  // ✅ 统一的导航配置
  const navigationConfig: NavItem[] = [
    {
      id: 'public-library',
      type: 'public-library',
      label: '论文库',
      icon: BookOpen,
      path: '/',
      requiresAuth: false,
      activeColor: 'purple',
      badge: (user, isAdmin) => isAdmin ? '管理' : undefined,
      closable: false,
      showInSidebar: true,
      isPermanentTab: true,
    },
    {
      id: 'library',
      type: 'library',
      label: '我的论文库',
      icon: Library,
      path: '/library',
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
      disabled: true, // 即将推出
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

  // ✅ 根据登录状态过滤可见的导航项
  const visibleNavItems = React.useMemo(() => {
    return navigationConfig.filter(item => {
      if (!isAuthenticated && item.requiresAuth) {
        return false;
      }
      return true;
    });
  }, [isAuthenticated]);

  // ✅ 统一的导航处理函数
  const handleNavigate = useCallback(async (item: NavItem) => {
    // 检查是否需要登录
    if (item.requiresAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // 检查是否禁用
    if (item.disabled) {
      return;
    }

    const existingTab = tabs.find(t => t.id === item.id);

    // 如果已经在目标路径，只需切换标签
    if (pathname === item.path) {
      if (existingTab) {
        setActiveTab(item.id);
      } else {
        addTab({ id: item.id, type: item.type, title: item.label, path: item.path });
        setActiveTab(item.id);
      }
      setLoading(false, null);
      return;
    }

    // 设置加载状态
    setLoading(true, item.id);

    try {
      // 添加或激活标签
      if (existingTab) {
        setActiveTab(item.id);
      } else {
        addTab({ id: item.id, type: item.type, title: item.label, path: item.path });
        setActiveTab(item.id);
      }

      // 导航到目标路径
      await router.push(item.path);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false, null);
    }
  }, [isAuthenticated, pathname, tabs, router, addTab, setActiveTab, setLoading]);

  // ✅ 统一的关闭标签函数
  const handleCloseTab = useCallback(async (tabId: string) => {
    // 找到要关闭的标签配置
    const tabConfig = navigationConfig.find(item => item.id === tabId);
    
    // 不可关闭的标签不处理
    if (tabConfig && !tabConfig.closable) {
      return;
    }

    // 找到要关闭的标签
    const tabToClose = tabs.find(t => t.id === tabId);
    if (!tabToClose) return;

    // 如果关闭的是当前激活的标签，需要切换到其他标签
    if (tabId === activeTabId) {
      const visibleTabs = tabs.filter(tab => {
        const config = navigationConfig.find(item => item.id === tab.id);
        if (!isAuthenticated && config?.requiresAuth) return false;
        return true;
      });

      const currentIndex = visibleTabs.findIndex(t => t.id === tabId);
      let targetTab = null;

      // 优先切换到前一个标签
      if (currentIndex > 0) {
        targetTab = visibleTabs[currentIndex - 1];
      } else if (visibleTabs.length > 1) {
        targetTab = visibleTabs[currentIndex + 1];
      }

      if (targetTab) {
        if (pathname === targetTab.path) {
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

    // 从 store 中移除标签
    removeTab(tabId);
  }, [tabs, activeTabId, pathname, isAuthenticated, router, setActiveTab, setLoading, removeTab]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <Sidebar
        navItems={visibleNavItems}
        activeTabId={activeTabId}
        loadingTabId={loadingTabId}
        onNavigate={handleNavigate}
        user={user}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
      />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab栏 */}
        <TabBar
          navItems={navigationConfig}
          onNavigate={handleNavigate}
          onCloseTab={handleCloseTab}
          isAuthenticated={isAuthenticated}
        />
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
