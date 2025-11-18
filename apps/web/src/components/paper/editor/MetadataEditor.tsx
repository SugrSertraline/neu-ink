'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { PaperMetadata } from '@/types/paper';
import { userPaperService } from '@/lib/services/paper';

type ArticleTypeOption = NonNullable<PaperMetadata['articleType']> | '';
type QuartileOption = NonNullable<PaperMetadata['sciQuartile']>;
type CasQuartileOption = NonNullable<PaperMetadata['casQuartile']>;
type CcfRankOption = NonNullable<PaperMetadata['ccfRank']>;

interface MetadataFormAuthor {
  name: string;
  affiliation: string;
  email: string;
}

interface MetadataFormState {
  title: string;
  titleZh: string;
  abstractEn: string;
  abstractZh: string;
  keywords: string[];
  publication: string;
  year: string;
  date: string;
  doi: string;
  articleType: ArticleTypeOption;
  sciQuartile: QuartileOption;
  casQuartile: CasQuartileOption;
  ccfRank: CcfRankOption;
  impactFactor: string;
  tags: string[];
  authors: MetadataFormAuthor[];
}

interface MetadataEditorProps {
  initialValue: PaperMetadata;
  initialAbstract?: {
    en?: string;
    zh?: string;
  };
  initialKeywords?: string[];
  onSubmit: (next: PaperMetadata, abstract?: { en?: string; zh?: string }, keywords?: string[]) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  externalError?: string | null;
  appearance?: 'card' | 'plain';
  // 新增自动保存相关属性
  userPaperId?: string; // 个人论文 ID，用于自动保存
  autoSave?: boolean; // 是否启用自动保存
  autoSaveDelay?: number; // 自动保存延迟时间（毫秒）
}

const articleTypeOptions: { value: ArticleTypeOption; label: string }[] = [
  { value: '', label: '未指定' },
  { value: 'journal', label: '期刊文章' },
  { value: 'conference', label: '会议论文' },
  { value: 'preprint', label: '预印本' },
  { value: 'book', label: '书籍章节' },
  { value: 'thesis', label: '学位论文' },
];

const sciQuartileOptions: QuartileOption[] = ['无', 'Q1', 'Q2', 'Q3', 'Q4'];
const casQuartileOptions: CasQuartileOption[] = ['无', '1区', '2区', '3区', '4区'];
const ccfRankOptions: CcfRankOption[] = ['无', 'A', 'B', 'C'];

const emptyAuthor = (): MetadataFormAuthor => ({
  name: '',
  affiliation: '',
  email: '',
});

const toFormState = (metadata: PaperMetadata, abstract?: { en?: string; zh?: string }, keywords?: string[]): MetadataFormState => ({
  title: metadata.title ?? '',
  titleZh: metadata.titleZh ?? '',
  abstractEn: abstract?.en ?? '',
  abstractZh: abstract?.zh ?? '',
  keywords: keywords ? [...keywords] : [],
  publication: metadata.publication ?? '',
  year: metadata.year != null ? String(metadata.year) : '',
  date: metadata.date ?? '',
  doi: metadata.doi ?? '',
  articleType: metadata.articleType ?? '',
  sciQuartile: metadata.sciQuartile ?? '无',
  casQuartile: metadata.casQuartile ?? '无',
  ccfRank: metadata.ccfRank ?? '无',
  impactFactor:
    typeof metadata.impactFactor === 'number' ? String(metadata.impactFactor) : '',
  tags: metadata.tags ? [...metadata.tags] : [],
  authors: metadata.authors.length
    ? metadata.authors.map(author => ({
        name: author.name ?? '',
        affiliation: author.affiliation ?? '',
        email: author.email ?? '',
      }))
    : [emptyAuthor()],
});

