'use client';

import React, {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { PaperMetadata } from '@/types/paper';
import { userPaperService } from '@/lib/services/paper';
import { FileText, Plus, X, Hash } from 'lucide-react';

// ====== 类型定义 ======
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
  shortTitle: string;
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

interface MetadataEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: PaperMetadata;
  abstract?: { en?: string; zh?: string };
  keywords?: string[];
  onSubmit: (
    next: PaperMetadata,
    abstract?: { en?: string; zh?: string },
    keywords?: string[],
  ) => void | Promise<void>;
  isSubmitting?: boolean;
  externalError?: string | null;
  userPaperId?: string; // 用于自动保存
  paperId?: string; // 兼容保留（未使用）
  autoSave?: boolean;
  autoSaveDelay?: number;
}

// ====== 选项 ======
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

// ====== 工具函数 ======
const emptyAuthor = (): MetadataFormAuthor => ({ name: '', affiliation: '', email: '' });

const toFormState = (
  metadata: PaperMetadata,
  abstract?: { en?: string; zh?: string },
  keywords?: string[],
): MetadataFormState => ({
  title: metadata.title ?? '',
  titleZh: metadata.titleZh ?? '',
  shortTitle: metadata.shortTitle ?? '',
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
  impactFactor: typeof metadata.impactFactor === 'number' ? String(metadata.impactFactor) : '',
  tags: metadata.tags ? [...metadata.tags] : [],
  authors: metadata.authors.length
    ? metadata.authors.map(a => ({
      name: a.name ?? '',
      affiliation: a.affiliation ?? '',
      email: a.email ?? '',
    }))
    : [emptyAuthor()],
});

