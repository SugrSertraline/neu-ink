// apps/web/src/components/library/CreatePaperDialog.tsx
'use client';

import React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CreatePaperDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /**
   * 由父组件传入的保存函数：
   * 父组件可以在这里根据来源（管理员 / 个人）路由到不同接口
   */
  onSave: (
    payload:
      | { mode: 'manual'; data: FormDataState }
      | { mode: 'text'; text: string }
  ) => Promise<unknown>;
}

const initialFormData = {
  title: '',
  titleZh: '',
  authors: '',
  publication: '',
  year: '',
  doi: '',
  articleType: 'journal' as const,
  sciQuartile: '无' as const,
  casQuartile: '无' as const,
  ccfRank: '无' as const,
  impactFactor: '',
  tags: '',
  abstract: '',
  keywords: '',
};

type FormDataState = typeof initialFormData;

const glowButtonFilled =
  'rounded-xl bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 ' +
  'shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.36)] ' +
  'border border-white/70 focus-visible:ring-2 focus-visible:ring-[#4769b8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-[1px]';

const glowButtonGhost =
  'rounded-xl border border-white/70 bg-white/78 text-[#28418A] shadow-[0_12px_30px_rgba(40,65,138,0.18)] ' +
  'backdrop-blur-xl hover:bg-white/90 hover:text-[#263b78] focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const tabBase =
  'flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all rounded-xl border border-transparent';
const tabActive =
  'text-white border-white/70 bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 shadow-[0_16px_36px_rgba(40,65,138,0.30)]';
const tabInactive =
  'text-[#5c6aa2] border-white/60 bg-white/70 hover:bg-white/85 hover:text-[#2d407f] shadow-[0_10px_24px_rgba(40,65,138,0.14)]';

