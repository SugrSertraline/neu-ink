// apps/web/src/components/layout/Sidebar.tsx
'use client';

import React from 'react';
<<<<<<< HEAD
import { Loader2, Users } from 'lucide-react';
=======
import { Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
>>>>>>> origin/main
import { useRouter } from 'next/navigation';
import { NavItem } from '@/types/navigation';
import { User } from '@/types/user';
import { cn } from '@/lib/utils';
<<<<<<< HEAD
=======
import { useSidebarStore } from '@/stores/useSidebarStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
>>>>>>> origin/main

interface SidebarProps {
  navItems: NavItem[];
  activeTabId: string | null;
  loadingTabId: string | null;
  onNavigate: (item: NavItem) => void;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const glowMap = {
  blue: 'shadow-[0_0_14px_rgba(40,65,138,0.35)]',
  indigo: 'shadow-[0_0_14px_rgba(44,83,166,0.32)]',
  cyan: 'shadow-[0_0_14px_rgba(98,170,214,0.34)]',
  slate: 'shadow-[0_0_14px_rgba(108,128,155,0.28)]',
  purple: 'shadow-[0_0_14px_rgba(40,65,138,0.32)]', // 旧值映射到蓝系
};

const gradientMap = {
  blue: 'from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92',
  indigo: 'from-[#3050A5]/90 via-[#28418A]/88 to-[#1F3469]/90',
  cyan: 'from-[#66A9D6]/90 via-[#4E88C2]/86 to-[#2D5E97]/90',
  slate: 'from-[#667696]/92 via-[#5A6783]/90 to-[#4A566E]/90',
  purple: 'from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92',
};

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
<<<<<<< HEAD
=======
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
>>>>>>> origin/main

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activeTabId === item.id;
    const isLoading = loadingTabId === item.id;
    const isDisabled = (item.requiresAuth && !isAuthenticated) || item.disabled;

    const badge =
      typeof item.badge === 'function' ? item.badge(user, isAdmin) : item.badge;

    const key = (item.activeColor as keyof typeof glowMap) || 'blue';
    const glow = glowMap[key] ?? glowMap.blue;
    const gradient = gradientMap[key] ?? gradientMap.blue;

<<<<<<< HEAD
    return (
=======
    const buttonContent = (
>>>>>>> origin/main
      <button
        onClick={() => onNavigate(item)}
        disabled={isLoading || isDisabled}
        data-glow="true"
        className={cn(
<<<<<<< HEAD
          'relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-250 text-sm font-medium group overflow-hidden',
          'focus:outline-none focus-visible:outline-none focus:ring-0',
          'backdrop-blur-xl border border-white/45',
=======
          'relative w-full flex items-center rounded-xl transition-all duration-250 text-sm font-medium group overflow-hidden',
          'focus:outline-none focus-visible:outline-none focus:ring-0',
          'backdrop-blur-xl border border-white/45',
          isCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3.5 py-3',
>>>>>>> origin/main
          isActive && !isDisabled
            ? `bg-linear-to-r ${gradient} text-white shadow-md ${glow} scale-[1.01]`
            : isDisabled
            ? 'text-slate-400 cursor-not-allowed opacity-60 bg-white/35'
            : 'text-slate-700 bg-white/55 hover:bg-white/78 hover:text-slate-900 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)]',
          isLoading && 'opacity-80 cursor-wait',
        )}
      >
        {isActive && !isDisabled && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-[3px] rounded-r-full bg-white shadow-[0_0_9px_rgba(255,255,255,0.58)]" />
        )}

        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
        ) : (
          <item.icon
            className={cn(
              'w-4.5 h-4.5 transition-all duration-300 shrink-0',
              isActive && !isDisabled ? 'scale-110 drop-shadow-[0_3px_6px_rgba(0,0,0,0.16)]' : 'group-hover:scale-110',
              item.id === 'settings' && isActive && 'rotate-90',
            )}
          />
        )}

<<<<<<< HEAD
        <span className="flex-1 text-left truncate">{item.label}</span>

        {isDisabled && item.requiresAuth && (
          <span className="text-xs text-slate-400 shrink-0 px-2 py-0.5 bg-white/40 rounded-full backdrop-blur-sm border border-white/40">
            需登录
          </span>
        )}

        {isDisabled && item.disabled && isAuthenticated && (
          <span className="text-xs text-slate-400 shrink-0 px-2 py-0.5 bg-white/40 rounded-full backdrop-blur-sm border border-white/40">
            即将推出
          </span>
        )}

        {badge && !isDisabled && (
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 backdrop-blur-sm border border-white/50',
              isActive
                ? 'bg-white/38 text-white shadow-[0_0_10px_rgba(255,255,255,0.48)]'
                : 'bg-[#F7C242]/80 text-[#7A4E00]',
            )}
          >
            {badge}
          </span>
        )}

        {isActive && !isLoading && !isDisabled && (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.72)]" />
        )}
      </button>
    );
  };

  return (
    <aside
      className="w-60 h-full flex flex-col rounded-2xl border border白/60 bg-white/72 backdrop-blur-3xl shadow-[0_20px_54px_rgba(15,23,42,0.16)] px-4 py-5"
      data-glow="true"
    >
      <div
        className="h-12 flex items-center px-2.5 mb-4 rounded-xl border border-white/65 bg-white/85 backdrop-blur-2xl shadow-[0_8px_22px_rgba(40,65,138,0.14)]"
        data-glow="true"
      >
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 ">
            <img src="/neuink_logo.png" alt="NeuInk" className="w-9 h-9" />
          </div>
          <span
            className="font-semibold text-xl text-[#28418A]"
            style={{ fontFamily: 'Playball-Regular, system-ui, sans-serif' }}
          >
            NeuInk
          </span>
=======
        {isMounted && !isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>

            {isDisabled && item.requiresAuth && (
              <span className="text-xs text-slate-400 shrink-0 px-2 py-0.5 bg-white/40 rounded-full backdrop-blur-sm border border-white/40">
                需登录
              </span>
            )}

            {isDisabled && item.disabled && isAuthenticated && (
              <span className="text-xs text-slate-400 shrink-0 px-2 py-0.5 bg-white/40 rounded-full backdrop-blur-sm border border-white/40">
                即将推出
              </span>
            )}

            {badge && !isDisabled && (
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 backdrop-blur-sm border border-white/50',
                  isActive
                    ? 'bg-white/38 text-white shadow-[0_0_10px_rgba(255,255,255,0.48)]'
                    : 'bg-[#F7C242]/80 text-[#7A4E00]',
                )}
              >
                {badge}
              </span>
            )}

            {isActive && !isLoading && !isDisabled && (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.72)]" />
            )}
          </>
        )}
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={6}
            className="tooltip-bubble border border-white/65 bg-white/85 backdrop-blur-2xl text-[#28418A] shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
          >
            <p className="text-xs font-medium">{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'h-full flex flex-col rounded-2xl border border-white/60 bg-white/72 backdrop-blur-3xl shadow-[0_20px_54px_rgba(15,23,42,0.16)] transition-all duration-300 ease-in-out',
          // 在组件挂载前，使用固定宽度避免水合错误
          !isMounted ? 'w-60 px-4 py-5' : (isCollapsed ? 'w-16 px-2 py-5' : 'w-60 px-4 py-5')
        )}
        data-glow="true"
      >
      <div
        className={cn(
          'h-12 flex items-center rounded-xl border border-white/65 bg-white/85 backdrop-blur-2xl shadow-[0_8px_22px_rgba(40,65,138,0.14)] mb-4 transition-all duration-300',
          // 在组件挂载前，使用固定样式避免水合错误
          !isMounted ? 'px-2.5' : (isCollapsed ? 'justify-center px-2' : 'px-2.5')
        )}
        data-glow="true"
      >
        <div className={cn('flex items-center', !isMounted ? 'gap-2' : (isCollapsed ? '' : 'gap-2'))}>
          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0">
            <img src="/neuink_logo.png" alt="NeuInk" className="w-9 h-9" />
          </div>
          {isMounted && !isCollapsed && (
            <span
              className="font-semibold text-xl text-[#28418A]"
              style={{ fontFamily: 'Playball-Regular, system-ui, sans-serif' }}
            >
              NeuInk
            </span>
          )}