const toMetadata = (form: MetadataFormState): { metadata: PaperMetadata; abstract: { en?: string; zh?: string }; keywords: string[] } => {
  const validAuthors = form.authors
    .map(author => ({
      name: author.name.trim(),
      affiliation: author.affiliation.trim() || undefined,
      email: author.email.trim() || undefined,
    }))
    .filter(author => author.name.length > 0);

  const cleanedTags = form.tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  const cleanedKeywords = form.keywords
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0);

  const parsedYear = form.year.trim();
  const year = parsedYear ? Number(parsedYear) : undefined;

  const parsedImpact = form.impactFactor.trim();
  const impactFactor = parsedImpact ? Number(parsedImpact) : undefined;

  const abstract = {
    en: form.abstractEn.trim() || undefined,
    zh: form.abstractZh.trim() || undefined,
  };

  return {
    metadata: {
      title: form.title.trim(),
      titleZh: form.titleZh.trim() || undefined,
      authors: validAuthors,
      publication: form.publication.trim() || undefined,
      year,
      date: form.date.trim() || undefined,
      doi: form.doi.trim() || undefined,
      articleType: (form.articleType || undefined) as PaperMetadata['articleType'],
      sciQuartile: form.sciQuartile,
      casQuartile: form.casQuartile,
      ccfRank: form.ccfRank,
      impactFactor,
      tags: cleanedTags,
    },
    abstract,
    keywords: cleanedKeywords,
  };
};

const validateForm = (
  form: MetadataFormState,
): { ok: boolean; issues: string[]; result?: { metadata: PaperMetadata; abstract: { en?: string; zh?: string }; keywords: string[] } } => {
  const issues: string[] = [];
  const title = form.title.trim();
  if (!title) {
    issues.push('标题不能为空');
  }

  const hasAuthor = form.authors.some(author => author.name.trim().length > 0);
  if (!hasAuthor) {
    issues.push('请至少填写一位作者姓名');
  }

  if (form.year.trim()) {
    const yearValue = Number(form.year.trim());
    if (!Number.isFinite(yearValue) || yearValue < 1800 || yearValue > 2200) {
      issues.push('年份需要介于 1800-2200 之间');
    }
  }

  if (form.impactFactor.trim()) {
    const value = Number(form.impactFactor.trim());
    if (!Number.isFinite(value) || value < 0) {
      issues.push('影响因子必须是非负数字');
    }
  }

  if (issues.length) {
    return { ok: false, issues };
  }

  return { ok: true, issues: [], result: toMetadata(form) };
};

