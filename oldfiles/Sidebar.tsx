'use client';

import React from 'react';
import {
  Home,
  Library,
  FolderTree,
  Settings,
  Loader2
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTabStore } from '@/app/store/useTabStore';
import { useChecklistStore } from '@/app/store/useChecklistStore';
import type { TabType } from '@/app/store/useTabStore';

import ChecklistTreeSidebar from './ChecklistTreeSidebar';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    loadingTabId,
    setLoading
  } = useTabStore();

  const { loadChecklists, checklists } = useChecklistStore();

  // ✅ 初始化加载清单数据
  React.useEffect(() => {
    if (checklists.length === 0) {
      loadChecklists();
    }
  }, [loadChecklists, checklists.length]);

  // ✅ 监听路径变化，自动清除 loading 状态
  React.useEffect(() => {
    if (loadingTabId) {
      const targetTab = tabs.find(t => t.id === loadingTabId);
      if (targetTab && pathname === targetTab.path) {
        // 路径已经匹配，清除 loading
        const timer = setTimeout(() => {
          setLoading(false, null);
        }, 150); // 给一点时间让页面渲染
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
    (document.activeElement as HTMLElement)?.blur();
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
      // ✅ 不再使用固定的 setTimeout，而是依赖 useEffect 监听路径变化
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
    activeColor = 'blue', // 默认蓝色
    children
  }: {
    id: 'dashboard' | 'library' | 'checklists' | 'settings' | string;
    type: 'dashboard' | 'library' | 'checklist' | 'settings';
    label: string;
    icon: any;
    activeColor?: 'blue' | 'indigo' | 'cyan' | 'slate';
    children?: React.ReactNode;
  }) => {
    const isActive = activeTabId === id;
    const isLoading = loadingTabId === id;

    // 基于主题色 #284286 的配色方案
    const colorMap = {
      blue: {
        gradient: 'from-[#284286] to-[#3a5ba8]',
        shadow: 'shadow-[#284286]/20'
      },
      indigo: {
        gradient: 'from-[#3d4d99] to-[#4a5fb3]',
        shadow: 'shadow-indigo-500/20'
      },
      cyan: {
        gradient: 'from-[#2d5f7a] to-[#3a7694]',
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
        onClick={() => handleNavClick(
          id,
          type,
          label,
          // 修正清单管理显式路径为 /checklists（避免自动推导成 /checklist）
          id === 'checklists' ? '/checklists' : undefined
        )}
        disabled={isLoading}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium group overflow-hidden",
          "focus:outline-none focus-visible:outline-none focus:ring-0",
          isActive
            ? `bg-linear-to-r ${colors.gradient} text-white shadow-lg ${colors.shadow} scale-[1.02]`
            : "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:scale-[1.02]",
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

  const isPathActive = (path: string) => pathname === path;

  return (
    <div className="w-64 h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
      {/* Logo区域 */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm select-none">
        <div className="flex items-center gap-3">
          <img
            src="/neuinl_logo.png"
            alt="NeuInk Logo"
            className="h-12 w-12 select-none"
          />
          <span className="font-['Playball'] font-bold text-xl select-none" style={{ color: '#284286' }}>
            NeuInk
          </span>
        </div>
      </div>

      {/* 导航菜单 - 包含所有内容（可滚动） */}
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
            id="checklists"
            type="checklist"
            label="清单管理"
            icon={FolderTree}
            activeColor="cyan"
          />
        </div>

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
          </div>
        </div>

        {/* 清单列表 - 始终显示，灵活增长 */}
        <div className="flex-1 space-y-1.5 min-h-0">
          <ChecklistTreeSidebar
            isOpen={true}
            onToggle={() => {}}
            handleNavClick={handleNavClick}
            activePathChecker={isPathActive}
          />
        </div>

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
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