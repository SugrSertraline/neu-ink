'use client';

import React from 'react';
import { X, FileText, Loader2, Sparkles, AlertCircle, Upload, File, Trash2, Eye, User, Calendar, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPaperFromMarkdown } from '@/app/lib/paperApi';

interface MarkdownPaperDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (paperId?: string) => void;
}

export default function MarkdownPaperDialog({ 
  open, 
  onClose, 
  onSuccess 
}: MarkdownPaperDialogProps) {
  const [markdownFile, setMarkdownFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [markdownContent, setMarkdownContent] = React.useState<string>('');
  const [parsedInfo, setParsedInfo] = React.useState<{
    title?: string;
    authors?: string[];
    abstract?: string;
    keywords?: string[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setMarkdownFile(null);
      setError(null);
      setSuccess(null);
      setIsDragging(false);
      setMarkdownContent('');
      setParsedInfo(null);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const parseMarkdownContent = (content: string) => {
    const lines = content.split('\n');
    const info: {
      title?: string;
      authors?: string[];
      abstract?: string;
      keywords?: string[];
    } = {};

    // 解析标题 (第一个 # 标题)
    for (const line of lines) {
      const titleMatch = line.match(/^#\s+(.+)$/);
      if (titleMatch) {
        info.title = titleMatch[1].trim();
        break;
      }
    }

    // 解析作者 (寻找 Author、Authors、作者等关键词)
    const authorPatterns = [
      /^(?:Author|Authors|作者)[:：]\s*(.+)$/i,
      /^(?:By|by)[:：]?\s*(.+)$/i,
    ];
    
    for (const line of lines) {
      for (const pattern of authorPatterns) {
        const match = line.match(pattern);
        if (match) {
          const authorsText = match[1].trim();
          // 分割作者，支持逗号、分号、and等分隔符
          info.authors = authorsText
            .split(/[,;]|\sand\s/i)
            .map(author => author.trim())
            .filter(author => author.length > 0);
          break;
        }
      }
      if (info.authors) break;
    }

    // 解析摘要 (寻找 Abstract、摘要等关键词后的内容)
    const abstractPatterns = [
      /^(?:Abstract|摘要)[:：]?\s*(.*)$/i,
      /^##\s*(?:Abstract|摘要)\s*$/i,
    ];
    
    let abstractStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of abstractPatterns) {
        if (pattern.test(line)) {
          const match = line.match(/^(?:Abstract|摘要)[:：]?\s*(.*)$/i);
          if (match && match[1].trim()) {
            info.abstract = match[1].trim();
          } else {
            abstractStartIndex = i + 1;
          }
          break;
        }
      }
      if (info.abstract || abstractStartIndex !== -1) break;
    }

    // 如果找到了摘要开始位置，继续读取后续行直到遇到下一个标题或空行
    if (abstractStartIndex !== -1 && !info.abstract) {
      const abstractLines = [];
      for (let i = abstractStartIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#') || line.startsWith('##')) break;
        abstractLines.push(line);
      }
      if (abstractLines.length > 0) {
        info.abstract = abstractLines.join(' ').substring(0, 200) + '...';
      }
    }

    // 解析关键词
    const keywordPatterns = [
      /^(?:Keywords|关键词|关键字)[:：]\s*(.+)$/i,
    ];
    
    for (const line of lines) {
      for (const pattern of keywordPatterns) {
        const match = line.match(pattern);
        if (match) {
          const keywordsText = match[1].trim();
          info.keywords = keywordsText
            .split(/[,;，；]/)
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0);
          break;
        }
      }
      if (info.keywords) break;
    }

    return info;
  };

  const validateAndSetFile = async (file: File | undefined) => {
    if (!file) return;

    // 验证文件类型
    const validExtensions = ['.md', '.markdown'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setError('只支持 .md 或 .markdown 格式的文件');
      setMarkdownFile(null);
      return;
    }

    // 验证文件大小（最大 50MB）
    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过 50MB');
      setMarkdownFile(null);
      return;
    }

    setMarkdownFile(file);
    setError(null);

    // 读取文件内容并解析
    try {
      const content = await file.text();
      setMarkdownContent(content);
      const parsed = parseMarkdownContent(content);
      setParsedInfo(parsed);
    } catch (err) {
      console.error('读取文件失败:', err);
      setError('读取文件失败');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const removeFile = () => {
    setMarkdownFile(null);
    setError(null);
    setMarkdownContent('');
    setParsedInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!markdownFile) {
      setError('请选择 Markdown 文件');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 调用后端API解析Markdown并创建论文
      const result = await createPaperFromMarkdown(markdownFile);
      
      const paperId = result?.data?.id;
      
      // 显示成功消息
      if (result?.success && paperId) {
        console.log('✅ 论文创建成功，正在解析中:', result.data);
        let successMsg = `✅ 论文创建成功！\n📖 标题: ${result.data.title}\n🔄 正在后台解析中，请稍候...`;
        setSuccess(successMsg);
        
        // 延迟关闭对话框，让用户看到成功信息
        setTimeout(() => {
          setMarkdownFile(null);
          onSuccess(paperId);
          onClose();
        }, 2000);
      } else {
        throw new Error(result?.message || '创建论文失败');
      }
    } catch (err: any) {
      console.error('从 Markdown 创建论文失败:', err);
      setError(err.message || '创建论文失败，请检查 Markdown 格式或后端服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">从 Markdown 创建论文</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            disabled={loading}
            className="hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-r-lg text-sm flex items-start gap-3">
              <span className="text-red-500 text-xl">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 rounded-r-lg text-sm flex items-start gap-3">
              <span className="text-green-500 text-xl">✅</span>
              <pre className="whitespace-pre-wrap font-sans">{success}</pre>
            </div>
          )}

          {/* 提示信息 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">💡 上传 Markdown 文件创建论文</p>
                <p className="text-blue-600 dark:text-blue-400">
                  支持上传标准的 Markdown 格式文件，系统会自动解析内容并创建论文记录。解析过程在后台异步进行。
                </p>
              </div>
            </div>
          </div>

      

          {/* 文件上传区 */}
          <div className="space-y-3">
            {!markdownFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 transition-all ${
                  isDragging
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-600'
                }`}
              >
                <div className="text-center">
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${
                    isDragging ? 'text-green-600' : 'text-slate-400'
                  }`} />
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    拖拽 Markdown 文件到此处，或
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500"
                  >
                    <FileText className="w-4 h-4 mr-2 text-green-600" />
                    选择文件
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                    支持格式：.md, .markdown | 最大 50MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {markdownFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {(markdownFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    disabled={loading}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 解析预览区域 */}
            {markdownFile && parsedInfo && (
              <div className="mt-6 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">解析预览</h3>
                </div>
                
                <div className="space-y-4">
                  {parsedInfo.title && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">标题</span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 p-3 rounded border">
                        {parsedInfo.title}
                      </p>
                    </div>
                  )}

                  {parsedInfo.authors && parsedInfo.authors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">作者</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {parsedInfo.authors.map((author, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {author}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedInfo.abstract && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">摘要</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 p-3 rounded border">
                        {parsedInfo.abstract}
                      </p>
                    </div>
                  )}

                  {parsedInfo.keywords && parsedInfo.keywords.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">关键词</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {parsedInfo.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!parsedInfo.title && !parsedInfo.authors && !parsedInfo.abstract && !parsedInfo.keywords && (
                    <div className="text-center py-4">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        未能解析出标准信息，但仍可以上传文件创建论文
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t dark:bg-slate-800">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="h-11 px-6 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !markdownFile} 
            className="h-11 px-6 min-w-[140px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                解析并创建
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}