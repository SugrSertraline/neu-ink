'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  error?: string;
  isSubmitting?: boolean;
  onSkip?: () => void;
}

export function LoginForm({ onSubmit, error, isSubmitting = false, onSkip }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      return;
    }

    await onSubmit(username.trim(), password);
  };

  return (
    <div className="h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-linear-to-br from-[#28418A]/20 via-[#3F66B0]/15 to-[#6CAAD6]/20" />
      <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl" />
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo区域 */}
        <div className="text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-white/85 backdrop-blur-2xl border border-white/65 shadow-[0_8px_22px_rgba(40,65,138,0.14)]">
            <img src="/neuink_logo.png" alt="NeuInk" className="w-12 h-12" />
          </div>
          <h1
            className="text-3xl font-bold text-[#28418A] mb-2"
            style={{ fontFamily: 'Playball-Regular, system-ui, sans-serif' }}
          >
            NeuInk
          </h1>
          <p className="text-slate-600 text-sm">智能论文管理与协作平台</p>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl border border-white/60 bg-white/75 backdrop-blur-3xl shadow-[0_20px_54px_rgba(15,23,42,0.16)] p-8" data-glow="true">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">欢迎回来</h2>
            <p className="text-slate-600 text-sm">请登录您的账户以继续使用</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                用户名
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                disabled={isSubmitting}
                className="w-full bg-white/55 border-white/45 backdrop-blur-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#4769b8]/45 focus:border-[#4769b8]/45 transition-all duration-250"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                密码
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                disabled={isSubmitting}
                className="w-full bg-white/55 border-white/45 backdrop-blur-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#4769b8]/45 focus:border-[#4769b8]/45 transition-all duration-250"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50/80 backdrop-blur-sm p-3 rounded-xl border border-red-200/50">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting || !username || !password}
                className="w-full px-4 py-3 rounded-xl bg-linear-to-r from-[#28418A] to-[#3F66B0] text-white text-sm font-medium shadow-[0_12px_30px_rgba(40,65,138,0.32)] hover:shadow-[0_14px_32px_rgba(40,65,138,0.38)] hover:scale-[1.01] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 backdrop-blur-xl border border-white/20"
                data-glow="true"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </div>
                ) : (
                  '登录'
                )}
              </button>

              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="w-full px-4 py-3 rounded-xl bg-white/55 hover:bg-white/78 text-slate-700 hover:text-slate-900 text-sm font-medium shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250 backdrop-blur-2xl border border-white/45"
                >
                  跳过登录
                </button>
              )}
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
