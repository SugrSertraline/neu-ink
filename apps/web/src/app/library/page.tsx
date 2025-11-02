'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Lock, ShieldCheck, User } from 'lucide-react';

import PublicLibraryPage from './PublicLibraryPage';
import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/stores/useTabStore';
import { Button } from '@/components/ui/button';

type LibrarySection = 'public' | 'personal';

function PersonalLibraryGuard({
  onLogin,
  onSwitchPublic,
}: {
  onLogin: () => void;
  onSwitchPublic: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="mx-6 max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
          <Lock className="h-7 w-7 text-blue-600 dark:text-blue-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">需要登录后查看</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          个人论文库会展示你的阅读状态、优先级和自定义标签。请先登录账号，再继续访问该视图。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onLogin}>立即登录</Button>
          <Button variant="outline" onClick={onSwitchPublic}>
            返回公共论文库
          </Button>
        </div>
      </div>
    </div>
  );
}

function PersonalLibraryPlaceholder({ username }: { username?: string | null }) {
  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <div className="border-b border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
            <ShieldCheck className="h-4 w-4" />
            个人论文库 · 功能建设中
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
            <User className="h-4 w-4" />
            当前账号：{username || '已登录用户'}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50">我的论文库</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          这里将展示你收藏的公共论文及私有上传稿件，并支持阅读状态、优先级、标签等管理操作。我们正在准备数据适配与功能迁移，敬请期待。
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-dashed border-gray-300 bg-white/80 p-10 text-center dark:border-gray-700 dark:bg-gray-900/70">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-indigo-500 dark:text-indigo-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">个人库即将上线</h3>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            我们会复用公共库的筛选器、卡片视图与阅读入口，并提供移出收藏、阅读进度、标签管理等能力。
          </p>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
            目前可以先在公共库中收藏论文，待个人库接入后会自动同步。
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { addTab, setActiveTab } = useTabStore();

  const requestedSection: LibrarySection =
    searchParams?.get('section') === 'personal' ? 'personal' : 'public';

  useEffect(() => {
    const tabId = requestedSection === 'personal' ? 'library' : 'public-library';
    const title = requestedSection === 'personal' ? '我的论文库' : '论文库';
    const path = `/library?section=${requestedSection}`;

    addTab({
      id: tabId,
      type: 'library',
      title,
      path,
      data: { section: requestedSection },
    });
    setActiveTab(tabId);
  }, [addTab, requestedSection, setActiveTab]);

  if (requestedSection === 'personal') {
    if (!isAuthenticated) {
      return (
        <PersonalLibraryGuard
          onLogin={() => router.push('/login')}
          onSwitchPublic={() => router.replace('/library?section=public')}
        />
      );
    }
    return <PersonalLibraryPlaceholder username={user?.nickname || user?.username} />;
  }

  return <PublicLibraryPage />;
}
