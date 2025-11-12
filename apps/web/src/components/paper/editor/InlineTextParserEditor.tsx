'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BlockContent } from '@/types/paper';
import { Loader2, X, Check, RefreshCw } from 'lucide-react';
import { useEditingState } from '@/stores/useEditingState';
import { userPaperService, adminPaperService } from '@/lib/services/paper';

interface InlineTextParserEditorProps {
  sectionId: string;
  sectionTitle: string;
  context?: 'section' | 'block';
  blockId?: string;
  onParseText: (text: string, afterBlockId?: string, isStreaming?: boolean) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onCancel: () => void;
  paperId: string;
  userPaperId?: string | null;
  onParseComplete?: (blocks: any[], paperData?: any) => void; // 新增回调函数
}

export default function InlineTextParserEditor({
  sectionId,
  sectionTitle,
  context = 'section',
  blockId,
  onParseText,
  onCancel,
  paperId,
  userPaperId,
  onParseComplete,
}: InlineTextParserEditorProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamProgress, setStreamProgress] = useState<{ message: string; progress: number } | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isResumedSession, setIsResumedSession] = useState(false);
  const { setHasUnsavedChanges } = useEditingState();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setHasUnsavedChanges(text.trim().length > 0);
  }, [text, setHasUnsavedChanges]);

  // 组件挂载时检查是否有未完成的解析会话
  useEffect(() => {
    const checkActiveSessions = async () => {
      try {
        const isPersonalOwner = userPaperId !== null && userPaperId !== undefined;
        let sessions;
        
        if (isPersonalOwner) {
          sessions = await userPaperService.getParsingSessions(userPaperId!, sectionId);
        } else {
          sessions = await adminPaperService.getParsingSessions(paperId, sectionId);
        }
        
        // 查找进行中的会话
        const activeSession = sessions.data.sessions.find(
          (session: any) => session.status === 'processing' || session.status === 'pending'
        );
        
        if (activeSession) {
          setActiveSessionId(activeSession.sessionId);
          setHasActiveSession(true);
          setIsResumedSession(true);
        }
      } catch (error) {
        console.error('检查解析会话失败:', error);
      }
    };
    
    checkActiveSessions();
  }, [sectionId, paperId, userPaperId]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入要解析的文本内容');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStreamProgress(null);

    try {
      // 检查是否支持流式传输（通过检查onParseText函数的参数数量）
      const supportsStreaming = onParseText.length > 2;
      
      if (supportsStreaming) {
        // 使用流式传输
        const isPersonalOwner = userPaperId !== null && userPaperId !== undefined;
        
        // 关闭之前的EventSource
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        
        // 使用服务方法创建EventSource
        let eventSource: EventSource;
        if (isPersonalOwner) {
          eventSource = userPaperService.addBlockFromTextToSectionStream(
            userPaperId!,
            sectionId,
            {
              text: text.trim(),
              afterBlockId: context === 'block' ? blockId : undefined,
            }
          );
        } else {
          eventSource = adminPaperService.addBlockFromTextToSectionStream(
            paperId,
            sectionId,
            {
              text: text.trim(),
              afterBlockId: context === 'block' ? blockId : undefined,
            }
          );
        }
        
        eventSourceRef.current = eventSource;

        // 监听流式响应
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('收到流式响应:', data);
           
            if (data.type === 'progress') {
              // 更新进度显示
              setStreamProgress({
                message: data.message,
                progress: data.progress
              });
              console.log(`解析进度: ${data.progress}% - ${data.message}`);
              
              // 保存会话ID
              if (data.sessionId) {
                setActiveSessionId(data.sessionId);
                setHasActiveSession(true);
                // 新会话，不是恢复的会话
                setIsResumedSession(false);
              }
            } else if (data.type === 'complete') {
              // 解析完成
              console.log('解析完成:', data.blocks);
              setText('');
              setError(null);
              setHasUnsavedChanges(false);
              setStreamProgress(null);
              setHasActiveSession(false);
              setActiveSessionId(null);
              eventSource.close();
              eventSourceRef.current = null;
              
              // 调用回调函数，传递解析后的blocks和paper数据
              if (onParseComplete) {
                onParseComplete(data.blocks || [], data.paper);
              }
              
              // 关闭编辑器
              onCancel();
            } else if (data.type === 'error') {
              // 解析错误
              setError(data.message || '解析失败');
              setStreamProgress(null);
              setHasActiveSession(false);
              setActiveSessionId(null);
              eventSource.close();
              eventSourceRef.current = null;
            }
          } catch (e) {
            console.error('解析流式响应失败:', e);
            setError('解析响应失败');
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            eventSource.close();
            eventSourceRef.current = null;
          }
        };

        eventSource.onerror = (err) => {
          console.error('EventSource错误:', err);
          setError('流式连接失败');
          setIsLoading(false);
          setStreamProgress(null);
          setHasActiveSession(false);
          setActiveSessionId(null);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        };

        // 设置超时
        setTimeout(() => {
          if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
            setError('解析超时');
            setIsLoading(false);
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        }, 300000); // 5分钟超时
        
        // 立即关闭编辑器，让后端创建的loading block显示出来
        // 这样用户就能看到解析进度
        setTimeout(() => {
          if (!error) {
            onCancel();
          }
        }, 500); // 给一点时间让初始请求发出
        
      } else {
        // 使用传统方式
        const result = await onParseText(text.trim(), context === 'block' ? blockId : undefined);
        if (result.success) {
          setText('');
          setError(null);
          setHasUnsavedChanges(false);
          onCancel();
        } else {
          setError(result.error || '解析失败，请重试');
        }
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请重试');
      setIsLoading(false);
      setStreamProgress(null);
    }
  };

  const handleCancel = () => {
    // 关闭EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (!isLoading) {
      setText('');
      setError(null);
      setHasUnsavedChanges(false);
      setStreamProgress(null);
      setHasActiveSession(false);
      setActiveSessionId(null);
      onCancel();
    } else {
      // 即使在加载中，也允许取消
      setIsLoading(false);
      setStreamProgress(null);
      setHasActiveSession(false);
      setActiveSessionId(null);
      setText('');
      setError(null);
      setHasUnsavedChanges(false);
      onCancel();
    }
  };

  // 恢复会话
  const handleResumeSession = async () => {
    if (!activeSessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const isPersonalOwner = userPaperId !== null && userPaperId !== undefined;
      
      // 关闭之前的EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // 使用服务方法创建EventSource，传入会话ID
      let eventSource: EventSource;
      if (isPersonalOwner) {
        eventSource = userPaperService.addBlockFromTextToSectionStream(
          userPaperId!,
          sectionId,
          {
            sessionId: activeSessionId,
          }
        );
      } else {
        eventSource = adminPaperService.addBlockFromTextToSectionStream(
          paperId,
          sectionId,
          {
            sessionId: activeSessionId,
          }
        );
      }
      
      eventSourceRef.current = eventSource;

      // 监听流式响应
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
         
          if (data.type === 'progress') {
            // 更新进度显示
            setStreamProgress({
              message: data.message,
              progress: data.progress
            });
            console.log(`解析进度: ${data.progress}% - ${data.message}`);
          } else if (data.type === 'complete') {
            // 解析完成
            console.log('解析完成:', data.blocks);
            setText('');
            setError(null);
            setHasUnsavedChanges(false);
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            setIsResumedSession(false);
            eventSource.close();
            eventSourceRef.current = null;
            
            // 调用回调函数，传递解析后的blocks和paper数据
            if (onParseComplete) {
              onParseComplete(data.blocks || [], data.paper);
            }
            
            // 关闭编辑器
            onCancel();
          } else if (data.type === 'error') {
            // 解析错误
            setError(data.message || '解析失败');
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            setIsResumedSession(false);
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch (e) {
          console.error('解析流式响应失败:', e);
          setError('解析响应失败');
          setStreamProgress(null);
          setHasActiveSession(false);
          setActiveSessionId(null);
          setIsResumedSession(false);
          eventSource.close();
          eventSourceRef.current = null;
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource错误:', err);
        setError('流式连接失败');
        setIsLoading(false);
        setStreamProgress(null);
        setHasActiveSession(false);
        setActiveSessionId(null);
        setIsResumedSession(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };

      // 设置超时
      setTimeout(() => {
        if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
          setError('解析超时');
          setIsLoading(false);
          setStreamProgress(null);
          setHasActiveSession(false);
          setActiveSessionId(null);
          setIsResumedSession(false);
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }, 300000); // 5分钟超时
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复会话失败，请重试');
      setIsLoading(false);
      setStreamProgress(null);
    }
  };

  // 删除会话
  const handleDeleteSession = async () => {
    if (!activeSessionId) return;
    
    try {
      const isPersonalOwner = userPaperId !== null && userPaperId !== undefined;
      
      if (isPersonalOwner) {
        await userPaperService.deleteParsingSession(userPaperId!, sectionId, activeSessionId);
      } else {
        await adminPaperService.deleteParsingSession(paperId, sectionId, activeSessionId);
      }
      
      setHasActiveSession(false);
      setActiveSessionId(null);
      setIsResumedSession(false);
      setStreamProgress(null);
    } catch (err) {
      console.error('删除会话失败:', err);
      setError('删除会话失败，请重试');
    }
  };

  const getContextInfo = () => {
    if (context === 'block') {
      return {
        title: '在内容块下方解析添加',
        description: `将在当前内容块下方添加解析内容到章节: ${sectionTitle}`,
      };
    }
    return {
      title: '在章节中解析添加',
      description: `将在章节 "${sectionTitle}" 中添加解析内容`,
    };
  };

  const contextInfo = getContextInfo();

  // 如果有流式进度，显示进度条
  if (streamProgress) {
    return (
      <div className="mt-4 rounded-lg border-2 border-blue-500 bg-blue-50/50 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              {isResumedSession ? '恢复解析进度' : '文本解析进度'}
            </span>
            {hasActiveSession && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                会话已恢复
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={hasActiveSession ? handleDeleteSession : handleCancel}
              className="p-1.5 hover:bg-red-100 rounded text-red-600"
              title={hasActiveSession ? "删除会话" : "取消解析"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{streamProgress.message}</span>
            <span className="text-sm font-medium text-blue-600">{streamProgress.progress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${streamProgress.progress}%` }}
            ></div>
          </div>
          
          {hasActiveSession && (
            <div className="flex items-center justify-center pt-2">
              <button
                onClick={handleResumeSession}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isResumedSession ? '恢复中...' : '解析中...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    恢复解析
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border-2 border-blue-500 bg-blue-50/50 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
            文本解析编辑器
          </span>
          <span className="text-sm text-gray-600">
            {contextInfo.title}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50"
            title="取消"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {contextInfo.description}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文本内容
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="请输入要解析的文本内容...&#10;&#10;支持：&#10;• 自动识别标题、段落、列表等内容结构&#10;• 数学公式的LaTeX格式识别&#10;• 代码块的自动提取&#10;• 引用内容的智能处理"
            rows={12}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            支持：标题自动识别 • 数学公式解析 • 代码块提取 • 列表处理
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !text.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-20 justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  解析中...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  开始解析
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}