'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { userPaperService, adminPaperService } from '@/lib/services/paper';

interface ParsingProgressData {
<<<<<<< HEAD
  status: 'pending' | 'processing' | 'completed' | 'failed';
=======
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'pending_confirmation';
>>>>>>> origin/main
  progress: number;
  message: string;
  error?: string;
  paper?: any;
  sessionId?: string;
<<<<<<< HEAD
  blocks?: any[]; // ★ 添加blocks属性
  // 新增：GLM流式数据相关
  glmStream?: {
    content: string;
    model: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  // 新增：累积的GLM内容
  accumulatedContent?: string;
=======
  blocks?: any[];
  parseId?: string;
  tempBlockId?: string;
  parsedBlocks?: any[];
>>>>>>> origin/main
}

interface ParseProgressBlockProps {
  paperId: string;
  sectionId: string;
  blockId: string;
  sessionId?: string;
<<<<<<< HEAD
  onCompleted: (result: any) => void;
  isPersonalOwner?: boolean;
  userPaperId?: string | null;
  // 新增：接收外部进度数据的props
  initialProgress?: ParsingProgressData;
  externalProgress?: ParsingProgressData;
  // 新增：重新开始解析的回调
  onRestart?: () => void;
  // 新增：是否自动恢复会话连接
  autoResumeSession?: boolean;
=======
  parseId?: string;
  onCompleted: (result: any) => void;
  isPersonalOwner?: boolean;
  userPaperId?: string | null;
  initialProgress?: ParsingProgressData;
  externalProgress?: ParsingProgressData;
  onParsePreview?: (data: {
    type: 'preview' | 'cancel';
    blockId: string;
    parsedBlocks?: any[];
    sessionId?: string;
    parseId?: string;
  }) => void;
>>>>>>> origin/main
}

export default function ParseProgressBlock({
  paperId,
  sectionId,
  blockId,
  sessionId,
<<<<<<< HEAD
=======
  parseId,
>>>>>>> origin/main
  onCompleted,
  isPersonalOwner = false,
  userPaperId = null,
  initialProgress,
  externalProgress,
<<<<<<< HEAD
  onRestart,
  autoResumeSession = true, // 默认启用自动恢复
}: ParseProgressBlockProps) {
  // ★ 修复：简化状态管理，确保外部进度数据能正确显示
  const [progress, setProgress] = useState<ParsingProgressData>(() => {
    if (externalProgress) {
      console.log('🔄 初始化时收到外部进度:', externalProgress);
      return externalProgress;
    }
    
    if (initialProgress) {
      console.log('🔧 初始化时使用初始进度:', initialProgress);
      return initialProgress;
    }
    
=======
  onParsePreview,
}: ParseProgressBlockProps) {
  const [progress, setProgress] = useState<ParsingProgressData>(() => {
    if (externalProgress) return externalProgress;
    if (initialProgress) return initialProgress;
>>>>>>> origin/main
    return {
      status: 'pending',
      progress: 0,
      message: '准备开始解析...',
      sessionId,
<<<<<<< HEAD
    };
  });

  // 新增：状态用于管理GLM流式内容显示
  const [showGlmStream, setShowGlmStream] = useState(true); // 默认显示
  const [glmContent, setGlmContent] = useState('');

  // 用于管理EventSource连接的引用
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  
  // 新增：管理连接超时的引用
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataTimeRef = useRef<number>(Date.now());

  // ★ 新增：自动恢复会话连接
  useEffect(() => {
    // 只有在没有外部进度更新且启用自动恢复时才尝试恢复连接
    if (!externalProgress && autoResumeSession && sessionId && !eventSourceRef.current) {
      // 检查进度状态，如果是processing或pending状态，尝试恢复连接
      const shouldResume = progress.status === 'processing' || progress.status === 'pending';
      
      if (shouldResume) {
        console.log('🔄 ParseProgressBlock: 尝试恢复会话连接', { sessionId, status: progress.status });
        resumeSessionConnection(sessionId);
      }
    }
    
    // 清理函数
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [sessionId, progress.status, autoResumeSession, externalProgress]);

  // 恢复会话连接的函数
  const resumeSessionConnection = (sessionIdToResume: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setIsResuming(true);
    
    try {
      let eventSource: EventSource;
      
      if (isPersonalOwner && userPaperId) {
        eventSource = userPaperService.addBlockFromTextToSectionStream(
          userPaperId,
          sectionId,
          { sessionId: sessionIdToResume }
        );
      } else {
        eventSource = adminPaperService.addBlockFromTextToSectionStream(
          paperId,
          sectionId,
          { sessionId: sessionIdToResume }
        );
      }
      
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 ParseProgressBlock: 收到恢复的进度更新', data);
          
          // 更新最后接收数据时间
          lastDataTimeRef.current = Date.now();
          
          // 处理GLM流式数据
          if (data.type === 'glm_stream') {
            console.log('🔄 ParseProgressBlock: 收到GLM流式数据', data);
            setGlmContent(prev => prev + data.content);
            setProgress(prev => ({
              ...prev,
              glmStream: {
                content: data.content,
                model: data.model,
                usage: data.usage
              },
              accumulatedContent: (prev.accumulatedContent || '') + data.content
            }));
            // 重置超时计时器，因为正在接收流式数据
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              resetTimeout();
            }
            return;
          }
          
          // 处理进度更新
          if (data.type === 'status_update' && data.data) {
            const progressData = data.data;
            updateProgressFromStream(progressData);
            // 重置超时计时器
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              resetTimeout();
            }
          } else if (data.type === 'progress') {
            updateProgressFromStream(data);
            // 重置超时计时器
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              resetTimeout();
            }
          } else if (data.type === 'complete') {
            // 解析完成
            setProgress(prev => ({
              ...prev,
              status: 'completed',
              progress: 100,
              message: '解析完成'
            }));
           
            if (onCompleted) {
              onCompleted({
                status: 'completed',
                progress: 100,
                message: '解析完成',
                paper: data.paper,
                blocks: data.blocks || [],
                sessionId: sessionIdToResume,
              });
            }
           
            // 关闭连接
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          } else if (data.type === 'error' || (data.type === 'status_update' && data.data && data.data.status === 'failed')) {
            // 解析失败
            const errorMessage = data.message || data.data?.error || data.data?.message || '解析失败';
            setProgress(prev => ({
              ...prev,
              status: 'failed',
              message: errorMessage,
              error: errorMessage
            }));
           
            // 关闭连接
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          }
        } catch (e) {
          console.error('ParseProgressBlock: 解析恢复的流式响应失败:', e);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('ParseProgressBlock: EventSource错误:', err);
        setIsResuming(false);
        
        // 设置错误状态
        setProgress(prev => ({
          ...prev,
          status: 'failed',
          message: '连接失败，请重新开始解析',
          error: '无法恢复与解析服务的连接'
        }));
        
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
      
      // 设置动态超时机制
      const resetTimeout = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
            const timeSinceLastData = Date.now() - lastDataTimeRef.current;
            // 只有超过5分钟没有收到数据才认为超时
            if (timeSinceLastData > 300000) {
              console.warn('ParseProgressBlock: 连接超时，超过5分钟未收到数据');
              setIsResuming(false);
              
              if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
              }
            } else {
              // 如果最近有数据，重置超时
              resetTimeout();
            }
          }
        }, 300000); // 5分钟超时检查
      };
      
      // 初始设置超时
      resetTimeout();
      
    } catch (err) {
      console.error('ParseProgressBlock: 恢复会话连接失败:', err);
      setIsResuming(false);
      
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        message: '连接失败，请重新开始解析',
        error: '无法恢复与解析服务的连接'
      }));
    }
  };

  // 从流式更新中更新进度
  const updateProgressFromStream = (progressData: any) => {
    const normalizedStatus: 'pending' | 'processing' | 'completed' | 'failed' =
      progressData.status === 'parsing' || progressData.status === 'processing'
        ? 'processing'
        : progressData.status === 'completed'
        ? 'completed'
        : progressData.status === 'failed'
        ? 'failed'
        : 'pending';
    
    setProgress(prev => ({
      ...prev,
      status: normalizedStatus,
      progress: typeof progressData.progress === 'number' ? progressData.progress : prev.progress,
      message: progressData.message || prev.message,
      sessionId: progressData.sessionId || prev.sessionId
    }));
    
    setIsResuming(false);
  };

  // ★ 关键修复：外部进度优先级处理
  useEffect(() => {
    console.log('📊 ParseProgressBlock 外部进度更新:', {
      externalProgress,
      currentProgress: progress,
      sessionId,
      paperId,
      sectionId,
      blockId,
      hasExternalProgress: !!externalProgress
    });
    
    if (externalProgress) {
      console.log('🔄 更新进度状态:', {
        old: { status: progress.status, progress: progress.progress, message: progress.message },
        new: { status: externalProgress.status, progress: externalProgress.progress, message: externalProgress.message },
        sessionId: externalProgress.sessionId
      });
      
      setProgress(prev => {
        const newProgress = {
          ...prev,
          ...externalProgress,
          // 确保sessionId正确传递
          sessionId: externalProgress.sessionId || prev.sessionId
        };
        
        console.log('✅ 最终进度状态:', newProgress);
        return newProgress;
      });
      
      // 当外部进度完成或失败时，调用onCompleted
      if (externalProgress.status === 'completed') {
        console.log('✅ 解析完成（来自外部进度）');
        onCompleted({
          status: 'completed',
          progress: 100,
          message: '解析完成',
          paper: externalProgress.paper,
          blocks: externalProgress.blocks || [],
          sessionId: externalProgress.sessionId,
        });
      } else if (externalProgress.status === 'failed') {
        console.error('❌ 解析失败（来自外部进度）:', externalProgress.message);
      }
    }
  }, [externalProgress, onCompleted, sessionId, paperId, sectionId, blockId, progress.status, progress.progress, progress.message]);

  // 如果没有sessionId且没有外部进度，设置失败状态
  useEffect(() => {
    if (!sessionId && !externalProgress && !initialProgress) {
      console.warn('⚠️ ParseProgressBlock: 缺少会话ID和进度数据');
      setProgress({
        status: 'failed',
        progress: 0,
        message: '连接已断开，请重新开始解析',
        error: '会话ID丢失，可能是因为页面刷新导致的连接中断',
=======
      parseId,
    };
  });

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedRef = useRef(false);
  
  // 将blocksCount移到组件顶层,避免违反Hooks规则
  const [blocksCount, setBlocksCount] = useState<number>(0);

  const clearPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => () => clearPolling(), []);

  // 5s 轮询解析状态
  useEffect(() => {
    if (progress.status === 'completed' || progress.status === 'failed') {
      clearPolling();
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      if (cancelled) return;
      try {
        const result = isPersonalOwner && userPaperId
          ? await userPaperService.checkBlockParsingStatus(userPaperId, sectionId, blockId)
          : await adminPaperService.checkBlockParsingStatus(paperId, sectionId, blockId);

        if (cancelled) return;

        if (result.bizCode !== 0 || !result.data) {
          const message = result.bizMessage || result.topMessage || '解析状态获取失败';
          setProgress(prev => ({ ...prev, status: 'failed', message, error: message }));
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onCompleted({
              status: 'failed',
              message,
              error: message,
              blockId,
              sectionId,
              sessionId: sessionId || progress.sessionId || blockId,
            });
          }
          clearPolling();
          return;
        }

        const data = result.data;
        const normalizedStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'pending_confirmation' =
          data.status === 'processing'
            ? 'processing'
            : data.status === 'completed'
            ? 'completed'
            : data.status === 'failed'
            ? 'failed'
            : data.status === 'pending_confirmation'
            ? 'pending_confirmation'
            : 'pending';

        setProgress(prev => ({
          ...prev,
          status: normalizedStatus,
          progress: typeof data.progress === 'number' ? data.progress : prev.progress,
          message: data.message || prev.message,
          error: data.error,
          // 注意：当 addedBlocks 存在时，paper 字段不会返回，避免数据冗余
          paper: data.addedBlocks ? prev.paper : (data.paper ?? prev.paper),
          blocks: data.addedBlocks ?? prev.blocks,
          parsedBlocks: data.parsedBlocks ?? prev.parsedBlocks,
          sessionId: prev.sessionId || sessionId,
          parseId: data.parseId || prev.parseId || parseId, // 确保parseId被更新
        }));

        if (normalizedStatus === 'completed' || normalizedStatus === 'pending_confirmation') {
          clearPolling();
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            // 检查是否有已确认的blocks，如果有则不再显示parsing状态
            const hasConfirmedBlocks = data.addedBlocks && data.addedBlocks.length > 0;
            const shouldShowParsingBlock = !hasConfirmedBlocks;
            
            onCompleted({
              status: normalizedStatus,
              progress: 100,
              message: data.message || '解析完成',
              // 注意：当 addedBlocks 存在时，paper 字段不会返回，避免数据冗余
              paper: data.addedBlocks ? undefined : data.paper,
              blocks: data.addedBlocks || [],
              addedBlocks: data.addedBlocks || [],
              sessionId: sessionId || blockId,
              blockId,
              sectionId,
              parseId: data.parseId || parseId,
              tempBlockId: data.tempBlockId,
              // 新增字段，指示是否应继续显示parsing block
              shouldShowParsingBlock,
              parsedBlocks: data.parsedBlocks,
            });
            
            // 不再自动弹出对话框，等待用户点击"管理解析结果"按钮
          }
        } else if (normalizedStatus === 'failed') {
          clearPolling();
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onCompleted({
              status: 'failed',
              progress: 0,
              message: data.error || data.message || '解析失败',
              error: data.error || data.message,
              sessionId: sessionId || blockId,
              blockId,
              sectionId,
            });
          }
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '解析状态获取失败';
        setProgress(prev => ({ ...prev, status: 'failed', message, error: message }));
        clearPolling();
        if (!hasNotifiedRef.current) {
          hasNotifiedRef.current = true;
          onCompleted({
            status: 'failed',
            message,
            error: message,
            sessionId: sessionId || progress.sessionId || blockId,
            blockId,
            sectionId,
          });
        }
      }
    };

    fetchStatus();
    pollingTimerRef.current = setInterval(fetchStatus, 8000);

    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [paperId, sectionId, blockId, isPersonalOwner, userPaperId, progress.status, sessionId, onCompleted]);

  // 关键：外部进度优先
  useEffect(() => {
    if (externalProgress) {
      setProgress(prev => ({
        ...prev,
        ...externalProgress,
        sessionId: externalProgress.sessionId || prev.sessionId,
      }));
    }
  }, [externalProgress]);

  // 没有 sessionId 且没有初始/外部进度时，直接标记失败
  useEffect(() => {
    if (!sessionId && !externalProgress && !initialProgress) {
      setProgress({
        status: 'failed',
        progress: 0,
        message: '解析已中断，请重新开始',
        error: '缺少会话ID，可能是页面刷新导致',
>>>>>>> origin/main
      });
    }
  }, [sessionId, externalProgress, initialProgress]);

