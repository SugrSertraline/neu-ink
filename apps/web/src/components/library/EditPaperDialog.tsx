'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Tag, Clock, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { userPaperService } from '@/lib/services/paper';
import { isSuccess } from '@/lib/http';
import type { PersonalLibraryItem } from '@/lib/hooks/usePersonalLibraryController';

interface EditPaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paper: PersonalLibraryItem | null;
  onSuccess?: () => void;
}

/** ====== White glow styles (aligned with LibraryFilters.tsx) ====== */
const glowTrigger =
  'rounded-xl border border-white/70 bg-white/78 px-3.5 h-10 text-sm text-slate-700 ' +
  'shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl transition-all ' +
  'hover:bg-white/90 hover:shadow-[0_16px_40px_rgba(40,65,138,0.24)] focus:ring-2 focus:ring-[#4769b8]/35 ' +
  'data-[state=open]:border-white data-[state=open]:shadow-[0_18px_46px_rgba(40,65,138,0.3)]';

const glowContent =
  'rounded-xl border border-white/70 bg-white/92 text-sm shadow-[0_18px_46px_rgba(28,45,96,0.2)] ' +
  'backdrop-blur-3xl overflow-hidden';

const glowButtonFilled =
  'rounded-xl bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 ' +
  'shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.35)] ' +
  'border border-white/70 text-white';

const glowButtonGhostFilledBlue =
  'rounded-xl bg-[#3a4f9e]/90 hover:bg-[#304690]/95 ' +
  'shadow-[0_12px_30px_rgba(40,65,138,0.24)] border border-white/70 text-white';

const glowPanel =
  'relative rounded-2xl border border-white/70 bg-white/82 p-6 ' +
  'shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl';

const chipBase =
  'rounded-full px-2 py-1 text-xs border border-white/70 bg-white/80 text-[#28418A]';

/** 中性色白玻璃徽标 */
const READING_STATUS_OPTIONS = [
  { value: 'unread', label: '未开始', color: chipBase },
  { value: 'reading', label: '阅读中', color: chipBase },
  { value: 'finished', label: '已完成', color: chipBase },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高优先级', color: chipBase },
  { value: 'medium', label: '中优先级', color: chipBase },
  { value: 'low', label: '低优先级', color: chipBase },
];

export default function EditPaperDialog({
  open,
  onOpenChange,
  paper,
  onSuccess,
}: EditPaperDialogProps) {
  const [readingStatus, setReadingStatus] = useState<string>('unread');
  const [priority, setPriority] = useState<string>('medium');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 当论文数据变化时，更新表单状态
  useEffect(() => {
    if (paper) {
      setReadingStatus(paper.personalMeta.readingStatus);
      setPriority(paper.personalMeta.priority);
      setCustomTags([...paper.personalMeta.customTags]);
    }
  }, [paper]);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !customTags.includes(trimmedTag)) {
      setCustomTags([...customTags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!paper) return;

    setIsSubmitting(true);
    try {
      const updateData = {
        readingStatus: readingStatus as 'unread' | 'reading' | 'finished',
        priority: priority as 'high' | 'medium' | 'low',
        customTags,
      };

      // 由于整个论文更新接口已被移除，显示提示信息
      toast.error('更新功能已变更', {
        description: '论文信息更新功能已被移除，请使用具体的更新功能'
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络错误';
      toast.error(`更新失败：${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 白色发光玻璃风格 */}
      <DialogContent className="sm:max-w-[560px] border-none bg-transparent p-0 shadow-none">
        <div className="relative overflow-hidden rounded-2xl">
          {/* 柔和的白色光晕 */}
          <div className="pointer-events-none absolute -inset-20 -z-10 bg-white/40 blur-3xl" />

          {/* 玻璃面板 */}
          <div className={glowPanel}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <Flag className="h-5 w-5 text-[#28418A]" />
                编辑论文信息
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                快速修改论文的阅读状态、优先级和自定义标签
              </DialogDescription>
            </DialogHeader>

            {paper && (
              <div className="space-y-6 py-4">
                {/* 论文标题 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">论文标题</h4>
                  <p className="text-sm text-slate-900 truncate">{paper.paper.title}</p>
                </div>

                {/* 阅读状态 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock className="h-4 w-4 text-[#28418A]" />
                    阅读状态
                  </label>
                  <Select value={readingStatus} onValueChange={setReadingStatus}>
                    <SelectTrigger className={glowTrigger}>
                      <SelectValue placeholder="选择阅读状态" />
                    </SelectTrigger>
                    <SelectContent className={glowContent} position="popper">
                      {READING_STATUS_OPTIONS.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="focus:bg-white/90 focus:text-[#28418A]"
                        >
                          <div className="flex items-center gap-2">
                            <span className={option.color}>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 优先级 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Flag className="h-4 w-4 text-[#28418A]" />
                    优先级
                  </label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className={glowTrigger}>
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent className={glowContent} position="popper">
                      {PRIORITY_OPTIONS.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="focus:bg-white/90 focus:text-[#28418A]"
                        >
                          <div className="flex items-center gap-2">
                            <span className={option.color}>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 自定义标签 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Tag className="h-4 w-4 text-[#28418A]" />
                    自定义标签
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入标签后按回车添加"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 h-10 rounded-xl border border-white/70 bg-white/80 text-slate-700 placeholder:text-slate-500 shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      className={`${glowButtonGhostFilledBlue} h-10 px-4 text-sm`}
                    >
                      添加
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {customTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="group flex items-center gap-1 pr-1 rounded-full border-white/70 bg-white/80 text-[#28418A] text-xs shadow-[0_10px_26px_rgba(40,65,138,0.18)] backdrop-blur-xl"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 rounded-xl border border-white/70 bg-white/80 p-0.5 shadow-[0_8px_20px_rgba(40,65,138,0.12)] hover:bg-white/90"
                        >
                          <X className="h-3 w-3 text-[#28418A]" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-2">
              {/* 注意：两个按钮文字均为白色 */}
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className={`${glowButtonGhostFilledBlue} h-10 px-4 text-sm`}
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !paper}
                className={`${glowButtonFilled} h-10 px-4 text-sm`}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存更改
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
