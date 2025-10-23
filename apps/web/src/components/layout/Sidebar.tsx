'use client';

import React from 'react';
import {
  Home,
  Library,
  Settings,
  Loader2,
  CheckSquare
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTabStore } from '@/stores/useTabStore';
import type { TabType } from '@/stores/useTabStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  const {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    loadingTabId,
    setLoading
  } = useTabStore();

  // 监听路径变化，自动清除 loading 状态
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
    explicitPath?: string
  ) => {
    // 如果是清单功能，显示即将推出提示
    if (id === 'checklist') {
      // 暂不导航，仅显示提示
      return;
    }

    const existingTab = tabs.find(t => t.id === id);

    // 显式路径优先；否则按类型推导
    const path =
      explicitPath
      ?? (type === 'dashboard'
        ? '/'
        : (type === 'paper'
          ? `/paper/${id}`
          : `/${String(type)}`));

    // 已在当前路径：只需要激活 tab
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

    // 设置加载状态
    setLoading(true, id);
    
    try {
      // 正常导航
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
    children
  }: {
    id: 'dashboard' | 'library' | 'settings' | string;
    type: 'dashboard' | 'library' | 'settings';
    label: string;
    icon: any;
    activeColor?: 'blue' | 'indigo' | 'cyan' | 'slate';
    children?: React.ReactNode;
  }) => {
    const isActive = activeTabId === id;
    const isLoading = loadingTabId === id;

    // 基于主题色的配色方案
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
      }
    };

    const colors = colorMap[activeColor];

    return (
      <button
        onClick={() => handleNavClick(id, type, label)}
        disabled={isLoading}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium group overflow-hidden",
          "focus:outline-none focus-visible:outline-none focus:ring-0",
          isActive
            ? `bg-linear-to-r ${colors.gradient} text-white shadow-lg ${colors.shadow} scale-[1.02]`
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md hover:scale-[1.02]",
          isLoading && "opacity-75 cursor-wait"
        )}
      >
        {/* Active 指示器 */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg" />
        )}

        {/* Loading 或 Icon */}
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className={cn(
            "w-5 h-5 transition-all duration-300",
            isActive ? "scale-110" : "group-hover:scale-110",
            id === 'settings' && isActive && "rotate-90"
          )} />
        )}

        <span className="flex-1 text-left">{label}</span>

        {children}

        {isActive && !isLoading && (
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
          <NavButton
            id="dashboard"
            type="dashboard"
            label="首页"
            icon={Home}
            activeColor="blue"
          />

          <NavButton
            id="library"
            type="library"
            label="论文库"
            icon={Library}
            activeColor="indigo"
          />

          <NavButton
            id="checklist"
            type="library"
            label="清单管理"
            icon={CheckSquare}
            activeColor="cyan"
          >
            <span className="text-xs text-gray-400 ml-auto">即将推出</span>
          </NavButton>
        </div>

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </div>

        {/* 用户信息 */}
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

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </div>

        {/* 设置 - 固定在底部 */}
        <div className="space-y-1.5">
          <NavButton
            id="settings"
            type="settings"
            label="设置"
            icon={Settings}
            activeColor="slate"
          />
        </div>
      </nav>
    </div>
  );
}