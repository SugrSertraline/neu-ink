import { Loader2 } from 'lucide-react';

export function PaperLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-600 dark:text-slate-400">加载论文中...</p>
      </div>
    </div>
  );
}