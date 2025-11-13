// src/components/paper/editor/InlineTextParserEditor.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { BlockContent, LoadingBlock } from '@/types/paper';
import { Loader2, X, Check, RefreshCw } from 'lucide-react';
import { useEditingState } from '@/stores/useEditingState';
import { userPaperService, adminPaperService } from '@/lib/services/paper';
import ParseProgressBlock from '@/components/paper/ParseProgressBlock';

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
  onProgressUpdate?: (progressData: { message: string; progress: number; sessionId?: string }) => void; // 进度更新回调
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
  onProgressUpdate,
}: InlineTextParserEditorProps) {
  const [text, setText] = useState('');
  const [insertedProgressBlock, setInsertedProgressBlock] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamProgress, setStreamProgress] = useState<{ message: string; progress: number } | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isResumedSession, setIsResumedSession] = useState(false);
  const { setHasUnsavedChanges } = useEditingState();
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasTempProgressBlockRef = useRef(false);

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
          
          // 立即尝试恢复连接，以便获取最新进度
          console.log('🔄 InlineTextParserEditor: 检测到未完成会话，准备恢复连接', activeSession.sessionId);
          
          // 延迟一点时间再恢复连接，确保组件已完全挂载
          setTimeout(() => {
            handleResumeSession();
          }, 100);
        }
      } catch (error) {
        console.error('检查解析会话失败:', error);
      }
    };

    checkActiveSessions();
  }, [sectionId, paperId, userPaperId]);

  const tryInsertTempProgressBlock = (sessionId: string, progress?: number, message?: string) => {
    // ★ 防止在同一次解析会话中重复插入 loading block
    if (insertedProgressBlock) {
      console.log('[InlineTextParserEditor] 已插入临时进度块，跳过重复插入', {
        sessionId,
        sectionId,
        blockId,
      });
      return;
    }
    if (!onParseComplete) return;

    console.log('创建临时进度块:', { sessionId, progress, message, sectionId, blockId });

    const tempLoadingBlock: LoadingBlock = {
      id: `loading-${sessionId}`,
      type: 'loading',
      status: 'processing',
      message: message || '已连接到解析服务...',
      progress: typeof progress === 'number' ? progress : 5,
      // 方便 ParseProgressBlock 使用这些信息
      sectionId,
      afterBlockId: context === 'block' ? blockId : undefined,
      sessionId,
      originalText: text,         // 保存原始文本
      createdAt: new Date().toISOString(),
    };

    console.log('调用 onParseComplete 插入进度块:', tempLoadingBlock);
    onParseComplete([tempLoadingBlock]);
    setInsertedProgressBlock(true);

    // 立即通知父组件进度更新，确保sessionId传递
    if (onProgressUpdate) {
      onProgressUpdate({
        message: message || '已连接到解析服务...',
        progress: typeof progress === 'number' ? progress : 5,
        sessionId,
      });
    }
  };


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

            // 处理后端的status_update格式
            if (data.type === 'status_update' && data.data) {
              const progressData = data.data;
              // 更新进度显示
              setStreamProgress({
                message: progressData.message,
                progress: progressData.progress
              });
              console.log(`解析进度: ${progressData.progress}% - ${progressData.message}`);

              // 通知父组件进度更新
              if (onProgressUpdate) {
                console.log('InlineTextParserEditor: 发送进度更新', {
                  message: progressData.message,
                  progress: progressData.progress,
                  sessionId: progressData.sessionId
                });
                onProgressUpdate({
                  message: progressData.message,
                  progress: progressData.progress,
                  sessionId: progressData.sessionId
                });
              }

              // 保存会话ID & 首次插入临时进度块
              if (progressData.sessionId) {
                setActiveSessionId(progressData.sessionId);
                setHasActiveSession(true);
                setIsResumedSession(false);
                // 首次拿到 sessionId 时插入"临时进度块"
                tryInsertTempProgressBlock(progressData.sessionId, progressData.progress, progressData.message);
              }
            } else if (data.type === 'progress') {
              // 兼容旧格式（如果后端有的话）
              // 更新进度显示
              setStreamProgress({
                message: data.message,
                progress: data.progress
              });
              console.log(`解析进度: ${data.progress}% - ${data.message}`);

              // 通知父组件进度更新
              if (onProgressUpdate) {
                console.log('InlineTextParserEditor: 发送进度更新', {
                  message: data.message,
                  progress: data.progress,
                  sessionId: data.sessionId
                });
                onProgressUpdate({
                  message: data.message,
                  progress: data.progress,
                  sessionId: data.sessionId
                });
              }

              // 保存会话ID & 首次插入临时进度块
              if (data.sessionId) {
                setActiveSessionId(data.sessionId);
                setHasActiveSession(true);
                setIsResumedSession(false);
                // 首次拿到 sessionId 时插入"临时进度块"
                tryInsertTempProgressBlock(data.sessionId, data.progress, data.message);
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
              // ★ 关键：本次解析结束，允许下一次重新插入 loading block
              setInsertedProgressBlock(false);

              eventSource.close();
              eventSourceRef.current = null;

              // 调用回调函数，传递解析后的blocks和paper数据
              if (onParseComplete) {
                onParseComplete(data.blocks || [], data.paper);
              }

              // 关闭编辑器
              onCancel();
            }
            else if (data.type === 'error') {
              // 解析错误
              setError(data.message || '解析失败');
              setStreamProgress(null);
              setHasActiveSession(false);
              setActiveSessionId(null);
              eventSource.close();
              eventSourceRef.current = null;
            } else if (data.type === 'status_update' && data.data && data.data.status === 'failed') {
              // 处理后端的失败状态
              setError(data.data.error || data.data.message || '解析失败');
              setStreamProgress(null);
              setHasActiveSession(false);
              setActiveSessionId(null);
              eventSource.close();
              eventSourceRef.current = null;
            }
          } catch (e) {
            console.error('解析流式响应失败:', e);
            // 如果是JSON解析错误，可能是会话正常结束
            if (e instanceof SyntaxError && e.message.includes('JSON')) {
              console.log('🔚 可能是会话正常结束');
              setText('');
              setError(null);
              setHasUnsavedChanges(false);
              setStreamProgress(null);
              setHasActiveSession(false);
              setActiveSessionId(null);
              eventSource.close();
              eventSourceRef.current = null;

              // 调用回调函数
              if (onParseComplete) {
                onParseComplete([], null);
              }

              // 关闭编辑器
              onCancel();
            } else {
              setError('解析响应失败');
              setStreamProgress(null);
              setHasActiveSession(false);
              setActiveSessionId(null);
              eventSource.close();
              eventSourceRef.current = null;
            }
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

    // ★ 取消解析时，同样需要清除已插入进度块的标记
    setInsertedProgressBlock(false);

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

          // 处理后端的status_update格式
          if (data.type === 'status_update' && data.data) {
            const progressData = data.data;
            // 更新进度显示
            setStreamProgress({
              message: progressData.message,
              progress: progressData.progress
            });
            console.log(`解析进度: ${progressData.progress}% - ${progressData.message}`);

            // 恢复时如果还没插入过，补插一个临时进度块
            if (activeSessionId && !insertedProgressBlock) {
              tryInsertTempProgressBlock(activeSessionId, progressData.progress, progressData.message);
            }

            // 恢复时也要通知父组件进度更新
            if (onProgressUpdate && progressData.sessionId) {
              console.log('InlineTextParserEditor: 恢复会话时发送进度更新', {
                message: progressData.message,
                progress: progressData.progress,
                sessionId: progressData.sessionId
              });
              onProgressUpdate({
                message: progressData.message,
                progress: progressData.progress,
                sessionId: progressData.sessionId,
              });
            }
          } else if (data.type === 'progress') {
            // 兼容旧格式（如果后端有的话）
            // 更新进度显示
            setStreamProgress({
              message: data.message,
              progress: data.progress
            });
            console.log(`解析进度: ${data.progress}% - ${data.message}`);

            // 恢复时如果还没插入过，补插一个临时进度块
            if (activeSessionId && !insertedProgressBlock) {
              tryInsertTempProgressBlock(activeSessionId, data.progress, data.message);
            }

            // 恢复时也要通知父组件进度更新
            if (onProgressUpdate && data.sessionId) {
              console.log('InlineTextParserEditor: 恢复会话时发送进度更新', {
                message: data.message,
                progress: data.progress,
                sessionId: data.sessionId
              });
              onProgressUpdate({
                message: data.message,
                progress: data.progress,
                sessionId: data.sessionId,
              });
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
          } else if (data.type === 'status_update' && data.data && data.data.status === 'failed') {
            // 处理后端的失败状态
            setError(data.data.error || data.data.message || '解析失败');
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            setIsResumedSession(false);
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch (e) {
          console.error('解析流式响应失败:', e);
          // 如果是JSON解析错误，可能是会话正常结束
          if (e instanceof SyntaxError && e.message.includes('JSON')) {
            console.log('🔚 可能是会话正常结束');
            setText('');
            setError(null);
            setHasUnsavedChanges(false);
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            setIsResumedSession(false);
            eventSource.close();
            eventSourceRef.current = null;

            // 调用回调函数
            if (onParseComplete) {
              onParseComplete([], null);
            }

            // 关闭编辑器
            onCancel();
          } else {
            setError('解析响应失败');
            setStreamProgress(null);
            setHasActiveSession(false);
            setActiveSessionId(null);
            setIsResumedSession(false);
            eventSource.close();
            eventSourceRef.current = null;
          }
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

  // 如果有流式进度，显示进度条组件
  if (streamProgress && !insertedProgressBlock) {
    return (
      <div className="mt-4 rounded-lg border-2 border-blue-500 bg-blue-50/50 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              文本解析进度
            </span>
          </div>
        </div>

        {/* 使用外部进度数据直接显示进度，不创建额外的ParseProgressBlock */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">解析进度</span>
              <span className="text-gray-600">{streamProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${streamProgress.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-700">{streamProgress.message}</span>
          </div>

          {activeSessionId && (
            <div className="text-xs text-gray-500">
              会话ID: {activeSessionId.substring(0, 8)}...
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-center mt-4 gap-2">
          {hasActiveSession && (
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
          )}

          <button
            onClick={hasActiveSession ? handleDeleteSession : handleCancel}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            {hasActiveSession ? "删除会话" : "取消解析"}
          </button>
        </div>
      </div>
    );
  }
 if (streamProgress && insertedProgressBlock) {
    return null;
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