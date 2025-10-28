'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { toast } from 'sonner';

function parseLoginResult(result: unknown): { ok: boolean; message?: string } {
  if (typeof result === 'boolean') return { ok: result };
  if (result && typeof result === 'object' && 'ok' in result) {
    const r = result as { ok: boolean; message?: string };
    return { ok: !!r.ok, message: r.message };
  }
  return { ok: false, message: '登录失败，请稍后重试' };
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
    }
  }, [isAuthenticated, isLoading, router]); 
  

  const handleLogin = async (username: string, password: string) => {
    setIsSubmitting(true);
    setError('');
  
    try {
      const res = await login(username, password);
      
      // ✅ 添加这行：查看原始返回值
      
      
      const { ok, message } = parseLoginResult(res);
  
      
  
      if (ok) {
        
        toast.success('登录成功', { description: '欢迎回来！' });
        
        setTimeout(() => {
          
          window.location.href = '/';
        }, 500);
      } else {
        
        const msg = message || '用户名或密码错误';
        setError(msg);
        toast.error('登录失败', { description: msg });
      }
    } catch (err) {
      
      const msg = '登录失败，请稍后重试';
      setError(msg);
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

  if (isAuthenticated) {
    return null;
  }

  const handleSkipLogin = () => {
    // 跳过登录，直接返回首页
    window.location.href = '/';
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