>>>>>>> origin/main
        </div>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto pr-1">
        <div className="space-y-2">
          {navItems
            .filter(item => item.showInSidebar)
            .map(item => (
              <NavButton key={item.id} item={item} />
            ))}
        </div>

        <div className="relative flex items-center">
<<<<<<< HEAD
          <span className="w全 border-b border-white/55" />
        </div>

        {isAuthenticated ? (
          <div
            className="p-3.5 rounded-xl border border白/60 bg-white/75 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
            data-glow="true"
          >
            <div className="text-sm">
              <div className="font-semibold text-slate-900 truncate mb-1">
                {user?.nickname || user?.username}
              </div>
              <div className="text-slate-500 text-xs flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-2 w-2 rounded-full shadow-[0_0_10px_rgba(40,65,138,0.38)]',
                    isAdmin
                      ? 'bg-linear-to-r from-[#28418A] to-[#3F66B0]'
                      : 'bg-linear-to-r from-[#3F66B0] to-[#6CAAD6]',
                  )}
                />
                {isAdmin ? '管理员' : '普通用户'}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="p-3.5 rounded-xl border border白/60 bg白/75 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.18)] text-center"
            data-glow="true"
          >
            <div className="font-semibold text-slate-800 mb-1">未登录</div>
            <div className="text-slate-500 text-xs mb-3">登录后可使用更多功能</div>
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 rounded-lg bg-linear-to-r from-[#28418A] to-[#3F66B0] text-white text-xs font-medium shadow-[0_12px_30px_rgba(40,65,138,0.32)] hover:shadow-[0_14px_32px_rgba(40,65,138,0.38)] hover:scale-[1.01] transition-all duration-250"
              data-glow="true"
            >
              立即登录
            </button>
          </div>
        )}
      </nav>
    </aside>
