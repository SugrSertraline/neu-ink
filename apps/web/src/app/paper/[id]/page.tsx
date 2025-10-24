'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTabStore } from '@/stores/useTabStore';
import { usePaperApi } from '@/lib/paperApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, FileText, Calendar, User, Tag, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import MainLayout from '@/components/layout/MainLayout';

export default function PaperPage() {
  const params = useParams();
  const router = useRouter();
  const { setActiveTab } = useTabStore();
  const { paperApi } = usePaperApi();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [paper, setPaper] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const paperId = params.id as string;

  React.useEffect(() => {
    // 检查是否已登录
    if (!isLoading && !isAuthenticated) {
      setError('请先登录后查看论文详情');
      setLoading(false);
      return;
    }

    const loadPaper = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await paperApi.getPaper(paperId);
        if (response.code === 200) {
          setPaper(response.data);
        } else {
          setError('论文不存在或无权访问');
        }
      } catch (err: any) {
        setError(err?.message || '加载论文失败');
      } finally {
        setLoading(false);
      }
    };

    if (paperId && isAuthenticated) {
      loadPaper();
    }
  }, [paperId, paperApi, isAuthenticated, isLoading]);

  const handleBack = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载论文中...</p>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">
              {error?.includes('请先登录') ? '需要登录' : '加载失败'}
            </CardTitle>
            <CardDescription>
              {error || '论文不存在'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error?.includes('请先登录') ? (
              <>
                <Button onClick={() => router.push('/login')} className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  前往登录
                </Button>
                <Button variant="outline" onClick={handleBack} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </>
            ) : (
              <Button onClick={handleBack} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="mb-6">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {paper.metadata?.titleZh || paper.metadata?.title}
            </h1>
            {paper.metadata?.titleZh !== paper.metadata?.title && (
              <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                {paper.metadata?.title}
              </h2>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {paper.metadata?.authors?.map((author: any) => author.name).join(', ')}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {paper.metadata?.year}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {paper.metadata?.publication}
              </div>
            </div>
            
            {paper.metadata?.tags && paper.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {paper.metadata.tags.map((tag: string, index: number) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 摘要 */}
        {paper.abstract && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">摘要</h3>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              {paper.abstract.en && (
                <div>
                  <h4 className="font-medium mb-2">Abstract</h4>
                  <p>{paper.abstract.en}</p>
                </div>
              )}
              {paper.abstract.zh && (
                <div>
                  <h4 className="font-medium mb-2">中文摘要</h4>
                  <p>{paper.abstract.zh}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 解析状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">解析状态</h3>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              paper.parseStatus?.status === 'completed' ? 'bg-green-500' :
              paper.parseStatus?.status === 'parsing' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {paper.parseStatus?.message || '未知状态'}
            </span>
            {paper.parseStatus?.progress !== undefined && (
              <span className="text-sm text-gray-500">
                ({paper.parseStatus.progress}%)
              </span>
            )}
          </div>
        </div>

        {/* 功能开发中提示 */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📖 阅读功能开发中
          </h3>
          <p className="text-blue-800 dark:text-blue-200">
            论文阅读和笔记功能正在开发中，敬请期待！目前您可以查看论文的基本信息和解析状态。
          </p>
        </div>
        </div>
      </div>
    </MainLayout>
  );
}