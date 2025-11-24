import { useEffect } from 'react';

interface PaperErrorStateProps {
  error?: string;
}

export function PaperErrorState({ error }: PaperErrorStateProps) {
  // 如果是500错误或论文不存在，自动跳转到默认页面
  if (error?.includes('500') || error?.includes('论文内容不存在')) {
    useEffect(() => {
      // 延迟跳转，让用户看到错误信息
      const timer = setTimeout(() => {
        window.location.href = '/library';
      }, 3000);

      return () => clearTimeout(timer);
    }, []);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-md">
        <h2 className="text-xl font-bold text-red-600 mb-2">加载失败</h2>
        <p className="text-gray-700 dark:text-slate-300">{error || '论文内容不存在'}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">3秒后自动跳转到论文库...</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => window.location.href = '/library'}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
          >
            前往论文库
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            返回上页
          </button>
        </div>
      </div>
    </div>
  );
}