export default function MetadataEditor({
  initialValue,
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
}: MetadataEditorProps) {
  const [form, setForm] = useState<MetadataFormState>(() => toFormState(initialValue, initialAbstract, initialKeywords));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submittingError, setSubmittingError] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setForm(toFormState(initialValue, initialAbstract, initialKeywords));
    setValidationErrors([]);
    setSubmittingError(null);
  }, [initialValue, initialAbstract, initialKeywords]);

  useEffect(() => {
    setSubmittingError(externalError ?? null);
  }, [externalError]);

  const authorCount = form.authors.length;

  const handleAuthorChange = (index: number, field: keyof MetadataFormAuthor, value: string) => {
      setForm(prev => {
        const nextAuthors = prev.authors.map((author, idx) =>
          idx === index ? { ...author, [field]: value } : author,
        );
        return { ...prev, authors: nextAuthors };
      });
      if (autoSave && userPaperId) {
        debouncedAutoSave();
      }
    };
  
    const handleRemoveAuthor = (index: number) => {
      setForm(prev => {
        if (prev.authors.length === 1) {
          return prev;
        }
        const nextAuthors = prev.authors.filter((_, idx) => idx !== index);
        return { ...prev, authors: nextAuthors };
      });
      if (autoSave && userPaperId) {
        debouncedAutoSave();
      }
    };
  
    const handleAddAuthor = () => {
      setForm(prev => ({ ...prev, authors: [...prev.authors, emptyAuthor()] }));
      if (autoSave && userPaperId) {
        debouncedAutoSave();
      }
    };
  
    const handleTagChange = (index: number, value: string) => {
      setForm(prev => {
        const nextTags = prev.tags.map((tag, idx) => (idx === index ? value : tag));
        return { ...prev, tags: nextTags };
      });
      if (autoSave && userPaperId) {
        debouncedAutoSave();
      }
    };
  
    const handleAddTag = () => {
      setForm(prev => ({ ...prev, tags: [...prev.tags, ''] }));
      if (autoSave && userPaperId) {
        debouncedAutoSave();
      }
    };
  
    const handleRemoveTag = (index: number) => {
      setForm(prev => {
        const nextTags = prev.tags.filter((_, idx) => idx !== index);
        return { ...prev, tags: nextTags };
      });
      if (autoSave && userPaperId) {
        debouncedAutoSave();
      }
    };
  
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
      setForm(prev => ({ ...prev, keywords: [...prev.keywords, ''] }));
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
  
    const handleBasicChange = (field: keyof MetadataFormState, value: string) => {
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
        const { metadata, abstract, keywords } = verdict.result;
        
        // 调用用户论文更新接口
        await userPaperService.updateUserPaper(userPaperId, {
          metadata,
          abstract,
          keywords,
        });
        
        setLastAutoSaveTime(new Date());
      } catch (err) {
        const message = err instanceof Error ? err.message : '自动保存失败';
        setAutoSaveError(message);
        // 静默处理自动保存错误
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
      const { metadata, abstract, keywords } = verdict.result;
      await Promise.resolve(onSubmit(metadata, abstract, keywords));
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
      setSubmittingError(message);
    }
  };

  const showErrors = validationErrors.length > 0 || submittingError;
  
    const hasTags = form.tags.length > 0;
  
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

  const quartileElements = useMemo(
    () => ({
      sci: sciQuartileOptions.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      )),
      cas: casQuartileOptions.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      )),
      ccf: ccfRankOptions.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      )),
    }),
    [],
  );

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
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
            标题（英文）
          </label>
          <textarea
            value={form.title}
            onChange={event => handleBasicChange('title', event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            placeholder="例如：Attention Is All You Need"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
            标题（中文）
          </label>
          <input
            value={form.titleZh}
            onChange={event => handleBasicChange('titleZh', event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            placeholder="可选"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              作者
            </label>
            <button
              type="button"
              onClick={handleAddAuthor}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              添加作者
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {form.authors.map((author, index) => (
              <Fragment key={`author-${index}`}>
                <div className="rounded-md border border-gray-200 p-3 dark:border-slate-700">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                        姓名
                      </label>
                      <input
                        value={author.name}
                        onChange={event =>
                          handleAuthorChange(index, 'name', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                        placeholder="必填"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                        单位
                      </label>
                      <input
                        value={author.affiliation}
                        onChange={event =>
                          handleAuthorChange(index, 'affiliation', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                        placeholder="可选"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                        邮箱
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          value={author.email}
                          onChange={event =>
                            handleAuthorChange(index, 'email', event.target.value)
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                          placeholder="可选"
                        />
                        {authorCount > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAuthor(index)}
                            className="mt-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              发表刊物
            </label>
            <input
              value={form.publication}
              onChange={event => handleBasicChange('publication', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              placeholder="可选"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                年份
              </label>
              <input
                value={form.year}
                onChange={event => handleBasicChange('year', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                placeholder="例如 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                发表日期
              </label>
              <input
                type="date"
                value={form.date}
                onChange={event => handleBasicChange('date', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              文章类型
            </label>
            <select
              value={form.articleType}
              onChange={event => handleBasicChange('articleType', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            >
              {articleTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              SCI 分区
            </label>
            <select
              value={form.sciQuartile}
              onChange={event => handleBasicChange('sciQuartile', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            >
              {quartileElements.sci}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              CAS 分区
            </label>
            <select
              value={form.casQuartile}
              onChange={event => handleBasicChange('casQuartile', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            >
              {quartileElements.cas}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              CCF 评级
            </label>
            <select
              value={form.ccfRank}
              onChange={event => handleBasicChange('ccfRank', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            >
              {quartileElements.ccf}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              影响因子
            </label>
            <input
              value={form.impactFactor}
              onChange={event =>
                handleBasicChange('impactFactor', event.target.value)
              }
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              placeholder="可选，例如 6.23"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              DOI
            </label>
            <input
              value={form.doi}
              onChange={event => handleBasicChange('doi', event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              placeholder="可选"
            />
          </div>
        </div>

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

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
              标签
            </label>
            <button
              type="button"
              onClick={handleAddTag}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              添加标签
            </button>
          </div>
          {hasTags ? (
            <div className="mt-2 space-y-2">
              {form.tags.map((tag, index) => (
                <div key={`tag-${index}`} className="flex items-center gap-2">
                  <input
                    value={tag}
                    onChange={event => handleTagChange(index, event.target.value)}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                    placeholder="标签内容"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">暂无标签</p>
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
                  {isSubmitting ? '保存中...' : '保存元数据'}
                </button>
              </div>
            </div>
    </form>
  );
}
