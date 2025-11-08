'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import { FileText, Globe, Plus, X, Hash, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AbstractAndKeywordsFormState {
  abstractEn: string;
  abstractZh: string;
  keywords: string[];
}

interface AbstractAndKeywordsEditorProps {
  initialAbstract?: {
    en?: string;
    zh?: string;
  };
  initialKeywords?: string[];
  onSubmit: (abstract?: { en?: string; zh?: string }, keywords?: string[]) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  externalError?: string | null;
  appearance?: 'card' | 'plain';
  // 新增自动保存相关属性
  userPaperId?: string; // 个人论文 ID，用于自动保存
  autoSave?: boolean; // 是否启用自动保存
  autoSaveDelay?: number; // 自动保存延迟时间（毫秒）
}

const emptyKeyword = (): string => '';

const toFormState = (abstract?: { en?: string; zh?: string }, keywords?: string[]): AbstractAndKeywordsFormState => ({
  abstractEn: abstract?.en ?? '',
  abstractZh: abstract?.zh ?? '',
  keywords: keywords ? [...keywords] : [],
});

const validateForm = (
  form: AbstractAndKeywordsFormState,
): { ok: boolean; issues: string[]; result?: { abstract: { en?: string; zh?: string }; keywords: string[] } } => {
  const issues: string[] = [];
  
  // 这里可以添加验证逻辑，目前摘要和关键词都是可选的
  
  if (issues.length) {
    return { ok: false, issues };
  }

  const abstract = {
    en: form.abstractEn.trim() || undefined,
    zh: form.abstractZh.trim() || undefined,
  };

  const cleanedKeywords = form.keywords
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0);

  return { ok: true, issues: [], result: { abstract, keywords: cleanedKeywords } };
};

export default function AbstractAndKeywordsEditor({
  initialAbstract,
  initialKeywords,
  onSubmit,
  onCancel,
  isSubmitting,
  externalError,
  appearance = 'card',
  userPaperId,
  autoSave = false,
  autoSaveDelay = 2000,
}: AbstractAndKeywordsEditorProps) {
  const [form, setForm] = useState<AbstractAndKeywordsFormState>(() => toFormState(initialAbstract, initialKeywords));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submittingError, setSubmittingError] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setForm(toFormState(initialAbstract, initialKeywords));
    setValidationErrors([]);
    setSubmittingError(null);
  }, [initialAbstract, initialKeywords]);

  useEffect(() => {
    setSubmittingError(externalError ?? null);
  }, [externalError]);

  const handleKeywordChange = (index: number, value: string) => {
    setForm(prev => {
      const nextKeywords = prev.keywords.map((keyword, idx) => (idx === index ? value : keyword));
      return { ...prev, keywords: nextKeywords };
    });
    if (autoSave && userPaperId) {
      debouncedAutoSave();
    }
  };

  const handleAddKeyword = () => {
    setForm(prev => ({ ...prev, keywords: [...prev.keywords, emptyKeyword()] }));
    if (autoSave && userPaperId) {
      debouncedAutoSave();
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setForm(prev => {
      const nextKeywords = prev.keywords.filter((_, idx) => idx !== index);
      return { ...prev, keywords: nextKeywords };
    });
    if (autoSave && userPaperId) {
      debouncedAutoSave();
    }
  };

  const handleBasicChange = (field: keyof AbstractAndKeywordsFormState, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (autoSave && userPaperId) {
      debouncedAutoSave();
    }
  };

  // 自动保存函数
  const performAutoSave = useCallback(async () => {
    if (!autoSave || !userPaperId) return;
    
    const verdict = validateForm(form);
    if (!verdict.ok || !verdict.result) {
      return; // 表单验证失败时不保存
    }

    setIsAutoSaving(true);
    setAutoSaveError(null);

    try {
      const { abstract, keywords } = verdict.result;
      
      // 这里可以调用自动保存API
      // await userPaperService.updateUserPaper(userPaperId, {
      //   paperData: {
      //     abstract,
      //     keywords,
      //   },
      // });
      
      setLastAutoSaveTime(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : '自动保存失败';
      setAutoSaveError(message);
      console.error('Auto save failed:', err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [form, autoSave, userPaperId]);

  // 防抖自动保存
  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, autoSaveDelay);
  }, [performAutoSave, autoSaveDelay]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
      setSubmittingError(message);
    }
  };

  const showErrors = validationErrors.length > 0 || submittingError;

  // 自动保存提示信息
  const AutoSaveIndicator = () => {
    if (!autoSave || !userPaperId) return null;
    
    if (isAutoSaving) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          正在自动保存...
        </div>
      );
    }
    
    if (autoSaveError) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          自动保存失败: {autoSaveError}
        </div>
      );
    }
    
    if (lastAutoSaveTime) {
      const timeStr = lastAutoSaveTime.toLocaleTimeString();
      return (
        <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          已自动保存于 {timeStr}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        自动保存已启用
      </div>
    );
  };

  const formClassName =
    appearance === 'card'
      ? 'space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900'
      : 'space-y-6';

  return (
    <form
      onSubmit={handleSubmit}
      className={formClassName}
    >
      <div className="space-y-6">
        {/* 摘要部分 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-slate-700">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              摘要 / Abstract
            </h3>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* 英文摘要 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  English Abstract
                </label>
              </div>
              <div className="relative">
                <Textarea
                  value={form.abstractEn}
                  onChange={event => handleBasicChange('abstractEn', event.target.value)}
                  rows={6}
                  className="resize-none pr-16"
                  placeholder="Enter English abstract..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-slate-400">
                  {form.abstractEn.length} 字符
                </div>
              </div>
            </div>
            
            {/* 中文摘要 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  中文摘要
                </label>
              </div>
              <div className="relative">
                <Textarea
                  value={form.abstractZh}
                  onChange={event => handleBasicChange('abstractZh', event.target.value)}
                  rows={6}
                  className="resize-none pr-16"
                  placeholder="输入中文摘要..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-slate-400">
                  {form.abstractZh.length} 字符
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 关键词部分 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                关键词 / Keywords
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddKeyword}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              添加关键词
            </Button>
          </div>
          
          {form.keywords.length > 0 ? (
            <div className="space-y-3">
              {form.keywords.map((keyword, index) => (
                <div key={`keyword-${index}`} className="flex items-center gap-2">
                  <Input
                    value={keyword}
                    onChange={event => handleKeywordChange(index, event.target.value)}
                    placeholder="输入关键词..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleRemoveKeyword(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              
              {/* 关键词预览标签 */}
              <div className="pt-2">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">关键词预览:</p>
                <div className="flex flex-wrap gap-2">
                  {form.keywords
                    .filter(keyword => keyword.trim().length > 0)
                    .map((keyword, index) => (
                      <Badge key={`preview-${index}`} variant="secondary" className="gap-1">
                        <Hash className="h-3 w-3" />
                        {keyword}
                      </Badge>
                    ))}
                  {form.keywords.filter(keyword => keyword.trim().length > 0).length === 0 && (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">
                      暂无有效关键词
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Hash className="h-10 w-10 text-gray-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">暂无关键词</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddKeyword}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                添加第一个关键词
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {showErrors ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
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

      {/* 底部操作区 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <AutoSaveIndicator />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                保存中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                保存摘要和关键词
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}