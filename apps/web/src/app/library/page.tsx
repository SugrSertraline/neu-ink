// apps/web/src/components/library/LibraryPage.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Lock, ShieldCheck, User } from 'lucide-react';

import PublicLibraryPage from './PublicLibraryPage';
import PersonalLibraryPage from './PersonalLibraryPage';
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
    <div
      className="flex h-full flex-col items-center justify-center bg-linear-to-br from-[#eef2ff]/75 via-white/80 to-[#dbe4ff]/70"
      data-glow="true"
    >
      <div className="mx-6 max-w-lg rounded-2xl border border-white/70 bg-white/80 p-8 text-center shadow-[0_20px_48px_rgba(28,45,96,0.16)] backdrop-blur-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#28418A]/18 via-[#28418A]/12 to-[#28418A]/24 shadow-[0_12px_26px_rgba(40,65,138,0.22)]">
          <Lock className="h-8 w-8 text-[#28418A]" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">需要登录后查看</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          个人论文库会展示你的阅读状态、优先级和自定义标签。请先登录账号，再继续访问该视图。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            data-glow="true"
            onClick={onLogin}
            className="rounded-xl border border-white/70 bg-linear-to-r from-[#28418A]/90 via-[#28418A]/86 to-[#28418A]/90 text-white shadow-[0_16px_38px_rgba(40,65,138,0.26)] hover:shadow-[0_18px_44px_rgba(40,65,138,0.34)]"
          >
            立即登录
          </Button>
          <Button
            data-glow="true"
            variant="outline"
            onClick={onSwitchPublic}
            className="rounded-xl border border-white/70 bg-white/75 text-[#28418A] backdrop-blur-xl hover:bg-white/90 hover:text-[#253873] hover:shadow-[0_12px_30px_rgba(40,65,138,0.18)]"
          >
            返回公共论文库
          </Button>
        </div>
      </div>
    </div>
  );
}

function PersonalLibraryPlaceholder({ username }: { username?: string | null }) {
  return (
    <div
      className="flex h-full flex-col bg-linear-to-br from-[#eef2ff]/70 via-white/80 to-[#dbe4ff]/70"
      data-glow="true"
    >
      <div className="border-b border-white/60 bg-white/75 px-8 py-7 shadow-[0_14px_34px_rgba(28,45,96,0.12)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3.5 py-1 text-xs font-medium text-[#28418A] shadow-[0_12px_30px_rgba(40,65,138,0.2)] backdrop-blur-xl"
            data-glow="true"
          >
            <ShieldCheck className="h-4 w-4" />
            个人论文库 · 功能建设中
          </span>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/65 px-3.5 py-1 text-xs font-medium text-slate-600 backdrop-blur-lg"
            data-glow="true"
          >
            <User className="h-4 w-4" />
            当前账号：{username || '已登录用户'}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">我的论文库</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          这里将展示你收藏的公共论文及私有上传稿件，并支持阅读状态、优先级、标签等管理操作。我们正在准备数据适配与功能迁移，敬请期待。
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div
          className="max-w-md rounded-2xl border border-dashed border-white/70 bg-white/75 p-10 text-center shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl"
          data-glow="true"
        >
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-[#28418A]" />
          <h3 className="text-lg font-semibold text-slate-900">个人库即将上线</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            我们会复用公共库的筛选器、卡片视图与阅读入口，并提供移出收藏、阅读进度、标签管理等能力。
          </p>
          <p className="mt-3 text-xs text-slate-500">
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
    return <PersonalLibraryPage />;
  }

  return <PublicLibraryPage />;
}
