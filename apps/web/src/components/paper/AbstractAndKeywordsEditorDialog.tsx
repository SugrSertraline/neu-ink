'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { FormEventHandler } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { userPaperService } from '@/lib/services/paper';
import {
  FileText,
  Globe,
  Plus,
  X,
  Hash,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface AbstractAndKeywordsFormState {
  abstractEn: string;
  abstractZh: string;
  keywords: string[];
}

export interface AbstractAndKeywordsEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abstract?: { en?: string; zh?: string };
  keywords?: string[];
  onSubmit: (abstract?: { en?: string; zh?: string }, keywords?: string[]) => void | Promise<void>;
  isSubmitting?: boolean;
  externalError?: string | null;
  userPaperId?: string;
  paperId?: string; // 兼容性保留，不使用
  autoSave?: boolean;
  autoSaveDelay?: number; // ms
}

const emptyKeyword = (): string => '';

const toFormState = (
  abstract?: { en?: string; zh?: string },
  keywords?: string[],
): AbstractAndKeywordsFormState => ({
  abstractEn: abstract?.en ?? '',
  abstractZh: abstract?.zh ?? '',
  keywords: keywords ? [...keywords] : [],
});

const validateForm = (
  form: AbstractAndKeywordsFormState,
): { ok: boolean; issues: string[]; result?: { abstract: { en?: string; zh?: string }; keywords: string[] } } => {
  const issues: string[] = [];
  const abstract = {
    en: form.abstractEn.trim() || undefined,
    zh: form.abstractZh.trim() || undefined,
  };
  const cleanedKeywords = form.keywords.map(k => k.trim()).filter(k => k.length > 0);
  return { ok: true, issues, result: { abstract, keywords: cleanedKeywords } };
};

// ==== Glass styles ====
const glowPanel =
  'relative rounded-2xl border border-white/70 bg-white/82 shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl';
const headerChip =
  'flex items-center justify-center w-10 h-10 rounded-xl border border-white/70 bg-white/80 shadow-[0_12px_30px_rgba(40,65,138,0.18)] backdrop-blur-xl';
const sectionBorder = 'border-white/60';
const glowButtonFilled =
  'rounded-xl bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.35)] border border-white/70 text-white';
const glowButtonGhostFilledBlue =
  'rounded-xl bg-[#3a4f9e]/90 hover:bg-[#304690]/95 shadow-[0_12px_30px_rgba(40,65,138,0.24)] border border-white/70 text-white';
const glowFieldBase =
  'rounded-xl border border-white/70 bg-white/80 text-slate-700 placeholder:text-slate-500 shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white';
const glowInput = `h-10 px-3.5 ${glowFieldBase}`;
const glowTextarea = `resize-none p-3.5 ${glowFieldBase}`;

