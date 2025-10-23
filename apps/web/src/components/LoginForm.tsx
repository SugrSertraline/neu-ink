'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner'                           // 新的

interface LoginFormProps {
  onSuccess?: () => void;
}

// 兼容：AuthContext.login 既可能返回 boolean，也可能返回 { ok, message }
function parseLoginResult(result: unknown): { ok: boolean; message?: string } {
  if (typeof result === 'boolean') return { ok: result };
  if (result && typeof result === 'object' && 'ok' in result) {
    const r = result as { ok: boolean; message?: string };
    return { ok: !!r.ok, message: r.message };
  }
  return { ok: false, message: '登录失败，请稍后重试' };
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!username || !password) {
    setError('请输入用户名和密码');
    return;
  }

  setIsSubmitting(true);
  setError('');

  try {
    const res = await login(username.trim(), password);
    const { ok, message } = parseLoginResult(res);

    if (ok) {
      setError('');
      toast.success('登录成功', { description: '欢迎回来！' });
      onSuccess?.();
    } else {
      const msg = message || '用户名或密码错误';
      setError(msg);
      toast.error('登录失败', { description: msg });
    }
  } catch {
    const msg = '登录失败，请稍后重试';
    setError(msg);
    toast.error('网络或服务器异常', { description: msg });
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">NeuInk 用户登录</CardTitle>
            <CardDescription>请输入您的用户名和密码</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  disabled={isSubmitting}
                  className="w-full"
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={isSubmitting}
                  className="w-full"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>测试账号：</p>
              <p>管理员 - 用户名: admin, 密码: admin123</p>
              <p>普通用户 - 用户名: testuser, 密码: test123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