export default function CreatePaperDialog({
  open,
  onClose,
  onSuccess,
  onSave,
}: CreatePaperDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [pressing, setPressing] = React.useState(false);

  const [formData, setFormData] = React.useState<FormDataState>({ ...initialFormData });

  // 新增：创建模式（手动 / 文本）
  const [mode, setMode] = React.useState<'manual' | 'text'>('manual');
  const [textInput, setTextInput] = React.useState('');

  const triggerButtonPulse = React.useCallback(() => {
    if (pressing) return;
    setPressing(true);
    const timer = setTimeout(() => setPressing(false), 280);
    return () => clearTimeout(timer);
  }, [pressing]);

  const handleSubmit = async () => {
    triggerButtonPulse();
    setLoading(true);
    try {
      if (mode === 'manual') {
        await onSave({ mode: 'manual', data: formData });
      } else {
        await onSave({ mode: 'text', text: textInput });
      }
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('创建失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...initialFormData });
    setTextInput('');
    setMode('manual');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  const canSubmit =
    !loading &&
    (mode === 'manual'
      ? !!formData.title.trim()
      : !!textInput.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/10 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/45 bg-white/55 shadow-[0_28px_72px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-white/40 bg-white/50 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">新建论文</h2>
          <Button variant="ghost" size="icon" onClick={handleClose} className={cn(glowButtonGhost, 'h-9 w-9 p-0')}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* 新增：模式切换 Tab */}
        <div className="flex items-center gap-2 border-b border-white/40 bg-white/50 px-6 py-3">
          <button
            type="button"
            className={cn(tabBase, mode === 'manual' ? tabActive : tabInactive)}
            onClick={() => setMode('manual')}
          >
            手动录入
          </button>
          <button
            type="button"
            className={cn(tabBase, mode === 'text' ? tabActive : tabInactive)}
            onClick={() => setMode('text')}
          >
            文本导入
          </button>
        </div>

        <section className="max-h-[60vh] overflow-y-auto bg-white/45 px-6 py-6 backdrop-blur">
          {mode === 'manual' ? (
            <ManualForm formData={formData} setFormData={setFormData} />
          ) : (
            <TextForm text={textInput} onChange={setTextInput} />
          )}
        </section>

        <footer className="flex items-center justify-end gap-3 border-t border-white/40 bg-white/45 px-6 py-5">
          <Button variant="outline" onClick={handleClose} className={glowButtonGhost}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(glowButtonFilled, 'min-w-[110px]', pressing && 'animate-glow-press')}
            onAnimationEnd={event => event.currentTarget.classList.remove('animate-glow-press')}
          >
            {loading ? '创建中…' : mode === 'manual' ? '创建论文' : '从文本创建'}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function ManualForm({
  formData,
  setFormData,
}: {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900">基本信息</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="标题 *"
            placeholder="论文英文标题"
            value={formData.title}
            onChange={({ target }) => setFormData(prev => ({ ...prev, title: target.value }))}
          />
          <Field
            label="中文标题"
            placeholder="论文中文标题"
            value={formData.titleZh}
            onChange={({ target }) => setFormData(prev => ({ ...prev, titleZh: target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="作者 *"
            placeholder="作者姓名，用逗号分隔"
            value={formData.authors}
            onChange={({ target }) => setFormData(prev => ({ ...prev, authors: target.value }))}
          />
          <Field
            label="发表年份"
            placeholder="2024"
            type="number"
            value={formData.year}
            onChange={({ target }) => setFormData(prev => ({ ...prev, year: target.value }))}
          />
        </div>

        <Field
          label="发表期刊/会议"
          placeholder="Journal of Machine Learning Research"
          value={formData.publication}
          onChange={({ target }) => setFormData(prev => ({ ...prev, publication: target.value }))}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900">分类信息</h3>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SelectField
            label="文章类型"
            value={formData.articleType}
            options={[
              { value: 'journal', label: '期刊' },
              { value: 'conference', label: '会议' },
              { value: 'preprint', label: '预印本' },
              { value: 'book', label: '书籍' },
              { value: 'thesis', label: '论文' },
            ]}
            onChange={({ target }) =>
              setFormData(prev => ({ ...prev, articleType: target.value as typeof prev.articleType }))
            }
          />
          <SelectField
            label="SCI分区"
            value={formData.sciQuartile}
            options={['无', 'Q1', 'Q2', 'Q3', 'Q4'].map(item => ({ value: item, label: item }))}
            onChange={({ target }) =>
              setFormData(prev => ({ ...prev, sciQuartile: target.value as typeof prev.sciQuartile }))
            }
          />
          <SelectField
            label="中科院分区"
            value={formData.casQuartile}
            options={['无', '1区', '2区', '3区', '4区'].map(item => ({ value: item, label: item }))}
            onChange={({ target }) =>
              setFormData(prev => ({ ...prev, casQuartile: target.value as typeof prev.casQuartile }))
            }
          />
          <SelectField
            label="CCF分级"
            value={formData.ccfRank}
            options={['无', 'A', 'B', 'C'].map(item => ({ value: item, label: item }))}
            onChange={({ target }) =>
              setFormData(prev => ({ ...prev, ccfRank: target.value as typeof prev.ccfRank }))
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900">其他信息</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="DOI"
            placeholder="10.1000/journal.example"
            value={formData.doi}
            onChange={({ target }) => setFormData(prev => ({ ...prev, doi: target.value }))}
          />
          <Field
            label="影响因子"
            placeholder="4.532"
            type="number"
            step="0.001"
            value={formData.impactFactor}
            onChange={({ target }) => setFormData(prev => ({ ...prev, impactFactor: target.value }))}
          />
        </div>

        <Field
          label="标签"
          placeholder="机器学习, 深度学习, NLP"
          value={formData.tags}
          onChange={({ target }) => setFormData(prev => ({ ...prev, tags: target.value }))}
          helper="用逗号分隔多个标签"
        />
      </section>
    </div>
  );
}

function TextForm({
  text,
  onChange,
}: {
  text: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-slate-900">从文本创建</h3>
      <label className="block space-y-2" data-glow="true">
        <span className="text-sm font-medium text-slate-700">原始文本 *</span>
        <textarea
          placeholder="将论文的元数据或整段文本粘贴到这里（可包含标题、作者、期刊、DOI、摘要等）"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'min-h-[220px] w-full rounded-xl border border-white/70 bg-white/78 p-3 text-sm text-slate-700',
            'shadow-[0_12px_30px_rgba(40,65,138,0.16)]',
            'focus:ring-2 focus:ring-[#4769b8]/35 focus:ring-offset-1 focus:ring-offset-white'
          )}
        />
        <span className="block text-xs text-slate-500">
          支持粘贴 DOI/ BibTeX/ 引文/ 摘要等文本；具体解析与落库由上层传入的 onSave 决定。
        </span>
      </label>
    </div>
  );
}

function Field({
  label,
  helper,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; helper?: string }) {
  return (
    <label className="block space-y-2" data-glow="true">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Input
        {...props}
        className={cn(
          'h-11 rounded-xl border border-white/70 bg-white/78 text-sm text-slate-700',
          'shadow-[0_12px_30px_rgba(40,65,138,0.16)]',
          'focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
          props.className,
        )}
      />
      {helper ? <span className="block text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-2" data-glow="true">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        {...props}
        className={cn(
          'h-11 w-full rounded-xl border border-white/70 bg-white/78 px-3 text-sm text-slate-700',
          'shadow-[0_12px_30px_rgba(40,65,138,0.16)] transition-all',
          'focus:ring-2 focus:ring-[#4769b8]/35 focus:ring-offset-1 focus:ring-offset-white',
          props.className,
        )}
      >
        {options.map(({ value, label: optionLabel }) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