export default function AbstractAndKeywordsEditorDialog({
  open,
  onOpenChange,
  abstract,
  keywords,
  onSubmit,
  isSubmitting,
  externalError,
  userPaperId,
  paperId,
  autoSave = false,
  autoSaveDelay = 2000,
}: AbstractAndKeywordsEditorDialogProps) {
  const [form, setForm] = useState<AbstractAndKeywordsFormState>(() => toFormState(abstract, keywords));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submittingError, setSubmittingError] = useState<string | null>(null);

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setForm(toFormState(abstract, keywords));
    setValidationErrors([]);
    setSubmittingError(null);
  }, [abstract, keywords]);

  useEffect(() => {
    setSubmittingError(externalError ?? null);
  }, [externalError]);

  const handleKeywordChange = (index: number, value: string) => {
    setForm(prev => {
      const nextKeywords = prev.keywords.map((k, i) => (i === index ? value : k));
      return { ...prev, keywords: nextKeywords };
    });
    debouncedAutoSave();
  };
  const handleAddKeyword = () => {
    setForm(prev => ({ ...prev, keywords: [...prev.keywords, emptyKeyword()] }));
    debouncedAutoSave();
  };
  const handleRemoveKeyword = (index: number) => {
    setForm(prev => {
      const nextKeywords = prev.keywords.filter((_, i) => i !== index);
      return { ...prev, keywords: nextKeywords };
    });
    debouncedAutoSave();
  };
  const handleBasicChange = (field: keyof AbstractAndKeywordsFormState, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    debouncedAutoSave();
  };

  const performAutoSave = useCallback(async () => {
    if (!autoSave || !userPaperId) return;
    const verdict = validateForm(form);
    if (!verdict.ok || !verdict.result) return;
    setIsAutoSaving(true);
    setAutoSaveError(null);
    try {
      const { abstract, keywords } = verdict.result;
      await userPaperService.updateUserPaper(userPaperId, { abstract, keywords });
      setLastAutoSaveTime(new Date());
    } catch (e: any) {
      setAutoSaveError(e?.message || '自动保存失败');
    } finally {
      setIsAutoSaving(false);
    }
  }, [form, autoSave, userPaperId]);

  const debouncedAutoSave = useCallback(() => {
    if (!autoSave || !userPaperId) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => performAutoSave(), autoSaveDelay);
  }, [performAutoSave, autoSave, userPaperId, autoSaveDelay]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  const handleCancel = () => onOpenChange(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const verdict = validateForm(form);
    if (!verdict.ok || !verdict.result) {
      setValidationErrors(verdict.issues);
      return;
    }
    setValidationErrors([]);
    setSubmittingError(null);
    try {
      const { abstract, keywords } = verdict.result;
      await Promise.resolve(onSubmit(abstract, keywords));
      onOpenChange(false);
    } catch (err: any) {
      setSubmittingError(err?.message || '保存失败，请稍后重试');
    }
  };

  const showErrors = validationErrors.length > 0 || submittingError;

  const AutoSaveIndicator = () => {
    if (!autoSave || !userPaperId) return null;
    if (isAutoSaving) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-[#28418A]">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          正在自动保存...
        </div>
      );
    }
    if (autoSaveError) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          自动保存失败: {autoSaveError}
        </div>
      );
    }
    if (lastAutoSaveTime) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle className="h-3.5 w-3.5" />
          已自动保存于 {lastAutoSaveTime.toLocaleTimeString()}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Clock className="h-3.5 w-3.5" /> 自动保存已启用
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-[820px] border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">编辑摘要和关键词</DialogTitle>
        <DialogDescription className="sr-only">
          摘要可能较长，本对话框采用单列布局并启用内部滚动。
        </DialogDescription>

        <div className="relative overflow-hidden rounded-2xl">
          {/* 背景光晕（不拦截事件） */}
          <div className="pointer-events-none absolute -inset-20 -z-10 bg-white/40 blur-3xl" />

          {/* 关键修复：固定高度 + min-h-0 */}
          <div className={`${glowPanel} h-[88vh] flex flex-col min-h-0`}>
            {/* 头部（固定） */}
            <div className={`flex items-start gap-3 px-6 pt-6 pb-4 border-b ${sectionBorder} relative z-10`}>
              <div className={headerChip}>
                <FileText className="h-5 w-5 text-[#28418A]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800">编辑摘要和关键词</h2>
                <p className="mt-1 text-sm text-slate-600">
                  单列（上下分栏）布局，正文区域可滚动。
                </p>
              </div>
            </div>

            {/* 表单整体：占满剩余空间，并允许子项缩放 */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* 可滚动内容区（关键：flex-1 + overflow-y-auto + min-h-0） */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 relative z-0">
                <div className="space-y-6">
                  {/* 摘要 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/60">
                      <FileText className="h-5 w-5 text-[#28418A]" />
                      <h3 className="text-lg font-semibold text-slate-800">摘要 / Abstract</h3>
                    </div>

                    {/* 英文摘要 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-500" />
                        <label className="text-sm font-medium text-slate-700">English Abstract</label>
                      </div>
                      <div className="relative">
                        <Textarea
                          value={form.abstractEn}
                          onChange={(e) => handleBasicChange('abstractEn', e.target.value)}
                          rows={6}
                          className={`${glowTextarea} pr-16`}
                          placeholder="Enter English abstract..."
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                          {form.abstractEn.length} 字符
                        </div>
                      </div>
                    </div>

                    {/* 中文摘要 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <label className="text-sm font-medium text-slate-700">中文摘要</label>
                      </div>
                      <div className="relative">
                        <Textarea
                          value={form.abstractZh}
                          onChange={(e) => handleBasicChange('abstractZh', e.target.value)}
                          rows={6}
                          className={`${glowTextarea} pr-16`}
                          placeholder="输入中文摘要..."
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-slate-500">
                          {form.abstractZh.length} 字符
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 关键词 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/60">
                      <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5 text-[#28418A]" />
                        <h3 className="text-lg font-semibold text-slate-800">关键词 / Keywords</h3>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddKeyword}
                        className={`${glowButtonGhostFilledBlue} h-9 px-3 text-sm gap-1`}
                      >
                        <Plus className="h-3.5 w-3.5" /> 添加关键词
                      </Button>
                    </div>

                    {form.keywords.length > 0 ? (
                      <div className="space-y-3">
                        {form.keywords.map((keyword, index) => (
                          <div key={`keyword-${index}`} className="flex items-center gap-2">
                            <Input
                              value={keyword}
                              onChange={(e) => handleKeywordChange(index, e.target.value)}
                              placeholder="输入关键词..."
                              className={`flex-1 ${glowInput}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => handleRemoveKeyword(index)}
                              className="rounded-xl border border-white/70 bg-white/80 p-0.5 shadow-[0_8px_20px_rgba(40,65,138,0.12)] hover:bg-white/90"
                              aria-label="删除关键词"
                            >
                              <X className="h-4 w-4 text-[#28418A]" />
                            </Button>
                          </div>
                        ))}
                        <div className="pt-2">
                          <p className="mb-2 text-xs text-slate-500">关键词预览:</p>
                          <div className="flex flex-wrap gap-2">
                            {form.keywords.filter(k => k.trim().length > 0).map((k, i) => (
                              <Badge
                                key={`preview-${i}`}
                                variant="outline"
                                className="group flex items-center gap-1 pr-1 rounded-full border-white/70 bg-white/80 text-[#28418A] text-xs shadow-[0_10px_26px_rgba(40,65,138,0.18)] backdrop-blur-xl"
                              >
                                <Hash className="h-3 w-3" />
                                {k}
                              </Badge>
                            ))}
                            {form.keywords.filter(k => k.trim().length > 0).length === 0 && (
                              <span className="text-xs italic text-slate-400">暂无有效关键词</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Hash className="mb-2 h-10 w-10 text-slate-300" />
                        <p className="mb-2 text-sm text-slate-500">暂无关键词</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddKeyword}
                          className={`${glowButtonGhostFilledBlue} h-9 px-3 text-sm gap-1`}
                        >
                          <Plus className="h-3.5 w-3.5" /> 添加第一个关键词
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 错误提示（随内容滚动） */}
                  {showErrors ? (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/90 p-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        {validationErrors.length ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {validationErrors.map(issue => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        ) : null}
                        {submittingError ? <p>{submittingError}</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 底部操作区（固定） */}
              <div className={`px-6 py-4 border-t ${sectionBorder} bg-white/82 backdrop-blur-2xl relative z-10`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AutoSaveIndicator />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className={`${glowButtonGhostFilledBlue} h-10 px-4 text-sm`}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={`${glowButtonFilled} h-10 px-4 text-sm gap-2`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" /> 保存摘要和关键词
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