const toMetadata = (form: MetadataFormState): {
  metadata: PaperMetadata;
  abstract: { en?: string; zh?: string };
  keywords: string[];
} => {
  const validAuthors = form.authors
    .map(a => ({
      name: a.name.trim(),
      affiliation: a.affiliation.trim() || undefined,
      email: a.email.trim() || undefined,
    }))
    .filter(a => a.name.length > 0);

  const cleanedTags = form.tags.map(t => t.trim()).filter(Boolean);
  const cleanedKeywords = form.keywords.map(k => k.trim()).filter(Boolean);

  const yearStr = form.year.trim();
  const year = yearStr ? Number(yearStr) : undefined;

  const impactStr = form.impactFactor.trim();
  const impactFactor = impactStr ? Number(impactStr) : undefined;

  const abstract = {
    en: form.abstractEn.trim() || undefined,
    zh: form.abstractZh.trim() || undefined,
  };

  return {
    metadata: {
      title: form.title.trim(),
      titleZh: form.titleZh.trim() || undefined,
      shortTitle: form.shortTitle.trim() || undefined,
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
): {
  ok: boolean;
  issues: string[];
  result?: { metadata: PaperMetadata; abstract: { en?: string; zh?: string }; keywords: string[] };
} => {
  const issues: string[] = [];
  if (!form.title.trim()) issues.push('标题不能为空');

  const hasAuthor = form.authors.some(a => a.name.trim().length > 0);
  if (!hasAuthor) issues.push('请至少填写一位作者姓名');

  if (form.year.trim()) {
    const y = Number(form.year.trim());
    if (!Number.isFinite(y) || y < 1800 || y > 2200) issues.push('年份需要介于 1800-2200 之间');
  }
  if (form.impactFactor.trim()) {
    const val = Number(form.impactFactor.trim());
    if (!Number.isFinite(val) || val < 0) issues.push('影响因子必须是非负数字');
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, issues: [], result: toMetadata(form) };
};

// ====== 白色发光玻璃风格（与参考一致） ======
const glowPanel =
  'relative rounded-2xl border border-white/70 bg-white/82 shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl';
const headerChip =
  'flex items-center justify-center w-10 h-10 rounded-xl border border-white/70 bg-white/80 ' +
  'shadow-[0_12px_30px_rgba(40,65,138,0.18)] backdrop-blur-xl';
const sectionBorder = 'border-white/60';
const glowButtonFilled =
  'rounded-xl bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 ' +
  'shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.35)] ' +
  'border border-white/70 text-white';
const glowButtonGhostFilledBlue =
  'rounded-xl bg-[#3a4f9e]/90 hover:bg-[#304690]/95 ' +
  'shadow-[0_12px_30px_rgba(40,65,138,0.24)] border border-white/70 text-white';
const glowFieldBase =
  'rounded-xl border border-white/70 bg-white/80 text-slate-700 placeholder:text-slate-500 ' +
  'shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl ' +
  'focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white';
const glowInput = `h-10 px-3.5 ${glowFieldBase}`;
const glowTextarea = `resize-none p-3.5 ${glowFieldBase}`;
const glowSelect = `${glowInput}`;

// ====== 组件（合并编辑器与对话） ======
export default function MetadataEditorDialog({
  open,
  onOpenChange,
  metadata,
  abstract,
  keywords,
  onSubmit,
  isSubmitting,
  externalError,
  userPaperId,
  paperId, // 未使用，仅兼容
  autoSave = false,
  autoSaveDelay = 2000,
}: MetadataEditorDialogProps) {
  const [form, setForm] = useState<MetadataFormState>(() => toFormState(metadata, abstract, keywords));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submittingError, setSubmittingError] = useState<string | null>(null);

  // 自动保存
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 同步 props
  useEffect(() => {
    setForm(toFormState(metadata, abstract, keywords));
    setValidationErrors([]);
    setSubmittingError(null);
  }, [metadata, abstract, keywords]);

  useEffect(() => {
    setSubmittingError(externalError ?? null);
  }, [externalError]);

  // ====== 事件处理（与原逻辑一致） ======
  const handleBasicChange = (field: keyof MetadataFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleAuthorChange = (index: number, field: keyof MetadataFormAuthor, value: string) => {
    setForm(prev => {
      const next = prev.authors.map((a, i) => (i === index ? { ...a, [field]: value } : a));
      return { ...prev, authors: next };
    });
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleAddAuthor = () => {
    setForm(prev => ({ ...prev, authors: [...prev.authors, emptyAuthor()] }));
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleRemoveAuthor = (index: number) => {
    setForm(prev => {
      if (prev.authors.length === 1) return prev;
      return { ...prev, authors: prev.authors.filter((_, i) => i !== index) };
    });
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleTagChange = (index: number, value: string) => {
    setForm(prev => {
      const next = prev.tags.map((t, i) => (i === index ? value : t));
      return { ...prev, tags: next };
    });
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleAddTag = () => {
    setForm(prev => ({ ...prev, tags: [...prev.tags, ''] }));
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleRemoveTag = (index: number) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleKeywordChange = (index: number, value: string) => {
    setForm(prev => {
      const next = prev.keywords.map((k, i) => (i === index ? value : k));
      return { ...prev, keywords: next };
    });
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleAddKeyword = () => {
    setForm(prev => ({ ...prev, keywords: [...prev.keywords, ''] }));
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  const handleRemoveKeyword = (index: number) => {
    setForm(prev => ({ ...prev, keywords: prev.keywords.filter((_, i) => i !== index) }));
    if (autoSave && userPaperId) debouncedAutoSave();
  };

  // ====== 自动保存 ======
  const performAutoSave = useCallback(async () => {
    if (!autoSave || !userPaperId) return;
    const verdict = validateForm(form);
    if (!verdict.ok || !verdict.result) return;
    setIsAutoSaving(true);
    setAutoSaveError(null);
    try {
      const { metadata: m, abstract: ab, keywords: kw } = verdict.result;
      await userPaperService.updateUserPaper(userPaperId, {
        paperData: { metadata: m, abstract: ab, keywords: kw },
      });
      setLastAutoSaveTime(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : '自动保存失败';
      setAutoSaveError(message);
    } finally {
      setIsAutoSaving(false);
    }
  }, [form, autoSave, userPaperId]);

  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => performAutoSave(), autoSaveDelay);
  }, [performAutoSave, autoSaveDelay]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  // ====== 提交 & 取消 ======
  const handleFormSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();
    const verdict = validateForm(form);
    if (!verdict.ok || !verdict.result) {
      setValidationErrors(verdict.issues);
      return;
    }
    setValidationErrors([]);
    setSubmittingError(null);
    try {
      const { metadata: m, abstract: ab, keywords: kw } = verdict.result;
      await Promise.resolve(onSubmit(m, ab, kw));
      onOpenChange(false); // 与原对话包装器保持一致：提交成功关闭对话
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
      setSubmittingError(message);
    }
  };

  const handleCancel = () => onOpenChange(false);

  // ====== 其他 ======
  const authorCount = form.authors.length;
  const showErrors = validationErrors.length > 0 || submittingError;
  const hasTags = form.tags.length > 0;

  const quartileElements = useMemo(
    () => ({
      sci: sciQuartileOptions.map(op => (
        <option key={op} value={op}>
          {op}
        </option>
      )),
      cas: casQuartileOptions.map(op => (
        <option key={op} value={op}>
          {op}
        </option>
      )),
      ccf: ccfRankOptions.map(op => (
        <option key={op} value={op}>
          {op}
        </option>
      )),
    }),
    [],
  );

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
      return <div className="text-sm text-red-600">自动保存失败: {autoSaveError}</div>;
    }
    if (lastAutoSaveTime) {
      return (
        <div className="text-sm text-emerald-600">
          已自动保存于 {lastAutoSaveTime.toLocaleTimeString()}
        </div>
      );
    }
    return <div className="text-sm text-slate-500">自动保存已启用</div>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* DialogContent 外层透明，内部自绘白玻璃面板 */}
      <DialogContent className="w-[92vw] sm:max-w-[960px] border-none bg-transparent p-0 shadow-none">
        {/* a11y：Radix 要求存在 title/description（隐藏即可） */}
        <DialogTitle className="sr-only">编辑论文元数据</DialogTitle>
        <DialogDescription className="sr-only">
          在此编辑并保存论文元数据信息。
        </DialogDescription>

        <div className="relative overflow-hidden rounded-2xl">
          {/* 柔和白色光晕（不拦截事件） */}
          <div className="pointer-events-none absolute -inset-20 -z-10 bg-white/40 blur-3xl" />

          {/* 面板：固定高度、列布局，中间滚动，底部固定 */}
          <form onSubmit={handleFormSubmit} className={`${glowPanel} h-[88vh] flex flex-col min-h-0`}>
            {/* 顶部：固定 */}
            <div className={`flex items-start gap-3 px-6 pt-6 pb-4 border-b ${sectionBorder} relative z-10`}>
              <div className={headerChip}>
                <FileText className="h-5 w-5 text-[#28418A]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800">编辑论文元数据</h2>
                <p className="mt-1 text-sm text-slate-600">
                  修改完成后点击底部按钮保存；中间内容区域支持滚动浏览。
                </p>
              </div>
            </div>

            {/* 内容：可滚动 */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                {/* 标题（英文） */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">标题（英文）</label>
                  <textarea
                    value={form.title}
                    onChange={e => handleBasicChange('title', e.target.value)}
                    rows={2}
                    className={`mt-1 w-full ${glowTextarea}`}
                    placeholder="例如：Attention Is All You Need"
                  />
                </div>

                {/* 标题（中文） + 短标题 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">标题（中文）</label>
                    <input
                      value={form.titleZh}
                      onChange={e => handleBasicChange('titleZh', e.target.value)}
                      className={`mt-1 w-full ${glowInput}`}
                      placeholder="可选"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">短标题</label>
                    <input
                      value={form.shortTitle}
                      onChange={e => handleBasicChange('shortTitle', e.target.value)}
                      className={`mt-1 w-full ${glowInput}`}
                      placeholder="可选"
                    />
                  </div>
                </div>

                {/* 作者 */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">作者</label>
                    <button
                      type="button"
                      onClick={handleAddAuthor}
                      className={`${glowButtonGhostFilledBlue} h-9 px-3 text-sm flex items-center gap-1`}
                    >
                      <Plus className="h-3.5 w-3.5" /> 添加作者
                    </button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {form.authors.map((author, index) => (
                      <Fragment key={`author-${index}`}>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-[0_10px_26px_rgba(40,65,138,0.18)] backdrop-blur-xl">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-slate-600">姓名</label>
                              <input
                                value={author.name}
                                onChange={e => handleAuthorChange(index, 'name', e.target.value)}
                                className={`mt-1 w-full ${glowInput}`}
                                placeholder="必填"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-slate-600">单位</label>
                              <input
                                value={author.affiliation}
                                onChange={e => handleAuthorChange(index, 'affiliation', e.target.value)}
                                className={`mt-1 w-full ${glowInput}`}
                                placeholder="可选"
                              />
                            </div>
                            <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-slate-600">邮箱</label>
                              <div className="flex items-center gap-2">
                                <input
                                  value={author.email}
                                  onChange={e => handleAuthorChange(index, 'email', e.target.value)}
                                  className={`mt-1 w-full ${glowInput}`}
                                  placeholder="可选"
                                />
                                {authorCount > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAuthor(index)}
                                    className="mt-1 rounded-xl border border-white/70 bg-white/80 px-2 py-1 text-xs text-[#28418A] shadow-[0_8px_20px_rgba(40,65,138,0.12)] hover:bg-white/90"
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

                {/* 刊物 / 年份 / 日期 */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">发表刊物</label>
                    <input
                      value={form.publication}
                      onChange={e => handleBasicChange('publication', e.target.value)}
                      className={`mt-1 w-full ${glowInput}`}
                      placeholder="可选"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">年份</label>
                      <input
                        value={form.year}
                        onChange={e => handleBasicChange('year', e.target.value)}
                        className={`mt-1 w-full ${glowInput}`}
                        placeholder="例如 2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">发表日期</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={e => handleBasicChange('date', e.target.value)}
                        className={`mt-1 w-full ${glowInput}`}
                      />
                    </div>
                  </div>
                </div>

                {/* 分区 / 评级 / 因子 / DOI */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">文章类型</label>
                    <select
                      value={form.articleType}
                      onChange={e => handleBasicChange('articleType', e.target.value)}
                      className={`mt-1 w-full ${glowSelect}`}
                    >
                      {articleTypeOptions.map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">SCI 分区</label>
                    <select
                      value={form.sciQuartile}
                      onChange={e => handleBasicChange('sciQuartile', e.target.value)}
                      className={`mt-1 w-full ${glowSelect}`}
                    >
                      {quartileElements.sci}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">CAS 分区</label>
                    <select
                      value={form.casQuartile}
                      onChange={e => handleBasicChange('casQuartile', e.target.value)}
                      className={`mt-1 w-full ${glowSelect}`}
                    >
                      {quartileElements.cas}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">CCF 评级</label>
                    <select
                      value={form.ccfRank}
                      onChange={e => handleBasicChange('ccfRank', e.target.value)}
                      className={`mt-1 w-full ${glowSelect}`}
                    >
                      {quartileElements.ccf}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">影响因子</label>
                    <input
                      value={form.impactFactor}
                      onChange={e => handleBasicChange('impactFactor', e.target.value)}
                      className={`mt-1 w-full ${glowInput}`}
                      placeholder="可选，例如 6.23"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">DOI</label>
                    <input
                      value={form.doi}
                      onChange={e => handleBasicChange('doi', e.target.value)}
                      className={`mt-1 w-full ${glowInput}`}
                      placeholder="可选"
                    />
                  </div>
                </div>

                {/* 摘要 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">摘要 / Abstract</label>
                  <div className="mt-2 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">English Abstract</label>
                      <textarea
                        value={form.abstractEn}
                        onChange={e => handleBasicChange('abstractEn', e.target.value)}
                        rows={3}
                        className={`mt-1 w-full ${glowTextarea}`}
                        placeholder="Enter English abstract..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">中文摘要</label>
                      <textarea
                        value={form.abstractZh}
                        onChange={e => handleBasicChange('abstractZh', e.target.value)}
                        rows={3}
                        className={`mt-1 w-full ${glowTextarea}`}
                        placeholder="输入中文摘要..."
                      />
                    </div>
                  </div>
                </div>

                {/* 关键词 */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">关键词 / Keywords</label>
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className={`${glowButtonGhostFilledBlue} h-9 px-3 text-sm flex items-center gap-1`}
                    >
                      <Plus className="h-3.5 w-3.5" /> 添加关键词
                    </button>
                  </div>
                  {form.keywords.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {form.keywords.map((keyword, index) => (
                        <div key={`keyword-${index}`} className="flex items-center gap-2">
                          <input
                            value={keyword}
                            onChange={e => handleKeywordChange(index, e.target.value)}
                            className={`flex-1 ${glowInput}`}
                            placeholder="关键词内容"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(index)}
                            className="rounded-xl border border-white/70 bg-white/80 px-2 py-1 text-xs text-[#28418A] shadow-[0_8px_20px_rgba(40,65,138,0.12)] hover:bg-white/90"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                      {/* 关键词预览 */}
                      <div className="pt-2">
                        <p className="mb-2 text-xs text-slate-500">关键词预览:</p>
                        <div className="flex flex-wrap gap-2">
                          {form.keywords
                            .map(k => k.trim())
                            .filter(Boolean)
                            .map((k, i) => (
                              <span
                                key={`preview-${i}`}
                                className="group flex items-center gap-1 pr-1 rounded-full border border-white/70 bg-white/80 px-2 py-1 text-xs text-[#28418A] shadow-[0_10px_26px_rgba(40,65,138,0.18)] backdrop-blur-xl"
                              >
                                <Hash className="h-3 w-3" />
                                {k}
                              </span>
                            ))}
                          {form.keywords.map(k => k.trim()).filter(Boolean).length === 0 && (
                            <span className="text-xs italic text-slate-400">暂无有效关键词</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">暂无关键词</p>
                  )}
                </div>

                {/* 标签 */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">标签</label>
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className={`${glowButtonGhostFilledBlue} h-9 px-3 text-sm`}
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
                            onChange={e => handleTagChange(index, e.target.value)}
                            className={`flex-1 ${glowInput}`}
                            placeholder="标签内容"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(index)}
                            className="rounded-xl border border-white/70 bg-white/80 px-2 py-1 text-xs text-[#28418A] shadow-[0_8px_20px_rgba(40,65,138,0.12)] hover:bg-white/90"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">暂无标签</p>
                  )}
                </div>

                {/* 错误提示（随内容滚动） */}
                {showErrors ? (
                  <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/90 p-3 text-sm text-red-700">
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
              </div>
            </div>

            {/* 底部：固定（按钮始终靠右） */}
            <div className={`px-6 py-4 border-t ${sectionBorder} bg-white/82 backdrop-blur-2xl relative z-10`}>
              <div className="flex items-center gap-3">
                {/* 可选：左侧自动保存状态；不存在时按钮仍会靠右 */}
                <AutoSaveIndicator />

                {/* 关键：ml-auto 将按钮组推到最右侧 */}
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className={`${glowButtonGhostFilledBlue} h-10 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${glowButtonFilled} h-10 px-4 text-sm disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        保存中...
                      </span>
                    ) : (
                      '保存元数据'
                    )}
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
