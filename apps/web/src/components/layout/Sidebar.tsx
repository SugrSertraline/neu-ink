'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NavItem } from '@/types/navigation';
import { User } from '@/types/user';
import { cn } from '@/lib/utils';

interface SidebarProps {
  navItems: NavItem[];
  activeTabId: string | null;
  loadingTabId: string | null;
  onNavigate: (item: NavItem) => void;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export default function Sidebar({
  navItems,
  activeTabId,
  loadingTabId,
  onNavigate,
  user,
  isAdmin,
  isAuthenticated,
}: SidebarProps) {
  const router = useRouter();

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activeTabId === item.id;
    const isLoading = loadingTabId === item.id;
    const isDisabled = (item.requiresAuth && !isAuthenticated) || item.disabled;

    // 计算 badge
    const badge = typeof item.badge === 'function' 
      ? item.badge(user, isAdmin)
      : item.badge;

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

    const colors = colorMap[item.activeColor || 'blue'];

    return (
      <button
        onClick={() => onNavigate(item)}
        disabled={isLoading || isDisabled}
        className={cn(
          "relative w-full flex items-center gap-2 px-2.5 py-3 rounded-lg transition-all duration-300 text-xs font-medium group overflow-hidden",
          "focus:outline-none focus-visible:outline-none focus:ring-0",
          isActive && !isDisabled
            ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md ${colors.shadow} scale-[1.01]`
            : isDisabled
            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm hover:scale-[1.01]",
          isLoading && "opacity-75 cursor-wait"
        )}
      >
        {isActive && !isDisabled && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full shadow-md" />
        )}

        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : (
          <item.icon className={cn(
            "w-3.5 h-3.5 transition-all duration-300 flex-shrink-0",
            isActive && !isDisabled ? "scale-110" : "group-hover:scale-110",
            item.id === 'settings' && isActive && "rotate-90"
          )} />
        )}

        <span className="flex-1 text-left truncate">{item.label}</span>

        {isDisabled && item.requiresAuth && (
          <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0">
            需登录
          </span>
        )}

        {isDisabled && item.disabled && isAuthenticated && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">即将推出</span>
        )}

        {badge && !isDisabled && (
          <span className={cn(
            "px-1.5 py-0.5 text-[10px] rounded-full flex-shrink-0",
            isActive 
              ? "bg-white/20 text-white" 
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          )}>
            {badge}
          </span>
        )}

        {isActive && !isLoading && !isDisabled && (
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="w-60 h-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-sm">
      {/* Logo区域 */}
      <div className="h-10 flex items-center px-3 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm select-none">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <span className="font-bold text-sm text-blue-600 truncate">
            NeuInk
          </span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto flex flex-col">
        {/* 主要功能区 */}
        <div className="space-y-1">
          {navItems
            .filter(item => item.showInSidebar)
            .map(item => (
              <NavButton key={item.id} item={item} />
            ))}
        </div>

        {/* 分割线 */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
        </div>

        {/* 用户信息 - 只有已登录用户显示 */}
        {isAuthenticated && (
          <div className="flex-1 space-y-1 min-h-0">
            <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.nickname || user?.username}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">
                  {isAdmin ? '管理员' : '普通用户'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 未登录用户显示登录提示 */}
        {!isAuthenticated && (
          <div className="flex-1 space-y-1 min-h-0">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-center">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-0.5">
                  未登录
                </div>
                <div className="text-blue-700 dark:text-blue-300 text-[10px] mb-1.5">
                  登录后可使用更多功能
                </div>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 transition-colors"
                >
                  立即登录
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
