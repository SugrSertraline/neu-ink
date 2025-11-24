'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { User } from '@/types/user';

interface DeleteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: User;
}

export default function DeleteUserDialog({
  isOpen,
  onClose,
  onConfirm,
  user,
}: DeleteUserDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/72 backdrop-blur-3xl rounded-2xl border border-white/60 shadow-[0_20px_54px_rgba(15,23,42,0.16)] w-full max-w-md mx-4" // data-glow="true"
>
        <div className="flex items-center justify-between p-6 border-b border-white/30">
          <h2 className="text-lg font-semibold text-slate-900">删除用户</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 backdrop-blur-xl bg-white/55 border border-white/45 hover:bg-white/78 transition-all duration-250"
          >
            <X className="h-4 w-4 text-slate-600" />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="shrink-0 h-16 w-16 rounded-full flex items-center justify-center bg-red-100/60 backdrop-blur-xl border border-red-200/60 shadow-[0_8px_22px_rgba(220,38,38,0.14)]">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                确认删除用户？
              </h3>
              <p className="text-slate-600">
                您即将删除用户 <span className="font-semibold text-slate-900">{user.username}</span> ({user.nickname})。
              </p>
              <p className="text-slate-600 mt-2">
                此操作不可撤销，该用户的所有数据将被永久删除。
              </p>
            </div>
          </div>

          <div className="bg-red-50/60 backdrop-blur-xl border border-red-200/60 rounded-xl p-4 shadow-[0_8px_22px_rgba(220,38,38,0.14)]">
            <h4 className="text-sm font-medium text-red-800 mb-2">注意事项：</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• 删除后用户无法恢复</li>
              <li>• 用户相关的所有数据将被删除</li>
              <li>• 请确认此操作的必要性</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="bg-linear-to-r from-red-600 to-red-700 text-white shadow-[0_12px_30px_rgba(220,38,38,0.32)] hover:shadow-[0_14px_32px_rgba(220,38,38,0.38)] hover:scale-[1.01] transition-all duration-250 border-0"
              // data-glow="true"
            >
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}