<<<<<<< HEAD
  useEffect(() => {
    console.log('🔍 ParseProgressBlock 组件状态:', {
      paperId,
      sectionId,
      blockId,
      sessionId,
      isPersonalOwner,
      userPaperId,
      hasExternalProgress: !!externalProgress,
      hasInitialProgress: !!initialProgress,
      currentProgress: progress,
    });
  }, [paperId, sectionId, blockId, sessionId, isPersonalOwner, userPaperId, externalProgress, initialProgress, progress]);

=======
>>>>>>> origin/main
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
<<<<<<< HEAD
=======
      case 'pending_confirmation':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
>>>>>>> origin/main
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

<<<<<<< HEAD
  const getStatusText = () => {
    switch (progress.status) {
      case 'pending':
        return '等待开始';
      case 'processing':
        return '解析中';
      case 'completed':
        return '解析完成';
      case 'failed':
        return '解析失败';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'pending':
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const containerClass =
    progress.status === 'failed'
=======
  const getStatusInfo = () => {
    switch (progress.status) {
      case 'pending':
      case 'processing':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
          message: progress.message || '正在解析...',
          color: 'blue',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          message: progress.message || '解析完成',
          color: 'green',
        };
      case 'pending_confirmation':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          message: progress.message || '解析完成，请确认',
          color: 'green',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          message: progress.message || '解析失败',
          color: 'red',
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
          message: progress.message || '未知状态',
          color: 'gray',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 移除pending_confirmation状态的特殊UI，统一使用completed状态的UI

  // 如果是完成状态且有parseId,获取解析结果
  useEffect(() => {
    const fetchParseResult = async () => {
      if (progress.status !== 'completed' || !progress.parseId) return;
      if (blocksCount > 0) return; // 已经有数据了
      
      // 如果已经有parsedBlocks数据,直接使用
      if (progress.parsedBlocks && progress.parsedBlocks.length > 0) {
        setBlocksCount(progress.parsedBlocks.length);
        return;
      }
      
      try {
        const service = isPersonalOwner && userPaperId ? userPaperService : adminPaperService;
        const result = await service.getParseResult(
          isPersonalOwner && userPaperId ? userPaperId : paperId,
          progress.parseId!
        );
        
        if (result.bizCode === 0 && result.data) {
          const parseData = result.data as any;
          // 处理blocks字段映射
          const blocks = parseData.parsedBlocks || parseData.blocks || [];
          setBlocksCount(blocks.length);
          
          // 更新progress中的parsedBlocks
          setProgress(prev => ({
            ...prev,
            parsedBlocks: blocks
          }));
        }
      } catch (error) {
        console.error('获取解析结果失败:', error);
      }
    };
    
    fetchParseResult();
  }, [progress.status, progress.parseId, progress.parsedBlocks, blocksCount, isPersonalOwner, userPaperId, paperId]);

  // 如果是完成状态且有parseId，显示解析结果管理器按钮
  if (progress.status === 'completed' && progress.parseId) {
    return (
      <div className="my-4 rounded-lg border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              解析完成
            </h3>
            <p className="text-sm text-green-700 mb-4">
              文本解析已完成，共解析出 {blocksCount} 个段落。请点击下方按钮预览结果并选择要保留的内容。
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('点击管理解析结果按钮', {
                    blockId,
                    sessionId: progress.sessionId,
                    parseId: progress.parseId,
                    hasCallback: !!onParsePreview
                  });
                  if (onParsePreview) {
                    // 不传递 parsedBlocks，让父组件打开 ParseResultsManager
                    onParsePreview({
                      type: 'preview',
                      blockId,
                      sessionId: progress.sessionId,
                      parseId: progress.parseId,
                    });
                  } else {
                    console.error('onParsePreview 回调未定义');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                管理解析结果
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('点击取消解析按钮', {
                    blockId,
                    parseId: progress.parseId,
                    hasCallback: !!onParsePreview
                  });
                  if (onParsePreview) {
                    onParsePreview({
                      type: 'cancel',
                      blockId,
                      parseId: progress.parseId,
                    });
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消解析
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const containerClass =
    statusInfo.color === 'red'
>>>>>>> origin/main
      ? 'my-4 rounded-lg border border-red-200 bg-red-50 p-4'
      : 'my-4 rounded-lg border border-blue-200 bg-blue-50 p-4';

  return (
    <div className={containerClass}>
<<<<<<< HEAD
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-gray-900">文本解析进度</h3>
          {isResuming && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              正在恢复连接...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 显示实际解析状态 */}
          <div className={`flex items-center gap-1 text-xs ${
            progress.status === 'processing' ? 'text-blue-600' :
            progress.status === 'completed' ? 'text-green-600' :
            progress.status === 'failed' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              progress.status === 'processing' ? 'bg-blue-500 animate-pulse' :
              progress.status === 'completed' ? 'bg-green-500' :
              progress.status === 'failed' ? 'bg-red-500' :
              'bg-gray-300'
            }`} />
            {getStatusText()}
          </div>
          {sessionId && (
            <div className="text-xs text-gray-500">
              会话ID: {sessionId.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div>
          <p className={`font-medium ${getStatusColor()}`}>{getStatusText()}</p>
          <p className="text-sm text-gray-600">{progress.message}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">进度</span>
          <span className="text-gray-600">{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress.status === 'failed'
                ? 'bg-red-500'
                : progress.status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* 新增：GLM流式内容显示区域 */}
      {progress.status === 'processing' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">实时解析内容</div>
              {progress.glmStream && (
                <>
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">
                    正在接收数据...
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    模型: {progress.glmStream.model}
                  </div>
                  {progress.glmStream.usage && (
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Tokens: {progress.glmStream.usage.total_tokens || 'N/A'}
                    </div>
                  )}
                </>
              )}
            </div>
            {(progress.glmStream || progress.accumulatedContent || glmContent) && (
              <button
                onClick={() => setShowGlmStream(!showGlmStream)}
                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
              >
                {showGlmStream ? '隐藏内容' : '显示内容'}
              </button>
            )}
          </div>
          
          {/* 显示解析进度详情 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
            <div className="text-sm text-blue-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">当前状态</span>
              </div>
              <div className="ml-4 text-blue-600">
                {progress.message}
              </div>
            </div>
          </div>
          
          {/* 显示GLM流式内容 - 默认展开 */}
          {(showGlmStream && (progress.glmStream || progress.accumulatedContent || glmContent)) && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-2 font-mono">
                实时解析内容 ({(glmContent || progress.accumulatedContent || '').length} 字符):
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-2 rounded border">
                {glmContent || progress.accumulatedContent || ''}
                {/* 添加闪烁光标效果表示正在输入 */}
                <span className="animate-pulse text-blue-500">|</span>
              </div>
            </div>
          )}
        </div>
      )}

      {progress.status === 'failed' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-600">
            <strong>错误详情:</strong> {progress.error || '解析失败，请重试'}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 mb-4">
        {progress.status === 'failed' && (
          <div className="flex gap-2">
            {/* 如果有重新开始回调，显示重新开始按钮 */}
            {onRestart && (
              <button
                onClick={onRestart}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700"
              >
                重新开始解析
              </button>
            )}
            <button
              onClick={() => {
                const errorInfo = `错误信息: ${progress.message}\n错误详情: ${
                  progress.error || '无'
                }\n时间: ${new Date().toLocaleString()}\n会话ID: ${sessionId}\n论文ID: ${paperId}\n章节ID: ${sectionId}`;
                navigator.clipboard
                  .writeText(errorInfo)
                  .then(() => {
                    const originalText = progress.message;
                    setProgress((prev) => ({
                      ...prev,
                      message: '错误信息已复制到剪贴板',
                    }));
                    setTimeout(() => {
                      setProgress((prev) => ({
                        ...prev,
                        message: originalText,
                      }));
                    }, 2000);
                  })
                  .catch((err) => {
                    console.error('复制失败:', err);
                  });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
            >
              复制错误信息
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              progress.progress >= 10
                ? 'bg-green-500'
                : progress.progress >= 5
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
          <span>准备解析</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              progress.progress >= 30
                ? 'bg-green-500'
                : progress.progress >= 10
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
          <span>解析文本内容</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              progress.progress >= 60
                ? 'bg-green-500'
                : progress.progress >= 30
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
          <span>翻译和结构化</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              progress.progress >= 85
                ? 'bg-green-500'
                : progress.progress >= 60
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
          <span>验证和保存</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              progress.progress >= 95
                ? 'bg-green-500'
                : progress.progress >= 85
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
          <span>格式验证</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              progress.progress >= 100
                ? 'bg-green-500'
                : progress.progress >= 95
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
          <span>完成</span>
=======
      <div className="flex items-center gap-3">
        {statusInfo.icon}
        <div>
          <p className={`font-medium ${
            statusInfo.color === 'blue' ? 'text-blue-600' :
            statusInfo.color === 'green' ? 'text-green-600' :
            statusInfo.color === 'red' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {statusInfo.message}
          </p>
          {progress.error && <p className="text-xs text-red-500 mt-1">{progress.error}</p>}
>>>>>>> origin/main
        </div>
      </div>
    </div>
  );
}
