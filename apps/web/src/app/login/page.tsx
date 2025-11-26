'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { isAuthenticated: authStoreAuthenticated, isLoading: authStoreLoading, login: authStoreLogin } = useAuthStore();
  const { isAuthenticated: authContextAuthenticated, isLoading: authContextLoading, login: authContextLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 已登录则跳转到目标页面（避免停留在登录页）
  // 检查两个认证系统的状态
  useEffect(() => {
    const isAuthenticated = authStoreAuthenticated || authContextAuthenticated;
    const isLoading = authStoreLoading || authContextLoading;
    
    if (!isLoading && isAuthenticated) {
      // 检查是否有 from 参数，如果有则跳转到指定页面，否则跳转到首页
      const fromUrl = searchParams.get('from');
      if (fromUrl) {
        router.replace(decodeURIComponent(fromUrl));
      } else {
        router.replace('/');
      }
    }
  }, [authStoreAuthenticated, authContextAuthenticated, authStoreLoading, authContextLoading, router, searchParams]);

  const handleLogin = async (username: string, password: string) => {
    setIsSubmitting(true);
    setError('');

    try {
      // 先登录 AuthStore，再同步到 AuthContext
      const authStoreRes = await authStoreLogin({ username, password });
      
      if (authStoreRes.ok) {
        // AuthStore 登录成功后，再登录 AuthContext
        const authContextRes = await authContextLogin(username, password);
        
        if (authContextRes.ok) {
          toast.success('登录成功', { description: '欢迎回来！' });
          // 检查是否有 from 参数，如果有则跳转到指定页面，否则跳转到首页
          const fromUrl = searchParams.get('from');
          console.log('登录成功，跳转到:', fromUrl || '/');
          
          if (fromUrl) {
            router.replace(decodeURIComponent(fromUrl));
          } else {
            router.replace('/');
          }
        } else {
          // AuthContext 登录失败，回滚 AuthStore
          // 直接调用 authStore 的 logout 方法来清除状态
          try {
            // 使用 authStore 的 logout 方法
            const { logout: authStoreLogout } = useAuthStore.getState();
            await authStoreLogout();
          } catch (error) {
            console.error('回滚 AuthStore 失败:', error);
          }
          const msg = authContextRes.message || '认证同步失败';
          setError(msg);
          toast.error('登录失败', { description: msg });
        }
      } else {
        // 使用从后端返回的具体错误信息
        const msg = (authStoreRes.message && String(authStoreRes.message).trim()) || '用户名或密码错误';
        setError(msg);
        
        // 根据业务错误码显示不同的提示
        if (authStoreRes.businessCode === 1001) { // LOGIN_FAILED
          // 只设置内联错误信息供LoginForm显示，不显示toast
        } else if (authStoreRes.businessCode === 1005) { // USER_NOT_FOUND
          toast.error('用户不存在', { description: '请检查用户名是否正确' });
        } else {
          // 其他错误显示通用toast
          toast.error('登录失败', { description: msg });
        }
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

  const isLoading = authStoreLoading || authContextLoading;
  const isAuthenticated = authStoreAuthenticated || authContextAuthenticated;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:bg-gray-400">正在验证身份...</p>
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
