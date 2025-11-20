// apps/web/src/stores/useSidebarStore.ts
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // 客户端初始化
  useEffect(() => {
    setIsMounted(true);
    
    // 从localStorage读取状态
    const saved = localStorage.getItem('sidebar-collapsed');
    // 如果没有保存的状态，根据屏幕尺寸决定初始状态
    if (saved === null) {
      setIsCollapsed(window.innerWidth < 768); // 在小屏幕上默认折叠
    } else {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    if (!isMounted) return;
    
    setIsCollapsed((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
      return newState;
    });
  }, [isMounted]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    if (!isMounted) return;
    
    setIsCollapsed(collapsed);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [isMounted]);

  // 监听屏幕尺寸变化，在小屏幕上自动折叠
  useEffect(() => {
    if (!isMounted) return;
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    // 初始检查
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMounted]);

  const value = {
    isCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
  };

  return React.createElement(SidebarContext.Provider, { value }, children);
}

export function useSidebarStore() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarStore must be used within a SidebarProvider');
  }
  return context;
}