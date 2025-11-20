'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { toast } from 'sonner';

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 已登录则跳转首页（避免停留在登录页）
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async (username: string, password: string) => {
    setIsSubmitting(true);
    setError('');

    try {
<<<<<<< HEAD
      const res = await login(username, password); // LoginResult: { ok, message? }
=======
      const res = await login(username, password); // LoginResult: { ok, message?, businessCode? }
>>>>>>> origin/main

      if (res.ok) {
        toast.success('登录成功', { description: '欢迎回来！' });
        // 使用 router.replace 避免历史回退到登录页；如需强刷可改成 window.location.href='/'
        router.replace('/');
      } else {
<<<<<<< HEAD
        const msg = (res.message && String(res.message).trim()) || '用户名或密码错误';
        setError(msg);
        // 对于400等错误，normalize.ts已经处理了toast，这里不再重复显示
        // 只设置内联错误信息供LoginForm显示
=======
        // 使用从后端返回的具体错误信息
        const msg = (res.message && String(res.message).trim()) || '用户名或密码错误';
        setError(msg);
        
        // 根据业务错误码显示不同的提示
        if (res.businessCode === 1001) { // LOGIN_FAILED
          // 只设置内联错误信息供LoginForm显示，不显示toast
        } else if (res.businessCode === 1005) { // USER_NOT_FOUND
          toast.error('用户不存在', { description: '请检查用户名是否正确' });
        } else {
          // 其他错误显示通用toast
          toast.error('登录失败', { description: msg });
        }
>>>>>>> origin/main
      }
    } catch (err) {
      const msg = '登录失败，请稍后重试';
      setError(msg);
      // 对于非400错误，显示网络异常toast
      toast.error('网络或服务器异常', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 这里的 useEffect 已处理已登录跳转，所以可直接返回 null 或者 skeleton
  if (isAuthenticated) return null;

  const handleSkipLogin = () => {
    router.replace('/');
  };

  return (
    <LoginForm
      onSubmit={handleLogin}
      error={error}
      isSubmitting={isSubmitting}
      onSkip={handleSkipLogin}
    />
  );
}
