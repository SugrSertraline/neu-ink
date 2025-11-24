'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { CreateUserDto, UpdateUserDto, Role } from '@/types/user';

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserDto | UpdateUserDto) => void;
  title: string;
  initialData?: Partial<CreateUserDto>;
  isEdit?: boolean;
}

export default function UserFormDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
  isEdit = false,
}: UserFormDialogProps) {
  const [formData, setFormData] = useState<CreateUserDto>({
    username: '',
    password: '',
    nickname: '',
    role: 'user' as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: initialData?.username || '',
        password: '',
        nickname: initialData?.nickname || '',
        role: (initialData?.role || 'user') as Role,
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少3个字符';
    }

    if (!isEdit) {
      if (!formData.password.trim()) {
        newErrors.password = '密码不能为空';
      } else if (formData.password.length < 6) {
        newErrors.password = '密码至少6个字符';
      }
    }

    if (!formData.nickname.trim()) {
      newErrors.nickname = '昵称不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserDto, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/72 backdrop-blur-3xl rounded-2xl border border-white/60 shadow-[0_20px_54px_rgba(15,23,42,0.16)] w-full max-w-md mx-4" // data-glow="true"
>
        <div className="flex items-center justify-between p-6 border-b border-white/30">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 backdrop-blur-xl bg-white/55 border border-white/45 hover:bg-white/78 transition-all duration-250"
          >
            <X className="h-4 w-4 text-slate-600" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              用户名
            </label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="请输入用户名"
              disabled={isEdit} // 编辑模式下不允许修改用户名
              className={cn(
                'backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] focus:bg-white/78 focus:border-white/60 focus:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250',
                errors.username ? 'border-red-500' : ''
              )}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username}</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                密码
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="请输入密码"
                className={cn(
                  'backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] focus:bg-white/78 focus:border-white/60 focus:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250',
                  errors.password ? 'border-red-500' : ''
                )}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-1">
              昵称
            </label>
            <Input
              id="nickname"
              type="text"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              placeholder="请输入昵称"
              className={cn(
                'backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] focus:bg-white/78 focus:border-white/60 focus:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250',
                errors.nickname ? 'border-red-500' : ''
              )}
            />
            {errors.nickname && (
              <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
              角色
            </label>
            <Select
              value={formData.role}
              onValueChange={(value: Role) => handleInputChange('role', value)}
            >
              <SelectTrigger className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 transition-all duration-250">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-white/85 border border-white/45">
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-linear-to-r from-[#28418A] to-[#3F66B0] text-white shadow-[0_12px_30px_rgba(40,65,138,0.32)] hover:shadow-[0_14px_32px_rgba(40,65,138,0.38)] hover:scale-[1.01] transition-all duration-250 border-0"
              // data-glow="true"
            >
              {isSubmitting ? '提交中...' : '确认'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