=======
          <span className="w-full border-b border-white/55" />
        </div>

        {isMounted && isAuthenticated ? (
          isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="p-3 flex justify-center rounded-xl border border-white/60 bg-white/75 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.18)] transition-all duration-300 cursor-pointer"
                  data-glow="true"
                >
                  <div className="w-8 h-8 rounded-full bg-linear-to-r from-[#28418A] to-[#3F66B0] flex items-center justify-center text-white text-sm font-semibold">
                    {(user?.nickname || user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={6}
                className="tooltip-bubble border border-white/65 bg-white/85 backdrop-blur-2xl text-[#28418A] shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
              >
                <p className="text-xs font-medium">{user?.nickname || user?.username}</p>
                <p className="text-xs text-slate-500">{isAdmin ? '管理员' : '普通用户'}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className="p-3.5 rounded-xl border border-white/60 bg-white/75 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.18)] transition-all duration-300"
              data-glow="true"
            >
              <div className="text-sm">
                <div className="font-semibold text-slate-900 truncate mb-1">
                  {user?.nickname || user?.username}
                </div>
                <div className="text-slate-500 text-xs flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex h-2 w-2 rounded-full shadow-[0_0_10px_rgba(40,65,138,0.38)]',
                      isAdmin
                        ? 'bg-linear-to-r from-[#28418A] to-[#3F66B0]'
                        : 'bg-linear-to-r from-[#3F66B0] to-[#6CAAD6]',
                    )}
                  />
                  {isAdmin ? '管理员' : '普通用户'}
                </div>
              </div>
            </div>
          )
        ) : isMounted ? (
          isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/login')}
                  className="p-3 rounded-xl border border-white/60 bg-white/75 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.18)] transition-all duration-300"
                  data-glow="true"
                >
                  <Users className="w-4 h-4 text-slate-700" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={6}
                className="tooltip-bubble border border-white/65 bg-white/85 backdrop-blur-2xl text-[#28418A] shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
              >
                <p className="text-xs font-medium">未登录</p>
                <p className="text-xs text-slate-500">点击登录</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className="p-3.5 rounded-xl border border-white/60 bg-white/75 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.18)] text-center transition-all duration-300"
              data-glow="true"
            >
              <div className="font-semibold text-slate-800 mb-1">未登录</div>
              <div className="text-slate-500 text-xs mb-3">登录后可使用更多功能</div>
              <button
                onClick={() => router.push('/login')}
                className="w-full px-4 py-2 rounded-lg bg-linear-to-r from-[#28418A] to-[#3F66B0] text-white text-xs font-medium shadow-[0_12px_30px_rgba(40,65,138,0.32)] hover:shadow-[0_14px_32px_rgba(40,65,138,0.38)] hover:scale-[1.01] transition-all duration-250"
                data-glow="true"
              >
                立即登录
              </button>
            </div>
          )
        ) : null}
      </nav>

      {/* 折叠/展开按钮 */}
      {isMounted && isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="mt-4 flex items-center justify-center w-full py-2 px-2 rounded-xl border border-white/45 bg-white/55 backdrop-blur-xl text-slate-700 hover:bg-white/78 hover:text-slate-900 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
              data-glow="true"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={6}
            className="tooltip-bubble border border-white/65 bg-white/85 backdrop-blur-2xl text-[#28418A] shadow-[0_14px_30px_rgba(40,65,138,0.18)]"
          >
            <p className="text-xs font-medium">展开侧边栏</p>
          </TooltipContent>
        </Tooltip>
      ) : isMounted ? (
        <button
          onClick={toggleSidebar}
          className="mt-4 flex items-center gap-2 justify-center w-full py-2 px-3 rounded-xl border border-white/45 bg-white/55 backdrop-blur-xl text-slate-700 hover:bg-white/78 hover:text-slate-900 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
          data-glow="true"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm">收起</span>
        </button>
      ) : null}
        <style jsx>{`
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
          .tooltip-bubble[data-side='right']::after {
            left: -6px;
            top: calc(50% - 6px);
          }
        `}</style>
      </aside>
    </TooltipProvider>
>>>>>>> origin/main
  );
}
