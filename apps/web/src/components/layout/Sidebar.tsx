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
        gradient: 'from-blue-500/80 via-blue-600/80 to-blue-700/80',
        shadow: 'shadow-blue-500/30',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]'
      },
      indigo: {
        gradient: 'from-indigo-500/80 via-indigo-600/80 to-indigo-700/80',
        shadow: 'shadow-indigo-500/30',
        glow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]'
      },
      cyan: {
        gradient: 'from-cyan-500/80 via-cyan-600/80 to-cyan-700/80',
        shadow: 'shadow-cyan-600/30',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]'
      },
      slate: {
        gradient: 'from-slate-500/80 via-slate-600/80 to-slate-700/80',
        shadow: 'shadow-slate-500/30',
        glow: 'shadow-[0_0_15px_rgba(100,116,139,0.5)]'
      },
      purple: {
        gradient: 'from-purple-500/80 via-purple-600/80 to-purple-700/80',
        shadow: 'shadow-purple-500/30',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.5)]'
      }
    };

    const colors = colorMap[item.activeColor || 'blue'];

    return (
      <button
        onClick={() => onNavigate(item)}
        disabled={isLoading || isDisabled}
        className={cn(
          "relative w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-300 text-sm font-medium group overflow-hidden",
          "focus:outline-none focus-visible:outline-none focus:ring-0",
          "backdrop-blur-md border",
          isActive && !isDisabled
            ? `bg-linear-to-r ${colors.gradient} text-white ${colors.shadow} ${colors.glow} scale-[1.02] border-white/20`
            : isDisabled
            ? "text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50 bg-gray-100/30 dark:bg-gray-800/20 border-gray-200/30 dark:border-gray-700/30"
            : "text-gray-700 dark:text-gray-200 bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-lg hover:scale-[1.02] border-gray-200/50 dark:border-gray-700/50",
          isLoading && "opacity-75 cursor-wait"
        )}
      >
        {isActive && !isDisabled && (
          <>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg" />
            <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent" />
          </>
        )}

        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 "/>
        ) : (
          <item.icon className={cn(
            "w-4 h-4 transition-all duration-300 shrink-0",
            isActive && !isDisabled ? "scale-110 drop-shadow-lg" : "group-hover:scale-110",
            item.id === 'settings' && isActive && "rotate-90"
          )} />
        )}

        <span className="flex-1 text-left truncate">{item.label}</span>

        {isDisabled && item.requiresAuth && (
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 px-2 py-0.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full backdrop-blur-sm">
            需登录
          </span>
        )}

        {isDisabled && item.disabled && isAuthenticated && (
          <span className="text-xs text-gray-400 shrink-0 px-2 py-0.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full backdrop-blur-sm">即将推出</span>
        )}

        {badge && !isDisabled && (
          <span className={cn(
            "px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 backdrop-blur-sm",
            isActive 
              ? "bg-white/30 text-white shadow-lg" 
              : "bg-purple-100/80 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/50"
          )}>
            {badge}
          </span>
        )}

        {isActive && !isLoading && !isDisabled && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0 shadow-lg shadow-white/50" />
        )}
      </button>
    );
  };

  return (
    <div className="w-60 h-full bg-linear-to-br from-gray-50/95 via-blue-50/90 to-purple-50/95 dark:from-gray-900/95 dark:via-blue-950/90 dark:to-purple-950/95 border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col shadow-xl backdrop-blur-xl">
      {/* Logo区域 */}
      <div className="h-12 flex items-center px-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg shadow-sm select-none">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-linear-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-base bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
            NeuInk
          </span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto flex flex-col">
        {/* 主要功能区 */}
        <div className="space-y-1.5">
          {navItems
            .filter(item => item.showInSidebar)
            .map(item => (
              <NavButton key={item.id} item={item} />
            ))}
        </div>

        {/* 分割线 */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent"></div>
          </div>
        </div>

        {/* 用户信息 - 只有已登录用户显示 */}
        {isAuthenticated && (
          <div className="flex-1 space-y-2 min-h-0">
            <div className="p-3 bg-linear-to-br from-white/60 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-900/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-lg shadow-lg">
              <div className="text-sm">
                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-0.5">
                  {user?.nickname || user?.username}
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-xs flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isAdmin ? "bg-linear-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50" : "bg-linear-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50"
                  )} />
                  {isAdmin ? '管理员' : '普通用户'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 未登录用户显示登录提示 */}
        {!isAuthenticated && (
          <div className="flex-1 space-y-2 min-h-0">
            <div className="p-3 bg-linear-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-xl border border-blue-200/50 dark:border-blue-700/50 backdrop-blur-lg shadow-lg">
              <div className="text-sm text-center">
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  未登录
                </div>
                <div className="text-blue-700 dark:text-blue-300 text-xs mb-2">
                  登录后可使用更多功能
                </div>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-3 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] backdrop-blur-sm"
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