'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">删除用户</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                确认删除用户？
              </h3>
              <p className="text-gray-600">
                您即将删除用户 <span className="font-semibold">{user.username}</span> ({user.nickname})。
              </p>
              <p className="text-gray-600 mt-2">
                此操作不可撤销，该用户的所有数据将被永久删除。
              </p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
            >
              确认删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}