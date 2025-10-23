// library/components/EmptyState.tsx

'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onClearFilters: () => void;
}

export default function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
      <p className="text-slate-500">未找到符合条件的论文</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={onClearFilters}
      >
        清除所有筛选
      </Button>
    </div>
  );
}