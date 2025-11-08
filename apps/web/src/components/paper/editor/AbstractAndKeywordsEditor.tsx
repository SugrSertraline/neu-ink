'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';

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
        <div className="text-sm text-blue-600 dark:text-blue-400">
          正在自动保存...
        </div>
      );
    }
    
    if (autoSaveError) {
      return (
        <div className="text-sm text-red-600 dark:text-red-400">
          自动保存失败: {autoSaveError}
        </div>
      );
    }
    
    if (lastAutoSaveTime) {
      const timeStr = lastAutoSaveTime.toLocaleTimeString();
      return (
        <div className="text-sm text-green-600 dark:text-green-400">
          已自动保存于 {timeStr}
        </div>
      );
    }
    
    return (
      <div className="text-sm text-gray-500 dark:text-slate-400">
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
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              摘要 / Abstract
            </label>
          </div>
          <div className="mt-2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                English Abstract
              </label>
              <textarea
                value={form.abstractEn}
                onChange={event => handleBasicChange('abstractEn', event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                placeholder="Enter English abstract..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                中文摘要
              </label>
              <textarea
                value={form.abstractZh}
                onChange={event => handleBasicChange('abstractZh', event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                placeholder="输入中文摘要..."
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              关键词 / Keywords
            </label>
            <button
              type="button"
              onClick={handleAddKeyword}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              添加关键词
            </button>
          </div>
          {form.keywords.length > 0 ? (
            <div className="mt-2 space-y-2">
              {form.keywords.map((keyword, index) => (
                <div key={`keyword-${index}`} className="flex items-center gap-2">
                  <input
                    value={keyword}
                    onChange={event => handleKeywordChange(index, event.target.value)}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                    placeholder="关键词内容"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(index)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">暂无关键词</p>
          )}
        </div>
      </div>

      {showErrors ? (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100">
          {validationErrors.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {validationErrors.map(issue => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {submittingError ? <p>{submittingError}</p> : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <AutoSaveIndicator />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '保存中...' : '保存摘要和关键词'}
          </button>
        </div>
      </div>
    </form>
  );
}