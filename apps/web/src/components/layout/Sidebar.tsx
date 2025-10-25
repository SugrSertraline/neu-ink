'use client';

import React from 'react';
import {
  Home,
  Library,
  Settings,
  Loader2,
  CheckSquare,
  BookOpen
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTabStore } from '@/stores/useTabStore';
import type { TabType } from '@/stores/useTabStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, isAuthenticated } = useAuth();

  const {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    loadingTabId,
    setLoading
  } = useTabStore();

  React.useEffect(() => {
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

  const handleNavClick = async (
    id: string,
    type: TabType,
    label: string,
    requiresAuth: boolean = false, // ✅ 新增参数：是否需要登录
    explicitPath?: string
  ) => {
    // ✅ 检查是否需要登录
    if (requiresAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id === 'checklist') {
      return;
    }

    const existingTab = tabs.find(t => t.id === id);

    const routeMap: Record<string, string> = {
      'public-library': '/',
      'library': '/library',
      'settings': '/settings'
    };

    const path = routeMap[id] ?? explicitPath ?? (
      type === 'dashboard'
        ? '/'
        : (type === 'paper' ? `/paper/${id}` : `/${String(type)}`)
    );

    if (pathname === path) {
      if (existingTab) {
        setActiveTab(id);
      } else {
        addTab({ id, type, title: label, path });
        setActiveTab(id);
      }
      setLoading(false, null);
      return;
    }

    setLoading(true, id);
    
    try {
      if (existingTab) {
        setActiveTab(id);
      } else {
        addTab({ id, type, title: label, path });
        setActiveTab(id);
      }

      await router.push(path);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false, null);
    }
  };

  const NavButton = ({
    id,
    type,
    label,
    icon: Icon,
    activeColor = 'blue',
    badge,
    requiresAuth = false, // ✅ 新增属性
    children
  }: {
    id: string;
    type: TabType;
    label: string;
    icon: any;
    activeColor?: 'blue' | 'indigo' | 'cyan' | 'slate' | 'purple';
    badge?: string;
    requiresAuth?: boolean; // ✅ 新增属性
    children?: React.ReactNode;
  }) => {
    const isActive = activeTabId === id;
    const isLoading = loadingTabId === id;
    const isDisabled = requiresAuth && !isAuthenticated; // ✅ 判断是否禁用

    const colorMap = {
      blue: {
        gradient: 'from-blue-600 to-blue-700',
        shadow: 'shadow-blue-500/20'
      },
      indigo: {
        gradient: 'from-indigo-600 to-indigo-700',
        shadow: 'shadow-indigo-500/20'
      },
      cyan: {
        gradient: 'from-cyan-600 to-cyan-700',
        shadow: 'shadow-cyan-600/20'
      },
      slate: {
        gradient: 'from-slate-600 to-slate-700',
        shadow: 'shadow-slate-500/20'
      },
      purple: {
        gradient: 'from-purple-600 to-purple-700',
        shadow: 'shadow-purple-500/20'
      }
    };

    const colors = colorMap[activeColor];

    return (
      <button
        onClick={() => handleNavClick(id, type, label, requiresAuth)}
        disabled={isLoading}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium group overflow-hidden",
          "focus:outline-none focus-visible:outline-none focus:ring-0",
          isActive && !isDisabled
            ? `bg-linear-to-r ${colors.gradient} text-white shadow-lg ${colors.shadow} scale-[1.02]`
            : isDisabled
            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md hover:scale-[1.02]",
          isLoading && "opacity-75 cursor-wait"
        )}
      >
        {isActive && !isDisabled && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg" />
        )}

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className={cn(
            "w-5 h-5 transition-all duration-300",
            isActive && !isDisabled ? "scale-110" : "group-hover:scale-110",
            id === 'settings' && isActive && "rotate-90"
          )} />
        )}

        <span className="flex-1 text-left">{label}</span>

        {/* ✅ 未登录时显示锁定图标 */}
        {isDisabled && (
          <span className="text-xs text-gray-400 dark:text-gray-600">
            需登录
          </span>
        )}

        {badge && !isDisabled && (
          <span className={cn(
            "px-2 py-0.5 text-xs rounded-full",
            isActive 
              ? "bg-white/20 text-white" 
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          )}>
            {badge}
          </span>
        )}

        {children}

        {isActive && !isLoading && !isDisabled && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
      </button>
    );
  };

  return (
    <div className="w-64 h-full bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      {/* Logo区域 */}
      <div className="h-16 flex items-center px-5 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm select-none">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="font-bold text-xl text-blue-600">
            NeuInk
          </span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto flex flex-col">
        {/* 主要功能区 */}
        <div className="space-y-1.5">
          {/* ✅ 公共论文库 - 所有用户都可以访问 */}
          <NavButton
            id="public-library"
            type="public-library"
            label="论文库"
            icon={BookOpen}
            activeColor="purple"
            badge={isAdmin ? "管理" : undefined}
            requiresAuth={false} // 不需要登录
          />

          {/* ✅ 个人论文库 - 需要登录 */}
          <NavButton
            id="library"
            type="library"
            label="我的论文库"
            icon={Library}
            activeColor="indigo"
            requiresAuth={true} // 需要登录
          />

          {/* ✅ 清单管理 - 需要登录 */}
          <NavButton
            id="checklist"
            type="library"
            label="清单管理"
            icon={CheckSquare}
            activeColor="cyan"
            requiresAuth={true} // 需要登录
          >
            {isAuthenticated && (
              <span className="text-xs text-gray-400 ml-auto">即将推出</span>
            )}
          </NavButton>
        </div>

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </div>

        {/* 用户信息 - 只有已登录用户显示 */}
        {isAuthenticated && (
          <div className="flex-1 space-y-1.5 min-h-0">
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {user?.nickname || user?.username}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {isAdmin ? '管理员' : '普通用户'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 未登录用户显示登录提示 */}
        {!isAuthenticated && (
          <div className="flex-1 space-y-1.5 min-h-0">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-center">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  未登录
                </div>
                <div className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                  登录后可使用更多功能
                </div>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  立即登录
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </div>

        {/* ✅ 设置 - 需要登录 */}
        <div className="space-y-1.5">
          <NavButton
            id="settings"
            type="settings"
            label="设置"
            icon={Settings}
            activeColor="slate"
            requiresAuth={true} // 需要登录
          />
        </div>
      </nav>
    </div>
  );
}