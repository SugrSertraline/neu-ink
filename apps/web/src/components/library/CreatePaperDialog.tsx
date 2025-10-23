'use client';

import React from 'react';
import { X, Plus, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CreatePaperDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreatePaperDialog({
  open,
  onClose,
  onSuccess,
}: CreatePaperDialogProps) {
  const [activeTab, setActiveTab] = React.useState<'manual' | 'markdown'>('manual');
  const [loading, setLoading] = React.useState(false);

  // 手动创建表单状态
  const [formData, setFormData] = React.useState({
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
  });

  // Markdown文件上传状态
  const [markdownFile, setMarkdownFile] = React.useState<File | null>(null);
  const [markdownMeta, setMarkdownMeta] = React.useState({
    title: '',
    authors: '',
    year: '',
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (activeTab === 'manual') {
        // 处理手动创建
        console.log('手动创建论文:', formData);
        // 这里调用API创建论文
      } else {
        // 处理Markdown上传
        console.log('上传Markdown:', { file: markdownFile, meta: markdownMeta });
        // 这里调用API上传Markdown
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('创建失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      titleZh: '',
      authors: '',
      publication: '',
      year: '',
      doi: '',
      articleType: 'journal',
      sciQuartile: '无',
      casQuartile: '无',
      ccfRank: '无',
      impactFactor: '',
      tags: '',
      abstract: '',
      keywords: '',
    });
    setMarkdownFile(null);
    setMarkdownMeta({ title: '', authors: '', year: '' });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            新建论文
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab切换 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Plus className="w-4 h-4 inline-block mr-2" />
            手动创建
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'markdown'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-2" />
            Markdown上传
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">基本信息</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      标题 *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="论文英文标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      中文标题
                    </label>
                    <Input
                      value={formData.titleZh}
                      onChange={(e) => setFormData({ ...formData, titleZh: e.target.value })}
                      placeholder="论文中文标题"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      作者 *
                    </label>
                    <Input
                      value={formData.authors}
                      onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                      placeholder="作者姓名，用逗号分隔"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      发表年份
                    </label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="2024"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    发表期刊/会议
                  </label>
                  <Input
                    value={formData.publication}
                    onChange={(e) => setFormData({ ...formData, publication: e.target.value })}
                    placeholder="Journal of Machine Learning Research"
                  />
                </div>
              </div>

              {/* 分类信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">分类信息</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      文章类型
                    </label>
                    <select
                      value={formData.articleType}
                      onChange={(e) => setFormData({ ...formData, articleType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="journal">期刊</option>
                      <option value="conference">会议</option>
                      <option value="preprint">预印本</option>
                      <option value="book">书籍</option>
                      <option value="thesis">论文</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SCI分区
                    </label>
                    <select
                      value={formData.sciQuartile}
                      onChange={(e) => setFormData({ ...formData, sciQuartile: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="无">无</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      中科院分区
                    </label>
                    <select
                      value={formData.casQuartile}
                      onChange={(e) => setFormData({ ...formData, casQuartile: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="无">无</option>
                      <option value="1区">1区</option>
                      <option value="2区">2区</option>
                      <option value="3区">3区</option>
                      <option value="4区">4区</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CCF分级
                    </label>
                    <select
                      value={formData.ccfRank}
                      onChange={(e) => setFormData({ ...formData, ccfRank: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    >
                      <option value="无">无</option>
                      <option value="A">A类</option>
                      <option value="B">B类</option>
                      <option value="C">C类</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 其他信息 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">其他信息</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      DOI
                    </label>
                    <Input
                      value={formData.doi}
                      onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                      placeholder="10.1000/journal.example"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      影响因子
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.impactFactor}
                      onChange={(e) => setFormData({ ...formData, impactFactor: e.target.value })}
                      placeholder="4.532"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    标签
                  </label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="机器学习, 深度学习, NLP"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    用逗号分隔多个标签
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="space-y-6">
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  上传Markdown文件
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  支持.md文件，系统将自动解析论文内容
                </p>
                <input
                  type="file"
                  accept=".md,.markdown"
                  onChange={(e) => setMarkdownFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="markdown-upload"
                />
                <label
                  htmlFor="markdown-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  选择文件
                </label>
              </div>

              {markdownFile && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 dark:text-green-400">
                      已选择: {markdownFile.name}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      补充信息（可选）
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          标题
                        </label>
                        <Input
                          value={markdownMeta.title}
                          onChange={(e) => setMarkdownMeta({ ...markdownMeta, title: e.target.value })}
                          placeholder="如果Markdown中没有标题"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          作者
                        </label>
                        <Input
                          value={markdownMeta.authors}
                          onChange={(e) => setMarkdownMeta({ ...markdownMeta, authors: e.target.value })}
                          placeholder="作者姓名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          年份
                        </label>
                        <Input
                          type="number"
                          value={markdownMeta.year}
                          onChange={(e) => setMarkdownMeta({ ...markdownMeta, year: e.target.value })}
                          placeholder="2024"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (activeTab === 'manual' && !formData.title) || (activeTab === 'markdown' && !markdownFile)}
            className="min-w-[100px]"
          >
            {loading ? '创建中...' : '创建论文'}
          </Button>
        </div>
      </div>
    </div>
  );
}